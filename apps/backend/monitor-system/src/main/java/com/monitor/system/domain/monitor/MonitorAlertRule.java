package com.monitor.system.domain.monitor;

import com.monitor.core.domain.BaseEntity;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorAlertRule extends BaseEntity {
  private Long id;
  private Long projectId;
  private String name;
  private String eventType;
  private Long thresholdCount;
  private Integer windowMinutes;
  private Boolean enabled;
}
