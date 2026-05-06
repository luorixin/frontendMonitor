package com.monitor.system.domain.monitor;

import com.monitor.core.domain.BaseEntity;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorReplayChunk extends BaseEntity {
  private Long id;
  private Long replaySessionId;
  private Integer sequenceNo;
  private LocalDateTime startedAt;
  private LocalDateTime endedAt;
  private Long eventCount;
  private String payloadJson;
}
