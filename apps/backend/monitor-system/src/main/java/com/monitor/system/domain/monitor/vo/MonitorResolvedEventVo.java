package com.monitor.system.domain.monitor.vo;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorResolvedEventVo {
  private Long eventId;
  private String eventType;
  private String release;
  private String dist;
  private boolean applied;
  private String status;
  private String originalStack;
  private String resolvedStack;
  private List<MonitorSourceMapFrameVo> frames;
}
