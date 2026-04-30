package com.monitor.system.domain.monitor;

import com.monitor.core.domain.BaseEntity;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorProject extends BaseEntity {
  private Long id;
  private String projectName;
  private String projectKey;
  private String appName;
  private String appVersion;
  private Integer status;
  private String description;
  private String allowedOrigins;
}
