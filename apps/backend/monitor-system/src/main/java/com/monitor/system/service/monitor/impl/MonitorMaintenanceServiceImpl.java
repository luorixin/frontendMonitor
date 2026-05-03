package com.monitor.system.service.monitor.impl;

import com.monitor.system.mapper.monitor.MonitorAggregateMapper;
import com.monitor.system.mapper.monitor.MonitorEventMapper;
import com.monitor.system.service.monitor.IMonitorMaintenanceService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
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
  private final int eventRetentionDays;
  private final int aggregateRetentionDays;

  public MonitorMaintenanceServiceImpl(
      MonitorEventMapper eventMapper,
      MonitorAggregateMapper aggregateMapper,
      @Value("${app.monitor.retention.event-days:30}") int eventRetentionDays,
      @Value("${app.monitor.retention.aggregate-days:180}") int aggregateRetentionDays
  ) {
    this.eventMapper = eventMapper;
    this.aggregateMapper = aggregateMapper;
    this.eventRetentionDays = Math.max(1, eventRetentionDays);
    this.aggregateRetentionDays = Math.max(1, aggregateRetentionDays);
  }

  @Override
  @Transactional
  @Scheduled(cron = "0 30 3 * * ?")
  public void cleanupExpiredData() {
    LocalDateTime eventCutoff = LocalDateTime.now().minusDays(eventRetentionDays);
    LocalDate aggregateCutoff = LocalDate.now().minusDays(aggregateRetentionDays);
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
