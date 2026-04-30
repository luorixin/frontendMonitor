package com.monitor.exception;

public class ServiceException extends RuntimeException {
  private final int code;
  private String detailMessage;

  public int getCode() { return code; }
  public String getDetailMessage() { return detailMessage; }
  public void setDetailMessage(String detailMessage) { this.detailMessage = detailMessage; }

  public ServiceException(String message) {
    super(message);
    this.code = 500;
  }

  public ServiceException(int code, String message) {
    super(message);
    this.code = code;
  }

  public ServiceException(String message, Throwable cause) {
    super(message, cause);
    this.code = 500;
  }
}
