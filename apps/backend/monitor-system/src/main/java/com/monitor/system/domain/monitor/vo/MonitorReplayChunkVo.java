package com.monitor.system.domain.monitor.vo;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorReplayChunkVo {
  private Integer sequenceNo;
  private LocalDateTime startedAt;
  private LocalDateTime endedAt;
  private Long eventCount;
  private String payloadJson;
}
