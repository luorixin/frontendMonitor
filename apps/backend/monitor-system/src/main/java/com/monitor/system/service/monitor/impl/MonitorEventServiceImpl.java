package com.monitor.system.service.monitor.impl;

import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.query.MonitorEventQuery;
import com.monitor.system.domain.monitor.vo.MonitorEventRawVo;
import com.monitor.system.mapper.monitor.MonitorEventMapper;
import com.monitor.system.service.monitor.IMonitorEventService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MonitorEventServiceImpl implements IMonitorEventService {

  private final MonitorEventMapper eventMapper;

  public MonitorEventServiceImpl(MonitorEventMapper eventMapper) {
    this.eventMapper = eventMapper;
  }

  @Override
  public List<MonitorEvent> selectEventList(MonitorEventQuery query) {
    applyDefaultTimeRange(query);
    return eventMapper.selectEventList(query);
  }

  @Override
  public MonitorEvent selectEventById(Long id) {
    MonitorEvent event = eventMapper.selectEventById(id);
    if (event == null) {
      throw new ServiceException(404, "monitor.errors.eventNotFound");
    }
    return event;
  }

  @Override
  public MonitorEventRawVo selectEventRawById(Long id) {
    MonitorEvent event = selectEventById(id);
    return new MonitorEventRawVo(event.getBaseJson(), event.getPayloadJson());
  }

  private void applyDefaultTimeRange(MonitorEventQuery query) {
    if (query.getEndTime() == null) {
      query.setEndTime(LocalDateTime.now());
    }
    if (query.getStartTime() == null) {
      query.setStartTime(query.getEndTime().minusHours(24));
    }
  }
}
