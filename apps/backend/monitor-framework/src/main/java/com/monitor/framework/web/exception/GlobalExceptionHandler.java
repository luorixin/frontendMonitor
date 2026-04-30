package com.monitor.framework.web.exception;

import com.monitor.core.domain.ApiResponse;
import com.monitor.exception.ServiceException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ServiceException.class)
  public ResponseEntity<ApiResponse<Void>> handleServiceException(ServiceException e) {
    return ResponseEntity.status(e.getCode() > 100 ? e.getCode() : HttpStatus.INTERNAL_SERVER_ERROR.value())
        .body(ApiResponse.error(e.getMessage()));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException e) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(ApiResponse.error("auth.errors.forbidden"));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
    Map<String, String> errors = new LinkedHashMap<>();
    e.getBindingResult().getFieldErrors()
        .forEach(er -> errors.put(er.getField(), er.getDefaultMessage()));
    e.getBindingResult().getGlobalErrors()
        .forEach(er -> errors.putIfAbsent(er.getObjectName(), er.getDefaultMessage()));

    return ResponseEntity.badRequest().body(ApiResponse.error("common.errors.invalidRequest", errors));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiResponse<Void>> handleMalformedRequest(HttpMessageNotReadableException e) {
    return ResponseEntity.badRequest().body(ApiResponse.error("common.errors.malformedRequest"));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleUnexpectedException(Exception e) {
    log.error("Unhandled exception", e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.error("common.errors.internalServerError"));
  }
}
