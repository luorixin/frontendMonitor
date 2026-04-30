package com.monitor.system.domain.monitor.vo;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MonitorEventRawVo {
  private String baseJson;
  private String payloadJson;
}
