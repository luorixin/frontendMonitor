package com.monitor.system.domain.monitor.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorIssueStatusBody {
  @NotBlank
  private String status;
}
