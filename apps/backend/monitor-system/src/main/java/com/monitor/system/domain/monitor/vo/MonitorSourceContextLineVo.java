package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorSourceContextLineVo {
  private int lineNumber;
  private String content;
  private boolean focus;
}
