package com.monitor.system.domain.monitor.vo;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorTraceSummaryVo {
  private String traceId;
  private LocalDateTime startedAt;
  private LocalDateTime lastSeenAt;
  private long duration;
  private long eventCount;
  private long errorCount;
  private String url;
  private String sessionId;
}
