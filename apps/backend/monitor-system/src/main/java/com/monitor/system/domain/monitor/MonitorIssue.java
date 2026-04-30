package com.monitor.system.domain.monitor;

import com.monitor.core.domain.BaseEntity;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorIssue extends BaseEntity {
  private Long id;
  private Long projectId;
  private String issueType;
  private String fingerprint;
  private String title;
  private LocalDateTime firstSeenAt;
  private LocalDateTime lastSeenAt;
  private Long occurrenceCount;
  private String latestEventId;
  private String status;
}
