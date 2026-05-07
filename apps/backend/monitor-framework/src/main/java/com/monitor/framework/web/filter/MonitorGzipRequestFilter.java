package com.monitor.framework.web.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitor.core.domain.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class MonitorGzipRequestFilter extends OncePerRequestFilter {

  private static final String MONITOR_API_PREFIX = "/api/v1/monitor/";

  private final ObjectMapper objectMapper;

  public MonitorGzipRequestFilter(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    if (!"POST".equalsIgnoreCase(request.getMethod())) {
      return true;
    }

    String path = request.getRequestURI();
    if (path == null || !path.startsWith(MONITOR_API_PREFIX)) {
      return true;
    }

    return !(path.startsWith(MONITOR_API_PREFIX + "collect/")
        || path.startsWith(MONITOR_API_PREFIX + "replays/"));
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    if (!hasGzipEncoding(request)) {
      filterChain.doFilter(request, response);
      return;
    }

    try {
      filterChain.doFilter(new GzipBodyRequestWrapper(request), response);
    } catch (IOException exception) {
      writeMalformedRequest(response);
    }
  }

  private boolean hasGzipEncoding(HttpServletRequest request) {
    Enumeration<String> headerValues = request.getHeaders(HttpHeaders.CONTENT_ENCODING);
    while (headerValues.hasMoreElements()) {
      String headerValue = headerValues.nextElement();
      if (headerValue == null) {
        continue;
      }

      for (String part : headerValue.split(",")) {
        if ("gzip".equals(part.trim().toLowerCase(Locale.ROOT))) {
          return true;
        }
      }
    }
    return false;
  }

  private void writeMalformedRequest(HttpServletResponse response) throws IOException {
    response.setStatus(HttpStatus.BAD_REQUEST.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(
        response.getOutputStream(),
        ApiResponse.error("common.errors.malformedRequest")
    );
  }

  private static final class GzipBodyRequestWrapper extends HttpServletRequestWrapper {

    private final byte[] requestBody;

    private GzipBodyRequestWrapper(HttpServletRequest request) throws IOException {
      super(request);
      this.requestBody = unzip(request);
    }

    @Override
    public ServletInputStream getInputStream() {
      return new ByteArrayServletInputStream(requestBody);
    }

    @Override
    public BufferedReader getReader() {
      return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
    }

    @Override
    public int getContentLength() {
      return requestBody.length;
    }

    @Override
    public long getContentLengthLong() {
      return requestBody.length;
    }

    @Override
    public String getHeader(String name) {
      if (HttpHeaders.CONTENT_ENCODING.equalsIgnoreCase(name)) {
        return null;
      }
      return super.getHeader(name);
    }

    @Override
    public Enumeration<String> getHeaders(String name) {
      if (HttpHeaders.CONTENT_ENCODING.equalsIgnoreCase(name)) {
        return Collections.emptyEnumeration();
      }
      return super.getHeaders(name);
    }

    @Override
    public Enumeration<String> getHeaderNames() {
      List<String> filtered = Collections.list(super.getHeaderNames()).stream()
          .filter(name -> !HttpHeaders.CONTENT_ENCODING.equalsIgnoreCase(name))
          .toList();
      return Collections.enumeration(filtered);
    }

    private static byte[] unzip(HttpServletRequest request) throws IOException {
      try (GZIPInputStream gzip = new GZIPInputStream(request.getInputStream());
           ByteArrayOutputStream output = new ByteArrayOutputStream()) {
        gzip.transferTo(output);
        return output.toByteArray();
      }
    }
  }

  private static final class ByteArrayServletInputStream extends ServletInputStream {

    private final ByteArrayInputStream delegate;

    private ByteArrayServletInputStream(byte[] data) {
      this.delegate = new ByteArrayInputStream(data);
    }

    @Override
    public int read() {
      return delegate.read();
    }

    @Override
    public boolean isFinished() {
      return delegate.available() == 0;
    }

    @Override
    public boolean isReady() {
      return true;
    }

    @Override
    public void setReadListener(ReadListener readListener) {
      throw new UnsupportedOperationException("ReadListener is not supported");
    }
  }
}
