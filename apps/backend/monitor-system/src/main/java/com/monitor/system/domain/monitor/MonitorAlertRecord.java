package com.monitor.system.domain.monitor;

import com.monitor.core.domain.BaseEntity;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorAlertRecord extends BaseEntity {
  private Long id;
  private Long ruleId;
  private Long projectId;
  private String eventType;
  private LocalDateTime windowStart;
  private LocalDateTime windowEnd;
  private Long actualCount;
  private Long thresholdCount;
  private String message;
  private LocalDateTime triggeredAt;
}
