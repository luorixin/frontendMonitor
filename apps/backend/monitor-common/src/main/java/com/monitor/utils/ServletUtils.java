package com.monitor.utils;

import com.monitor.constant.Constants;
import com.monitor.core.domain.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;

public class ServletUtils {

  private ServletUtils() {}

  public static String renderString(HttpServletResponse response, String content) throws IOException {
    response.setStatus(HttpServletResponse.SC_OK);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    response.getWriter().write(content);
    return null;
  }

  public static String renderError(HttpServletResponse response, int status, String message)
      throws IOException {
    response.setStatus(status);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    response.getWriter().write(
        new com.fasterxml.jackson.databind.ObjectMapper()
            .writeValueAsString(ApiResponse.error(message)));
    return null;
  }
}
