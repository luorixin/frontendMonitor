package com.monitor.system.domain.monitor.vo;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorIssueVo {
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
  private String assignee;
  private String priority;
  private Long commentCount;
}
