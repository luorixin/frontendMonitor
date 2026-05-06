package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorRequestPerformanceTrendPointVo {
  private String bucket;
  private double avgDuration;
  private double p75Duration;
  private double maxDuration;
  private long sampleCount;
  private long errorCount;
}
