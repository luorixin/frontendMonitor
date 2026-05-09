package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorTraceOverviewVo {
  private long totalTraces;
  private long errorTraces;
  private long slowTraces;
}
