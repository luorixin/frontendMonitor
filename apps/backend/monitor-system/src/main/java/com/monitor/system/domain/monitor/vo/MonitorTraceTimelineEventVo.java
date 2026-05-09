package com.monitor.system.domain.monitor.vo;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorTraceTimelineEventVo {
  private Long id;
  private String eventId;
  private Long issueId;
  private String replayId;
  private String spanId;
  private String eventType;
  private String message;
  private String url;
  private Long duration;
  private Integer status;
  private LocalDateTime occurredAt;
}
