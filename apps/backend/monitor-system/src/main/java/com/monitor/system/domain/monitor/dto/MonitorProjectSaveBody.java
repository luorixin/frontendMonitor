package com.monitor.system.domain.monitor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorProjectSaveBody {
  @NotBlank
  private String projectName;

  @NotBlank
  private String appName;

  private String appVersion;
  private String description;
  private List<String> allowedOrigins;

  @NotNull
  private Integer status;
}
