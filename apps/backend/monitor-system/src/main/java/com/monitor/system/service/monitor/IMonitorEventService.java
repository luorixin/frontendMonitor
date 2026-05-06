package com.monitor.system.service.monitor;

import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.query.MonitorEventQuery;
import com.monitor.system.domain.monitor.vo.MonitorResolvedEventVo;
import com.monitor.system.domain.monitor.vo.MonitorEventRawVo;
import java.util.List;

public interface IMonitorEventService {
  List<MonitorEvent> selectEventList(MonitorEventQuery query);

  MonitorEvent selectEventById(Long id);

  MonitorEventRawVo selectEventRawById(Long id);

  MonitorResolvedEventVo selectResolvedEventById(Long id);
}
