package com.monitor.web.controller.monitor;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitor.framework.security.service.TokenService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MonitorModuleIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @TestConfiguration
  static class TestBeans {

    @Bean
    @Primary
    TokenService testTokenService() {
      return new TokenService(new RedisTemplate<>(), "0123456789abcdef0123456789abcdef0123456789abcdef");
    }
  }

  private Map<String, Object> basePayload(String url, String title, String deviceId, String sessionId, String pageId) {
    Map<String, Object> base = new LinkedHashMap<>();
    base.put("appName", "frontend-monitor-demo");
    base.put("appVersion", "0.1.0");
    base.put("deviceId", deviceId);
    base.put("sessionId", sessionId);
    base.put("pageId", pageId);
    base.put("url", url);
    base.put("title", title);
    base.put("userAgent", "JUnit");
    base.put("sdkVersion", "0.1.0");
    base.put("timestamp", System.currentTimeMillis());
    base.put("viewport", Map.of("width", 1280, "height", 720));
    return base;
  }

  @Test
  void shouldCollectEventsWithAnonymousPost() throws Exception {
    Map<String, Object> payload = Map.of(
        "base", basePayload("http://localhost:4173/demo", "Demo", "device-1", "session-1", "page-1"),
        "events", List.of(
            Map.of(
                "type", "page_view",
                "from", "",
                "to", "/demo",
                "trigger", "load",
                "timestamp", System.currentTimeMillis(),
                "url", "http://localhost:4173/demo"
            ),
            Map.of(
                "type", "request_error",
                "method", "GET",
                "status", 404,
                "duration", 120,
                "errorMessage", "Not Found",
                "transport", "fetch",
                "timestamp", System.currentTimeMillis(),
                "url", "/api/not-found"
            )
        )
    );

    mockMvc.perform(post("/api/v1/monitor/collect/demo-project-key")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.received").value(2));

    mockMvc.perform(get("/api/v1/monitor/events")
            .param("projectId", "1")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total", greaterThanOrEqualTo(2)));
  }

  @Test
  void shouldRejectCollectForUnknownProjectKey() throws Exception {
    Map<String, Object> payload = Map.of(
        "base", basePayload("http://localhost/demo", "Demo", "device-1", "session-1", "page-1"),
        "events", List.of(
            Map.of(
                "type", "custom",
                "eventName", "demo",
                "timestamp", System.currentTimeMillis(),
                "url", "http://localhost/demo"
            )
        )
    );

    mockMvc.perform(post("/api/v1/monitor/collect/not-exists")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isNotFound());
  }

  @Test
  void shouldReturnGifForImageCollect() throws Exception {
    String data = objectMapper.writeValueAsString(Map.of(
        "base", basePayload("http://localhost/demo-image", "Demo Image", "device-2", "session-2", "page-2"),
        "events", List.of(
            Map.of(
                "type", "custom",
                "eventName", "imageBeacon",
                "timestamp", System.currentTimeMillis(),
                "url", "http://localhost/demo-image"
            )
        )
    ));

    mockMvc.perform(get("/api/v1/monitor/collect/demo-project-key")
            .param("data", data))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.IMAGE_GIF));
  }

  @Test
  void shouldRequireAuthenticationForAdminEventApis() throws Exception {
    mockMvc.perform(get("/api/v1/monitor/events"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(username = "admin")
  void shouldListProjectsWithAuthentication() throws Exception {
    mockMvc.perform(get("/api/v1/monitor/projects"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total", greaterThanOrEqualTo(1)))
        .andExpect(jsonPath("$.rows[0].projectKey").exists());
  }
}
