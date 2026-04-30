package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorDashboardOverviewVo {
  private long totalEvents;
  private long errorEvents;
  private double errorRate;
  private long pageViews;
  private long uniqueSessions;
  private long uniqueUsers;
  private long uniqueDevices;
}
