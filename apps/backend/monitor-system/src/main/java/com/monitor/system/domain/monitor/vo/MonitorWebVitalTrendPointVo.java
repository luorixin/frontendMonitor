package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorWebVitalTrendPointVo {
  private String bucket;
  private String metricName;
  private String navigationMode;
  private double avgValue;
  private double p75Value;
  private long sampleCount;
  private long goodCount;
  private long needsImprovementCount;
  private long poorCount;
}
