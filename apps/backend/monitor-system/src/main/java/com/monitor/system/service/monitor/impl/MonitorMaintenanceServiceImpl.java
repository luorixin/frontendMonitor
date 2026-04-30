package com.monitor.system.service.monitor.impl;

import com.monitor.system.mapper.monitor.MonitorAggregateMapper;
import com.monitor.system.mapper.monitor.MonitorEventMapper;
import com.monitor.system.service.monitor.IMonitorMaintenanceService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonitorMaintenanceServiceImpl implements IMonitorMaintenanceService {

  private static final Logger log = LoggerFactory.getLogger(MonitorMaintenanceServiceImpl.class);

  private final MonitorEventMapper eventMapper;
  private final MonitorAggregateMapper aggregateMapper;

  public MonitorMaintenanceServiceImpl(
      MonitorEventMapper eventMapper,
      MonitorAggregateMapper aggregateMapper
  ) {
    this.eventMapper = eventMapper;
    this.aggregateMapper = aggregateMapper;
  }

  @Override
  @Transactional
  @Scheduled(cron = "0 30 3 * * ?")
  public void cleanupExpiredData() {
    LocalDateTime eventCutoff = LocalDateTime.now().minusDays(30);
    LocalDate aggregateCutoff = LocalDate.now().minusDays(180);
    int deletedEvents = eventMapper.deleteEventsOlderThan(eventCutoff);
    int deletedHourAgg = aggregateMapper.deleteHourAggregatesOlderThan(eventCutoff);
    int deletedDayAgg = aggregateMapper.deleteDayAggregatesOlderThan(aggregateCutoff);
    log.info(
        "monitor cleanup finished: events={}, hourAgg={}, dayAgg={}",
        deletedEvents,
        deletedHourAgg,
        deletedDayAgg
    );
  }
}
