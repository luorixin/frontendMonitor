package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorPageAnalyticsRowVo {
  private String url;
  private long pv;
  private long errorCount;
  private long uniqueSessions;
  private long uniqueUsers;
  private double avgDwellDuration;
  private double p75DwellDuration;
}
