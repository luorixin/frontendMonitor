package com.monitor.system.domain.monitor.query;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorSourceMapArtifactQuery {
  private Long projectId;
  private String release;
  private String artifact;
  private Integer pageNum = 1;
  private Integer pageSize = 20;
}
