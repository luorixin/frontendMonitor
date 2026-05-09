package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorPageTrendPointVo {
  private String bucket;
  private long pv;
  private long errorCount;
  private double avgDwellDuration;
}
