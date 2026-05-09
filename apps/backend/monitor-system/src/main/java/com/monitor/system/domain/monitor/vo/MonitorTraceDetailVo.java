package com.monitor.system.domain.monitor.vo;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorTraceDetailVo extends MonitorTraceSummaryVo {
  private List<MonitorTraceTimelineEventVo> events;
}
