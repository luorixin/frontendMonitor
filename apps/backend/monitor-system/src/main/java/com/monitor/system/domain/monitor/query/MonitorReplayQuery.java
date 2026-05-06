package com.monitor.system.domain.monitor.query;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorReplayQuery {
  private Long projectId;
  private String sessionId;
  private String replayId;
  private String release;
  private Integer pageNum = 1;
  private Integer pageSize = 20;
}
