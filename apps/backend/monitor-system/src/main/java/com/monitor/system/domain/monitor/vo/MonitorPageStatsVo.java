package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorPageStatsVo {
  private String url;
  private long eventCount;
  private long errorCount;
}
