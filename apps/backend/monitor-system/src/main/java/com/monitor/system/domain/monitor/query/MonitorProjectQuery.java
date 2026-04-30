package com.monitor.system.domain.monitor.query;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorProjectQuery {
  private String keyword;
  private Integer status;
  private Integer pageNum = 1;
  private Integer pageSize = 20;
}
