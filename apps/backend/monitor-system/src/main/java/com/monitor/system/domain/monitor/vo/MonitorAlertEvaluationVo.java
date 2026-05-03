package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorAlertEvaluationVo {
  private boolean triggered;
  private Long actualCount;
  private Long thresholdCount;
  private Long recordId;
}
