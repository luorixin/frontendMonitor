package com.monitor.system.domain.monitor.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorAlertRuleSaveBody {
  @NotNull
  private Long projectId;

  @NotBlank
  private String name;

  private String eventType;

  @NotNull
  @Min(1)
  private Long thresholdCount;

  @NotNull
  @Min(1)
  private Integer windowMinutes;

  private Boolean enabled;
}
