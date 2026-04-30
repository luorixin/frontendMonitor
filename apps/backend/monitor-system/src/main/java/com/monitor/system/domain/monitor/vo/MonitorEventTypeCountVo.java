package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorEventTypeCountVo {
  private String eventType;
  private long totalCount;
}
