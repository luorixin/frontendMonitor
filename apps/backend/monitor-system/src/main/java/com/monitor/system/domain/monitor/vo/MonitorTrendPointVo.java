package com.monitor.system.domain.monitor.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorTrendPointVo {
  private String bucket;
  private long totalCount;
  private long errorCount;
  private long pageViewCount;
}
