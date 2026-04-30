package com.monitor.enums;

public enum PracticeMode {
  TOPIC_PRACTICE("topic_practice"),
  WRONG_BOOK("wrong_book");

  private final String value;

  PracticeMode(String value) {
    this.value = value;
  }

  public String getValue() {
    return value;
  }
}
