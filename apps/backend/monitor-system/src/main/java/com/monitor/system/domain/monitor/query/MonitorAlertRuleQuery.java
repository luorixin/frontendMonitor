package com.monitor.system.domain.monitor.query;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorAlertRuleQuery {
  private Long projectId;
  private Boolean enabled;
  private Integer pageNum = 1;
  private Integer pageSize = 20;
}
