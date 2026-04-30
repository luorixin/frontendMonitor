package com.monitor.core.domain;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
  private boolean success;
  private String message;
  private T data;
  private Map<String, String> errors;

  private ApiResponse(boolean success, String message, T data, Map<String, String> errors) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errors = errors;
  }

  public boolean getSuccess() { return success; }
  public String getMessage() { return message; }
  public T getData() { return data; }
  public Map<String, String> getErrors() { return errors; }

  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, "OK", data, null);
  }

  public static <T> ApiResponse<T> ok(String message, T data) {
    return new ApiResponse<>(true, message, data, null);
  }

  public static ApiResponse<Void> error(String message) {
    return new ApiResponse<>(false, message, null, null);
  }

  public static ApiResponse<Void> error(String message, Map<String, String> errors) {
    return new ApiResponse<>(false, message, null, errors);
  }
}
