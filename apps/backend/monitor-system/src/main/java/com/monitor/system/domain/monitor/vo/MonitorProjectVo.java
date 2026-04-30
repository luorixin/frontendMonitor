package com.monitor.system.domain.monitor.vo;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorProjectVo {
  private Long id;
  private String projectName;
  private String projectKey;
  private String appName;
  private String appVersion;
  private Integer status;
  private String description;
  private List<String> allowedOrigins;
  private String dsn;
  private LocalDateTime createTime;
  private LocalDateTime updateTime;
}
