package com.monitor.system.service.monitor.impl;

import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.vo.MonitorDashboardOverviewVo;
import com.monitor.system.domain.monitor.vo.MonitorEventTypeCountVo;
import com.monitor.system.domain.monitor.vo.MonitorIssueVo;
import com.monitor.system.domain.monitor.vo.MonitorPageStatsVo;
import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import com.monitor.system.mapper.monitor.MonitorAggregateMapper;
import com.monitor.system.mapper.monitor.MonitorEventMapper;
import com.monitor.system.mapper.monitor.MonitorIssueMapper;
import com.monitor.system.mapper.monitor.MonitorProjectMapper;
import com.monitor.system.service.monitor.IMonitorDashboardService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MonitorDashboardServiceImpl implements IMonitorDashboardService {

  private final MonitorProjectMapper projectMapper;
  private final MonitorEventMapper eventMapper;
  private final MonitorIssueMapper issueMapper;
  private final MonitorAggregateMapper aggregateMapper;

  public MonitorDashboardServiceImpl(
      MonitorProjectMapper projectMapper,
      MonitorEventMapper eventMapper,
      MonitorIssueMapper issueMapper,
      MonitorAggregateMapper aggregateMapper
  ) {
    this.projectMapper = projectMapper;
    this.eventMapper = eventMapper;
    this.issueMapper = issueMapper;
    this.aggregateMapper = aggregateMapper;
  }

  @Override
  public MonitorDashboardOverviewVo getOverview(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    MonitorDashboardOverviewVo vo = new MonitorDashboardOverviewVo();
    long totalEvents = eventMapper.countEvents(query.getProjectId(), query.getStartTime(), query.getEndTime());
    long errorEvents = eventMapper.countErrorEvents(query.getProjectId(), query.getStartTime(), query.getEndTime());
    vo.setTotalEvents(totalEvents);
    vo.setErrorEvents(errorEvents);
    vo.setErrorRate(totalEvents == 0 ? 0D : (double) errorEvents * 100D / (double) totalEvents);
    vo.setPageViews(eventMapper.countPageViews(query.getProjectId(), query.getStartTime(), query.getEndTime()));
    vo.setUniqueSessions(eventMapper.countDistinctSessions(query.getProjectId(), query.getStartTime(), query.getEndTime()));
    vo.setUniqueUsers(eventMapper.countDistinctUsers(query.getProjectId(), query.getStartTime(), query.getEndTime()));
    vo.setUniqueDevices(eventMapper.countDistinctDevices(query.getProjectId(), query.getStartTime(), query.getEndTime()));
    return vo;
  }

  @Override
  public List<MonitorTrendPointVo> getTrend(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    if ("day".equalsIgnoreCase(query.getGranularity())) {
      return aggregateMapper.selectTrendByDay(
          query.getProjectId(),
          query.getStartTime().toLocalDate(),
          query.getEndTime().toLocalDate()
      );
    }
    return aggregateMapper.selectTrendByHour(query.getProjectId(), query.getStartTime(), query.getEndTime());
  }

  @Override
  public List<MonitorEventTypeCountVo> getDistribution(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    return eventMapper.selectDistribution(query.getProjectId(), query.getStartTime(), query.getEndTime());
  }

  @Override
  public List<MonitorPageStatsVo> getTopPages(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    return eventMapper.selectTopPages(query.getProjectId(), query.getStartTime(), query.getEndTime());
  }

  @Override
  public List<MonitorIssueVo> getTopIssues(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    return issueMapper.selectTopIssues(query.getProjectId(), query.getStartTime(), query.getEndTime())
        .stream()
        .map(issue -> {
          MonitorIssueVo vo = new MonitorIssueVo();
          vo.setId(issue.getId());
          vo.setProjectId(issue.getProjectId());
          vo.setIssueType(issue.getIssueType());
          vo.setFingerprint(issue.getFingerprint());
          vo.setTitle(issue.getTitle());
          vo.setFirstSeenAt(issue.getFirstSeenAt());
          vo.setLastSeenAt(issue.getLastSeenAt());
          vo.setOccurrenceCount(issue.getOccurrenceCount());
          vo.setLatestEventId(issue.getLatestEventId());
          vo.setStatus(issue.getStatus());
          return vo;
        })
        .toList();
  }

  private void normalizeDashboardQuery(MonitorDashboardQuery query) {
    if (query.getProjectId() == null) {
      throw new ServiceException(400, "monitor.errors.projectIdRequired");
    }
    if (projectMapper.selectProjectById(query.getProjectId()) == null) {
      throw new ServiceException(404, "monitor.errors.projectNotFound");
    }
    if (query.getEndTime() == null) {
      query.setEndTime(LocalDateTime.now());
    }
    if (query.getStartTime() == null) {
      query.setStartTime(query.getEndTime().minusHours(24));
    }
    if (query.getStartTime().isAfter(query.getEndTime())) {
      throw new ServiceException(400, "monitor.errors.invalidTimeRange");
    }
  }
}
