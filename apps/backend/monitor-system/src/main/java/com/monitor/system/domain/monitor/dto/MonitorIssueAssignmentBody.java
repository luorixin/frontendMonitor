package com.monitor.system.domain.monitor.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorIssueAssignmentBody {
  private String assignee;
  private String priority;
}
