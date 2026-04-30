package com.monitor.system.domain.monitor.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorProjectStatusBody {
  @NotNull
  private Integer status;
}
