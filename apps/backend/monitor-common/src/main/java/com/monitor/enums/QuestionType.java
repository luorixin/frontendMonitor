package com.monitor.enums;

public enum QuestionType {
  SINGLE_CHOICE("single_choice"),
  MULTIPLE_CHOICE("multiple_choice"),
  TRUE_FALSE("true_false");

  private final String value;

  QuestionType(String value) {
    this.value = value;
  }

  public String getValue() {
    return value;
  }
}
