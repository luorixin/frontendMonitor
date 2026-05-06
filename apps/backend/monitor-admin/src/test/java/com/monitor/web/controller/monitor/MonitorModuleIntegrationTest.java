package com.monitor.web.controller.monitor;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

@SpringBootTest(properties = {
    "app.monitor.collect.max-events-per-request=2",
    "app.monitor.collect.max-payload-bytes=10000",
    "app.monitor.collect.max-image-data-bytes=300",
    "app.monitor.collect.rate-limit-per-minute=1000"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MonitorModuleIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private JdbcTemplate jdbcTemplate;

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
  void shouldReturnWebVitalsTrend() throws Exception {
    long now = System.currentTimeMillis();
    Map<String, Object> payload = Map.of(
        "base", basePayload("http://localhost:4173/perf", "Perf", "device-wv", "session-wv", "page-wv"),
        "events", List.of(
            Map.of(
                "type", "performance",
                "performanceType", "navigation",
                "metrics", Map.of(
                    "firstContentfulPaint", 1200,
                    "ttfb", 340
                ),
                "timestamp", now,
                "url", "http://localhost:4173/perf"
            ),
            Map.of(
                "type", "performance",
                "performanceType", "web_vital",
                "metricName", "LCP",
                "value", 2200,
                "rating", "good",
                "softNavigation", true,
                "timestamp", now,
                "url", "http://localhost:4173/perf"
            )
        )
    );

    mockMvc.perform(post("/api/v1/monitor/collect/demo-project-key")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.received").value(2));

    mockMvc.perform(get("/api/v1/monitor/dashboard/web-vitals-trend")
            .param("projectId", "1")
            .param("granularity", "hour")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[?(@.metricName=='FCP' && @.navigationMode=='hard')]").isNotEmpty())
        .andExpect(jsonPath("$.data[?(@.metricName=='TTFB' && @.navigationMode=='hard')]").isNotEmpty())
        .andExpect(jsonPath("$.data[?(@.metricName=='LCP' && @.navigationMode=='soft')]").isNotEmpty());
  }

  @Test
  void shouldReturnRequestPerformanceInsights() throws Exception {
    long now = System.currentTimeMillis();
    Map<String, Object> payload = Map.of(
        "base", basePayload("http://localhost:4173/network", "Network", "device-rp", "session-rp", "page-rp"),
        "events", List.of(
            Map.of(
                "type", "request_performance",
                "method", "GET",
                "status", 200,
                "duration", 180,
                "transport", "fetch",
                "timestamp", now,
                "url", "/api/projects"
            ),
            Map.of(
                "type", "request_performance",
                "method", "GET",
                "status", 503,
                "duration", 620,
                "transport", "fetch",
                "timestamp", now,
                "url", "/api/projects"
            )
        )
    );

    mockMvc.perform(post("/api/v1/monitor/collect/demo-project-key")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.received").value(2));

    mockMvc.perform(get("/api/v1/monitor/dashboard/request-performance-trend")
            .param("projectId", "1")
            .param("granularity", "hour")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].sampleCount").value(greaterThanOrEqualTo(2)))
        .andExpect(jsonPath("$.data[0].errorCount").value(greaterThanOrEqualTo(1)));

    mockMvc.perform(get("/api/v1/monitor/dashboard/slow-requests")
            .param("projectId", "1")
            .param("granularity", "hour")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].url").value("/api/projects"))
        .andExpect(jsonPath("$.data[0].errorCount").value(greaterThanOrEqualTo(1)));
  }

  @Test
  void shouldInitializeSchemaThroughFlywayMigrations() {
    Integer appliedMigrations = jdbcTemplate.queryForObject(
        "select count(*) from flyway_schema_history where success = true",
        Integer.class
    );
    Integer seededProjects = jdbcTemplate.queryForObject(
        "select count(*) from monitor_project where project_key = 'demo-project-key'",
        Integer.class
    );

    org.junit.jupiter.api.Assertions.assertNotNull(appliedMigrations);
    org.junit.jupiter.api.Assertions.assertTrue(appliedMigrations >= 4);
    org.junit.jupiter.api.Assertions.assertEquals(1, seededProjects);
  }

  @Test
  void shouldCollectReplayChunksAndLinkReplayToEvents() throws Exception {
    String replayId = "replay-001";
    Map<String, Object> replayPayload = new LinkedHashMap<>();
    replayPayload.put("appName", "frontend-monitor-demo");
    replayPayload.put("appVersion", "0.1.0");
    replayPayload.put("deviceId", "device-r1");
    replayPayload.put("sessionId", "session-r1");
    replayPayload.put("pageId", "page-r1");
    replayPayload.put("replayId", replayId);
    replayPayload.put("url", "http://localhost:4173/replay");
    replayPayload.put("title", "Replay");
    replayPayload.put("sdkVersion", "0.2.0");
    replayPayload.put("release", "1.2.3");
    replayPayload.put("environment", "production");
    replayPayload.put("sequence", 0);
    replayPayload.put("startedAt", System.currentTimeMillis() - 1000);
    replayPayload.put("endedAt", System.currentTimeMillis());
    replayPayload.put(
        "events",
        List.of(Map.of("type", 4, "timestamp", System.currentTimeMillis(), "data", Map.of("href", "http://localhost:4173/replay")))
    );

    mockMvc.perform(post("/api/v1/monitor/replays/demo-project-key")
            .header("Origin", "http://localhost:4173")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(replayPayload)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.received").value(1));

    Map<String, Object> base = basePayload(
        "http://localhost:4173/replay",
        "Replay",
        "device-r1",
        "session-r1",
        "page-r1"
    );
    base.put("release", "1.2.3");
    base.put("environment", "production");
    base.put("replayId", replayId);

    mockMvc.perform(post("/api/v1/monitor/collect/demo-project-key")
            .header("Origin", "http://localhost:4173")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "base", base,
                "events", List.of(
                    Map.of(
                        "type", "js_error",
                        "message", "replay linked error",
                        "stack", "Error: replay linked error\n    at app.js:1:1",
                        "timestamp", System.currentTimeMillis(),
                        "url", "http://localhost:4173/replay"
                    )
                )
            ))))
        .andExpect(status().isOk());

    mockMvc.perform(get("/api/v1/monitor/replays")
            .param("projectId", "1")
            .param("sessionId", "session-r1")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.rows[0].replayId").value(replayId))
        .andExpect(jsonPath("$.rows[0].chunkCount").value(1));

    mockMvc.perform(get("/api/v1/monitor/replays/" + replayId)
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.replayId").value(replayId))
        .andExpect(jsonPath("$.data.chunks[0].sequenceNo").value(0))
        .andExpect(jsonPath("$.data.chunks[0].payloadJson").exists());

    mockMvc.perform(get("/api/v1/monitor/events")
            .param("projectId", "1")
            .param("sessionId", "session-r1")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.rows[0].replayId").value(replayId));
  }

  @Test
  void shouldUploadSourceMapAndResolveEventStack() throws Exception {
    Map<String, Object> base = basePayload(
        "http://localhost:4173/source-map",
        "Source Map",
        "device-sm",
        "session-sm",
        "page-sm"
    );
    base.put("release", "1.2.3");

    Map<String, Object> payload = Map.of(
        "base", base,
        "events", List.of(
            Map.of(
                "type", "js_error",
                "message", "minified boom",
                "stack", "Error: minified boom\n    at boom (http://localhost:4173/assets/app.min.js:1:1)",
                "timestamp", System.currentTimeMillis(),
                "url", "http://localhost:4173/source-map"
            )
        )
    );

    mockMvc.perform(post("/api/v1/monitor/collect/demo-project-key")
            .header("Origin", "http://localhost:4173")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isOk());

    MockMultipartFile sourceMap = new MockMultipartFile(
        "file",
        "app.min.js.map",
        MediaType.APPLICATION_JSON_VALUE,
        """
        {
          "version": 3,
          "file": "app.min.js",
          "sources": ["src/app.ts"],
          "sourcesContent": ["throw new Error('boom')"],
          "names": ["boom"],
          "mappings": "AAAAA"
        }
        """.getBytes()
    );

    mockMvc.perform(multipart("/api/v1/monitor/source-maps")
            .file(sourceMap)
            .param("projectId", "1")
            .param("release", "1.2.3")
            .param("artifact", "/assets/app.min.js")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.projectId").value(1))
        .andExpect(jsonPath("$.data.release").value("1.2.3"))
        .andExpect(jsonPath("$.data.artifact").value("/assets/app.min.js"));

    String eventList = mockMvc.perform(get("/api/v1/monitor/events")
            .param("projectId", "1")
            .param("release", "1.2.3")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    Long eventId = objectMapper.readTree(eventList).get("rows").get(0).get("id").asLong();

    mockMvc.perform(get("/api/v1/monitor/events/" + eventId + "/resolved")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.applied").value(true))
        .andExpect(jsonPath("$.data.release").value("1.2.3"))
        .andExpect(jsonPath("$.data.frames[0].resolved").value(true))
        .andExpect(jsonPath("$.data.frames[0].artifact").value("/assets/app.min.js"))
        .andExpect(jsonPath("$.data.frames[0].originalSource").value("src/app.ts"))
        .andExpect(jsonPath("$.data.resolvedStack").value(org.hamcrest.Matchers.containsString("src/app.ts:1:1")));
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
  void shouldRejectCollectFromDisallowedOrigin() throws Exception {
    Map<String, Object> payload = Map.of(
        "base", basePayload("http://evil.example/demo", "Demo", "device-1", "session-1", "page-1"),
        "events", List.of(
            Map.of(
                "type", "custom",
                "eventName", "demo",
                "timestamp", System.currentTimeMillis(),
                "url", "http://evil.example/demo"
            )
        )
    );

    mockMvc.perform(post("/api/v1/monitor/collect/demo-project-key")
            .header("Origin", "http://evil.example")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.message").value("monitor.errors.originNotAllowed"));
  }

  @Test
  void shouldRejectCollectBatchThatExceedsConfiguredLimit() throws Exception {
    Map<String, Object> event = Map.of(
        "type", "custom",
        "eventName", "oversized",
        "timestamp", System.currentTimeMillis(),
        "url", "http://localhost/demo"
    );
    Map<String, Object> payload = Map.of(
        "base", basePayload("http://localhost/demo", "Demo", "device-1", "session-1", "page-1"),
        "events", List.of(event, event, event)
    );

    mockMvc.perform(post("/api/v1/monitor/collect/demo-project-key")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("monitor.errors.tooManyEvents"));
  }

  @Test
  void shouldPersistDiagnosticContextAndFilterByReleaseEnvironment() throws Exception {
    Map<String, Object> base = basePayload(
        "http://localhost:4173/demo-context",
        "Demo Context",
        "device-context",
        "session-context",
        "page-context"
    );
    base.put("release", "1.2.3");
    base.put("environment", "production");
    base.put("tags", Map.of("region", "us"));
    base.put("contexts", Map.of("device", Map.of("memory", "8g")));
    base.put("breadcrumbs", List.of(Map.of(
        "message", "clicked checkout",
        "type", "click",
        "timestamp", System.currentTimeMillis()
    )));

    Map<String, Object> payload = Map.of(
        "base", base,
        "events", List.of(
            Map.of(
                "type", "js_error",
                "message", "context error",
                "stack", "Error: context error\n    at demo.js:1:1",
                "timestamp", System.currentTimeMillis(),
                "traceId", "trace-001",
                "spanId", "span-001",
                "url", "http://localhost:4173/demo-context"
            )
        )
    );

    mockMvc.perform(post("/api/v1/monitor/collect/demo-project-key")
            .header("Origin", "http://localhost:4173")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isOk());

    mockMvc.perform(get("/api/v1/monitor/events")
            .param("projectId", "1")
            .param("release", "1.2.3")
            .param("environment", "production")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.rows[0].release").value("1.2.3"))
        .andExpect(jsonPath("$.rows[0].environment").value("production"))
        .andExpect(jsonPath("$.rows[0].tagsJson").exists())
        .andExpect(jsonPath("$.rows[0].contextsJson").exists())
        .andExpect(jsonPath("$.rows[0].breadcrumbsJson").exists())
        .andExpect(jsonPath("$.rows[0].traceId").value("trace-001"))
        .andExpect(jsonPath("$.rows[0].spanId").value("span-001"));
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

  @Test
  void shouldCreateEvaluateAndListAlertRecords() throws Exception {
    Map<String, Object> payload = Map.of(
        "base", basePayload("http://localhost:4173/alert", "Alert", "device-alert", "session-alert", "page-alert"),
        "events", List.of(
            Map.of(
                "type", "js_error",
                "message", "alert error",
                "stack", "Error: alert error\n    at alert.js:1:1",
                "timestamp", System.currentTimeMillis(),
                "url", "http://localhost:4173/alert"
            )
        )
    );

    mockMvc.perform(post("/api/v1/monitor/collect/demo-project-key")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isOk());

    String response = mockMvc.perform(post("/api/v1/monitor/alerts/rules")
            .with(user("admin"))
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "projectId", 1,
                "name", "JS error spike",
                "eventType", "js_error",
                "thresholdCount", 1,
                "windowMinutes", 60,
                "enabled", true
            ))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").exists())
        .andReturn()
        .getResponse()
        .getContentAsString();

    Long ruleId = objectMapper.readTree(response).get("data").get("id").asLong();

    mockMvc.perform(post("/api/v1/monitor/alerts/rules/" + ruleId + "/test")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.triggered").value(true));

    mockMvc.perform(get("/api/v1/monitor/alerts/records")
            .param("projectId", "1")
            .with(user("admin")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total", greaterThanOrEqualTo(1)))
        .andExpect(jsonPath("$.rows[0].ruleId").value(ruleId));
  }
}
