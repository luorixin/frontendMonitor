package com.monitor.web.controller.monitor;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitor.framework.web.filter.MonitorGzipRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPOutputStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class MonitorGzipRequestFilterTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final MonitorGzipRequestFilter filter = new MonitorGzipRequestFilter(objectMapper);

  @Test
  void shouldDecompressCollectRequestsBeforeTheyReachTheController() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest(
        "POST",
        "/api/v1/monitor/collect/demo-project-key"
    );
    request.addHeader(HttpHeaders.CONTENT_ENCODING, "gzip");
    request.setContentType("application/json");
    request.setContent(gzip("{\"events\":[1],\"base\":{\"appName\":\"demo\"}}"));

    MockHttpServletResponse response = new MockHttpServletResponse();
    StringBuilder bodySeenByController = new StringBuilder();
    StringBuilder contentEncodingSeenByController = new StringBuilder();

    FilterChain chain = (wrappedRequest, wrappedResponse) -> {
      HttpServletRequest httpRequest = (HttpServletRequest) wrappedRequest;
      HttpServletResponse httpResponse = (HttpServletResponse) wrappedResponse;
      bodySeenByController.append(
          new String(httpRequest.getInputStream().readAllBytes(), StandardCharsets.UTF_8)
      );
      contentEncodingSeenByController.append(httpRequest.getHeader(HttpHeaders.CONTENT_ENCODING));
      httpResponse.getWriter().write("ok");
    };

    filter.doFilter(request, response, chain);

    assertThat(bodySeenByController.toString()).isEqualTo("{\"events\":[1],\"base\":{\"appName\":\"demo\"}}");
    assertThat(contentEncodingSeenByController.toString()).isEqualTo("null");
    assertThat(response.getContentAsString()).isEqualTo("ok");
  }

  @Test
  void shouldReturnBadRequestForInvalidGzipBody() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest(
        "POST",
        "/api/v1/monitor/replays/demo-project-key"
    );
    request.addHeader(HttpHeaders.CONTENT_ENCODING, "gzip");
    request.setContentType("application/json");
    request.setContent("not-gzip".getBytes(StandardCharsets.UTF_8));

    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (wrappedRequest, wrappedResponse) -> {
      throw new AssertionError("filter should not pass malformed gzip downstream");
    });

    assertThat(response.getStatus()).isEqualTo(400);
    assertThat(response.getContentType()).isEqualTo("application/json");
    assertThat(response.getContentAsString()).contains("common.errors.malformedRequest");
  }

  private byte[] gzip(String body) throws Exception {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try (GZIPOutputStream gzip = new GZIPOutputStream(output)) {
      gzip.write(body.getBytes(StandardCharsets.UTF_8));
    }
    return output.toByteArray();
  }
}
