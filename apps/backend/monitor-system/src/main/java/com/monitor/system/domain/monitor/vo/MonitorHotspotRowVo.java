package com.monitor.system.domain.monitor.vo;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorHotspotRowVo {
  private String eventType;
  private String url;
  private String selector;
  private String label;
  private long count;
  private long uniqueSessions;
  private LocalDateTime lastOccurredAt;
}
