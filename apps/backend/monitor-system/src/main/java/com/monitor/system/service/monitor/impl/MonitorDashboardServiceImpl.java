package com.monitor.system.service.monitor.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.query.MonitorEventQuery;
import com.monitor.system.domain.monitor.vo.MonitorDashboardOverviewVo;
import com.monitor.system.domain.monitor.vo.MonitorDwellDistributionBucketVo;
import com.monitor.system.domain.monitor.vo.MonitorEventTypeCountVo;
import com.monitor.system.domain.monitor.vo.MonitorHotspotRowVo;
import com.monitor.system.domain.monitor.vo.MonitorHotspotTrendPointVo;
import com.monitor.system.domain.monitor.vo.MonitorIssueVo;
import com.monitor.system.domain.monitor.vo.MonitorPageAnalyticsRowVo;
import com.monitor.system.domain.monitor.vo.MonitorPageTrendPointVo;
import com.monitor.system.domain.monitor.vo.MonitorPageStatsVo;
import com.monitor.system.domain.monitor.vo.MonitorRequestPerformanceTrendPointVo;
import com.monitor.system.domain.monitor.vo.MonitorSlowRequestVo;
import com.monitor.system.domain.monitor.vo.MonitorTraceDetailVo;
import com.monitor.system.domain.monitor.vo.MonitorTraceOverviewVo;
import com.monitor.system.domain.monitor.vo.MonitorTraceSummaryVo;
import com.monitor.system.domain.monitor.vo.MonitorTraceTimelineEventVo;
import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import com.monitor.system.domain.monitor.vo.MonitorWebVitalTrendPointVo;
import com.monitor.system.mapper.monitor.MonitorAggregateMapper;
import com.monitor.system.mapper.monitor.MonitorEventMapper;
import com.monitor.system.mapper.monitor.MonitorIssueMapper;
import com.monitor.system.mapper.monitor.MonitorProjectMapper;
import com.monitor.system.service.monitor.IMonitorDashboardService;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class MonitorDashboardServiceImpl implements IMonitorDashboardService {
  private static final long TRACE_SLOW_THRESHOLD_MS = 3_000L;
  private static final long DWELL_SHORT_THRESHOLD_MS = 15_000L;
  private static final long DWELL_MEDIUM_THRESHOLD_MS = 60_000L;

  private final MonitorProjectMapper projectMapper;
  private final MonitorEventMapper eventMapper;
  private final MonitorIssueMapper issueMapper;
  private final MonitorAggregateMapper aggregateMapper;
  private final ObjectMapper objectMapper;

  public MonitorDashboardServiceImpl(
      MonitorProjectMapper projectMapper,
      MonitorEventMapper eventMapper,
      MonitorIssueMapper issueMapper,
      MonitorAggregateMapper aggregateMapper,
      ObjectMapper objectMapper
  ) {
    this.projectMapper = projectMapper;
    this.eventMapper = eventMapper;
    this.issueMapper = issueMapper;
    this.aggregateMapper = aggregateMapper;
    this.objectMapper = objectMapper;
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
          vo.setResourceUrl(issue.getResourceUrl());
          vo.setStatus(issue.getStatus());
          vo.setAssignee(issue.getAssignee());
          vo.setPriority(issue.getPriority());
          vo.setCommentCount(issue.getCommentCount());
          return vo;
        })
        .toList();
  }

  @Override
  public List<MonitorWebVitalTrendPointVo> getWebVitalTrend(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);

    Map<String, BucketMetrics> buckets = new LinkedHashMap<>();
    List<MonitorEvent> events = eventMapper.selectPerformanceEvents(
        query.getProjectId(),
        query.getStartTime(),
        query.getEndTime()
    );

    for (MonitorEvent event : events) {
      collectNavigationVitals(query, buckets, event);
      collectWebVitalSamples(query, buckets, event);
    }

    return buckets.entrySet().stream()
        .map(entry -> toWebVitalTrendPoint(entry.getValue()))
        .sorted(Comparator.comparing(MonitorWebVitalTrendPointVo::getBucket)
            .thenComparing(MonitorWebVitalTrendPointVo::getMetricName))
        .toList();
  }

  @Override
  public List<MonitorRequestPerformanceTrendPointVo> getRequestPerformanceTrend(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);

    Map<String, RequestBucketMetrics> buckets = new LinkedHashMap<>();
    List<MonitorEvent> events = eventMapper.selectRequestPerformanceEvents(
        query.getProjectId(),
        query.getStartTime(),
        query.getEndTime()
    );

    for (MonitorEvent event : events) {
      if (event.getDuration() == null || event.getDuration() < 0) {
        continue;
      }

      String bucket = formatBucket(query, event.getOccurredAt());
      buckets.computeIfAbsent(bucket, ignored -> new RequestBucketMetrics(bucket))
          .add(event.getDuration().doubleValue(), isErrorStatus(event.getRequestStatus()));
    }

    return buckets.values().stream()
        .map(this::toRequestPerformanceTrendPoint)
        .sorted(Comparator.comparing(MonitorRequestPerformanceTrendPointVo::getBucket))
        .toList();
  }

  @Override
  public List<MonitorSlowRequestVo> getSlowRequests(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);

    Map<String, RequestEndpointMetrics> endpoints = new LinkedHashMap<>();
    List<MonitorEvent> events = eventMapper.selectRequestPerformanceEvents(
        query.getProjectId(),
        query.getStartTime(),
        query.getEndTime()
    );

    for (MonitorEvent event : events) {
      if (event.getDuration() == null || event.getDuration() < 0 || event.getUrl() == null || event.getUrl().isBlank()) {
        continue;
      }

      String method = event.getRequestMethod() == null || event.getRequestMethod().isBlank() ? "GET" : event.getRequestMethod();
      String transport = event.getTransport() == null || event.getTransport().isBlank() ? "unknown" : event.getTransport();
      String key = method + "|" + transport + "|" + event.getUrl();
      endpoints.computeIfAbsent(key, ignored -> new RequestEndpointMetrics(event.getUrl(), method, transport))
          .add(event.getDuration().doubleValue(), isErrorStatus(event.getRequestStatus()));
    }

    return endpoints.values().stream()
        .map(this::toSlowRequest)
        .sorted(Comparator.comparing(MonitorSlowRequestVo::getP75Duration).reversed()
            .thenComparing(MonitorSlowRequestVo::getAvgDuration).reversed())
        .limit(resolveLimit(query))
        .toList();
  }

  @Override
  public MonitorTraceOverviewVo getTraceOverview(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    List<TraceSummaryAccumulator> traces = buildTraceAccumulators(query);

    MonitorTraceOverviewVo vo = new MonitorTraceOverviewVo();
    vo.setTotalTraces(traces.size());
    vo.setErrorTraces(traces.stream().filter(trace -> trace.errorCount() > 0).count());
    vo.setSlowTraces(traces.stream().filter(trace -> trace.duration() >= TRACE_SLOW_THRESHOLD_MS).count());
    return vo;
  }

  @Override
  public List<MonitorTraceSummaryVo> getTraces(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    return buildTraceAccumulators(query).stream()
        .sorted(Comparator.comparingLong(TraceSummaryAccumulator::duration).reversed()
            .thenComparing(TraceSummaryAccumulator::lastSeenAt).reversed())
        .skip(resolveOffset(query))
        .limit(resolvePageSize(query))
        .map(this::toTraceSummary)
        .toList();
  }

  @Override
  public MonitorTraceDetailVo getTraceDetail(String traceId, MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    String normalizedTraceId = requireText(traceId, "monitor.errors.traceIdRequired");
    List<MonitorEvent> events = loadDashboardEvents(query).stream()
        .filter(event -> normalizedTraceId.equals(event.getTraceId()))
        .sorted(Comparator.comparing(MonitorEvent::getOccurredAt)
            .thenComparing(MonitorEvent::getId, Comparator.nullsLast(Long::compareTo)))
        .toList();

    if (events.isEmpty()) {
      throw new ServiceException(404, "monitor.errors.traceNotFound");
    }

    TraceSummaryAccumulator summary = new TraceSummaryAccumulator(normalizedTraceId);
    events.forEach(summary::add);

    MonitorTraceDetailVo vo = new MonitorTraceDetailVo();
    copyTraceSummary(vo, summary);
    vo.setEvents(events.stream().map(this::toTraceTimelineEvent).toList());
    return vo;
  }

  @Override
  public List<MonitorTrendPointVo> getTraceTrend(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    Map<String, TraceTrendAccumulator> buckets = new LinkedHashMap<>();

    for (TraceSummaryAccumulator trace : buildTraceAccumulators(query)) {
      String bucket = formatBucket(query, trace.startedAt());
      buckets.computeIfAbsent(bucket, TraceTrendAccumulator::new).add(trace.errorCount() > 0);
    }

    return buckets.values().stream()
        .sorted(Comparator.comparing(TraceTrendAccumulator::bucket))
        .map(this::toTraceTrendPoint)
        .toList();
  }

  @Override
  public List<MonitorPageAnalyticsRowVo> getPageAnalytics(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    Map<String, PageAnalyticsAccumulator> pages = buildPageAnalyticsAccumulators(query);

    return pages.values().stream()
        .sorted(Comparator.comparingLong(PageAnalyticsAccumulator::pv).reversed()
            .thenComparing(PageAnalyticsAccumulator::errorCount, Comparator.reverseOrder())
            .thenComparing(PageAnalyticsAccumulator::averageDwell, Comparator.reverseOrder()))
        .skip(resolveOffset(query))
        .limit(resolvePageSize(query))
        .map(this::toPageAnalyticsRow)
        .toList();
  }

  @Override
  public List<MonitorPageTrendPointVo> getPageAnalyticsTrend(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    String normalizedUrl = requireText(query.getUrl(), "monitor.errors.urlRequired");
    Map<String, PageTrendAccumulator> buckets = new LinkedHashMap<>();

    for (MonitorEvent event : loadDashboardEvents(query)) {
      if (!normalizedUrl.equals(resolvePageContextUrl(event))) {
        continue;
      }
      String bucket = formatBucket(query, event.getOccurredAt());
      buckets.computeIfAbsent(bucket, PageTrendAccumulator::new).add(event);
    }

    return buckets.values().stream()
        .sorted(Comparator.comparing(PageTrendAccumulator::bucket))
        .map(this::toPageTrendPoint)
        .toList();
  }

  @Override
  public List<MonitorDwellDistributionBucketVo> getPageDwellDistribution(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    String normalizedUrl = requireText(query.getUrl(), "monitor.errors.urlRequired");

    long shortCount = 0L;
    long mediumCount = 0L;
    long longCount = 0L;

    for (MonitorEvent event : loadDashboardEvents(query)) {
      if (!normalizedUrl.equals(resolvePageContextUrl(event))
          || !"page_dwell".equals(event.getEventType())
          || event.getDuration() == null
          || event.getDuration() < 0) {
        continue;
      }

      if (event.getDuration() < DWELL_SHORT_THRESHOLD_MS) {
        shortCount += 1;
      } else if (event.getDuration() < DWELL_MEDIUM_THRESHOLD_MS) {
        mediumCount += 1;
      } else {
        longCount += 1;
      }
    }

    return List.of(
        toDwellBucket("0-15s", shortCount),
        toDwellBucket("15-60s", mediumCount),
        toDwellBucket("60s+", longCount)
    );
  }

  @Override
  public List<MonitorHotspotRowVo> getHotspots(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    return buildHotspotAccumulators(query).values().stream()
        .sorted(Comparator.comparingLong(HotspotAccumulator::count).reversed()
            .thenComparing(HotspotAccumulator::lastOccurredAt).reversed())
        .skip(resolveOffset(query))
        .limit(resolvePageSize(query))
        .map(this::toHotspotRow)
        .toList();
  }

  @Override
  public List<MonitorHotspotTrendPointVo> getHotspotTrend(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    String normalizedUrl = requireText(query.getUrl(), "monitor.errors.urlRequired");
    String normalizedSelector = requireText(query.getSelector(), "monitor.errors.selectorRequired");
    String normalizedEventType = requireText(query.getEventType(), "monitor.errors.eventTypeRequired");
    Map<String, HotspotTrendAccumulator> buckets = new LinkedHashMap<>();

    for (MonitorEvent event : loadDashboardEvents(query)) {
      if (!matchesHotspotEvent(event, normalizedEventType, normalizedUrl, normalizedSelector)) {
        continue;
      }
      String bucket = formatBucket(query, event.getOccurredAt());
      buckets.computeIfAbsent(bucket, HotspotTrendAccumulator::new).increment();
    }

    return buckets.values().stream()
        .sorted(Comparator.comparing(HotspotTrendAccumulator::bucket))
        .map(this::toHotspotTrendPoint)
        .toList();
  }

  @Override
  public List<MonitorEvent> getHotspotSamples(MonitorDashboardQuery query) {
    normalizeDashboardQuery(query);
    String normalizedUrl = requireText(query.getUrl(), "monitor.errors.urlRequired");
    String normalizedSelector = requireText(query.getSelector(), "monitor.errors.selectorRequired");
    String normalizedEventType = requireText(query.getEventType(), "monitor.errors.eventTypeRequired");

    return loadDashboardEvents(query).stream()
        .filter(event -> matchesHotspotEvent(event, normalizedEventType, normalizedUrl, normalizedSelector))
        .sorted(Comparator.comparing(MonitorEvent::getOccurredAt).reversed()
            .thenComparing(MonitorEvent::getId, Comparator.nullsLast(Long::compareTo)).reversed())
        .skip(resolveOffset(query))
        .limit(resolvePageSize(query))
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
    if (query.getLimit() == null || query.getLimit() <= 0) {
      query.setLimit(20);
    }
    if (query.getPageNum() == null || query.getPageNum() <= 0) {
      query.setPageNum(1);
    }
    if (query.getPageSize() == null || query.getPageSize() <= 0) {
      query.setPageSize(Math.min(query.getLimit(), 100));
    }
  }

  private long resolveLimit(MonitorDashboardQuery query) {
    return Math.min(Math.max(query.getLimit(), 1), 100);
  }

  private long resolvePageSize(MonitorDashboardQuery query) {
    return Math.min(Math.max(query.getPageSize(), 1), 100);
  }

  private long resolveOffset(MonitorDashboardQuery query) {
    return (long) (query.getPageNum() - 1) * resolvePageSize(query);
  }

  private List<MonitorEvent> loadDashboardEvents(MonitorDashboardQuery query) {
    MonitorEventQuery eventQuery = new MonitorEventQuery();
    eventQuery.setProjectId(query.getProjectId());
    eventQuery.setDist(query.getDist());
    eventQuery.setStartTime(query.getStartTime());
    eventQuery.setEndTime(query.getEndTime());
    eventQuery.setEnvironment(query.getEnvironment());
    eventQuery.setRelease(query.getRelease());
    eventQuery.setTraceId(query.getTraceId());
    return eventMapper.selectEventList(eventQuery);
  }

  private List<TraceSummaryAccumulator> buildTraceAccumulators(MonitorDashboardQuery query) {
    Map<String, TraceSummaryAccumulator> traces = new LinkedHashMap<>();
    for (MonitorEvent event : loadDashboardEvents(query)) {
      if (!matchesTraceEvent(event, query)) {
        continue;
      }
      traces.computeIfAbsent(event.getTraceId(), TraceSummaryAccumulator::new).add(event);
    }
    return new ArrayList<>(traces.values());
  }

  private Map<String, PageAnalyticsAccumulator> buildPageAnalyticsAccumulators(MonitorDashboardQuery query) {
    Map<String, PageAnalyticsAccumulator> pages = new LinkedHashMap<>();
    for (MonitorEvent event : loadDashboardEvents(query)) {
      String pageUrl = resolvePageContextUrl(event);
      if (pageUrl == null || pageUrl.isBlank()) {
        continue;
      }
      if (query.getUrl() != null && !query.getUrl().isBlank() && !query.getUrl().equals(pageUrl)) {
        continue;
      }
      pages.computeIfAbsent(pageUrl, PageAnalyticsAccumulator::new).add(event);
    }
    return pages;
  }

  private Map<String, HotspotAccumulator> buildHotspotAccumulators(MonitorDashboardQuery query) {
    Map<String, HotspotAccumulator> hotspots = new LinkedHashMap<>();
    for (MonitorEvent event : loadDashboardEvents(query)) {
      if (!isHotspotCandidate(event, query)) {
        continue;
      }
      String key = event.getEventType() + "|" + event.getUrl() + "|" + event.getSelector();
      hotspots.computeIfAbsent(key, ignored -> new HotspotAccumulator(event)).add(event);
    }
    return hotspots;
  }

  private boolean matchesTraceEvent(MonitorEvent event, MonitorDashboardQuery query) {
    if (event.getTraceId() == null || event.getTraceId().isBlank()) {
      return false;
    }
    if (query.getTraceId() != null && !query.getTraceId().isBlank() && !query.getTraceId().equals(event.getTraceId())) {
      return false;
    }
    if (query.getUrl() != null && !query.getUrl().isBlank() && !query.getUrl().equals(event.getUrl())) {
      return false;
    }
    return true;
  }

  private boolean isHotspotCandidate(MonitorEvent event, MonitorDashboardQuery query) {
    if (event.getUrl() == null || event.getUrl().isBlank()) {
      return false;
    }
    if (event.getSelector() == null || event.getSelector().isBlank()) {
      return false;
    }
    if (!"click".equals(event.getEventType()) && !"exposure".equals(event.getEventType())) {
      return false;
    }
    if ("exposure".equals(event.getEventType()) && !"enter".equalsIgnoreCase(event.getEventName())) {
      return false;
    }
    if (query.getEventType() != null && !query.getEventType().isBlank() && !query.getEventType().equals(event.getEventType())) {
      return false;
    }
    if (query.getUrl() != null && !query.getUrl().isBlank() && !query.getUrl().equals(event.getUrl())) {
      return false;
    }
    if (query.getSelector() != null && !query.getSelector().isBlank() && !query.getSelector().equals(event.getSelector())) {
      return false;
    }
    return true;
  }

  private boolean matchesHotspotEvent(
      MonitorEvent event,
      String eventType,
      String url,
      String selector
  ) {
    return eventType.equals(event.getEventType())
        && url.equals(event.getUrl())
        && selector.equals(event.getSelector())
        && (!"exposure".equals(eventType) || "enter".equalsIgnoreCase(event.getEventName()));
  }

  private MonitorTraceSummaryVo toTraceSummary(TraceSummaryAccumulator trace) {
    MonitorTraceSummaryVo vo = new MonitorTraceSummaryVo();
    copyTraceSummary(vo, trace);
    return vo;
  }

  private void copyTraceSummary(MonitorTraceSummaryVo target, TraceSummaryAccumulator source) {
    target.setTraceId(source.traceId());
    target.setStartedAt(source.startedAt());
    target.setLastSeenAt(source.lastSeenAt());
    target.setDuration(source.duration());
    target.setEventCount(source.eventCount());
    target.setErrorCount(source.errorCount());
    target.setUrl(source.url());
    target.setSessionId(source.sessionId());
  }

  private MonitorTraceTimelineEventVo toTraceTimelineEvent(MonitorEvent event) {
    MonitorTraceTimelineEventVo vo = new MonitorTraceTimelineEventVo();
    vo.setId(event.getId());
    vo.setEventId(event.getEventId());
    vo.setIssueId(event.getIssueId());
    vo.setReplayId(event.getReplayId());
    vo.setSpanId(event.getSpanId());
    vo.setEventType(event.getEventType());
    vo.setMessage(event.getMessage());
    vo.setUrl(event.getUrl());
    vo.setDuration(event.getDuration());
    vo.setStatus(event.getRequestStatus());
    vo.setOccurredAt(event.getOccurredAt());
    return vo;
  }

  private MonitorTrendPointVo toTraceTrendPoint(TraceTrendAccumulator metrics) {
    MonitorTrendPointVo vo = new MonitorTrendPointVo();
    vo.setBucket(metrics.bucket());
    vo.setTotalCount(metrics.totalCount());
    vo.setErrorCount(metrics.errorCount());
    vo.setPageViewCount(0L);
    return vo;
  }

  private MonitorPageAnalyticsRowVo toPageAnalyticsRow(PageAnalyticsAccumulator metrics) {
    MonitorPageAnalyticsRowVo vo = new MonitorPageAnalyticsRowVo();
    vo.setUrl(metrics.url());
    vo.setPv(metrics.pv());
    vo.setErrorCount(metrics.errorCount());
    vo.setUniqueSessions(metrics.uniqueSessions());
    vo.setUniqueUsers(metrics.uniqueUsers());
    vo.setAvgDwellDuration(round(metrics.averageDwell()));
    vo.setP75DwellDuration(round(metrics.p75Dwell()));
    return vo;
  }

  private MonitorPageTrendPointVo toPageTrendPoint(PageTrendAccumulator metrics) {
    MonitorPageTrendPointVo vo = new MonitorPageTrendPointVo();
    vo.setBucket(metrics.bucket());
    vo.setPv(metrics.pv());
    vo.setErrorCount(metrics.errorCount());
    vo.setAvgDwellDuration(round(metrics.averageDwell()));
    return vo;
  }

  private MonitorDwellDistributionBucketVo toDwellBucket(String bucket, long count) {
    MonitorDwellDistributionBucketVo vo = new MonitorDwellDistributionBucketVo();
    vo.setBucket(bucket);
    vo.setCount(count);
    return vo;
  }

  private MonitorHotspotRowVo toHotspotRow(HotspotAccumulator metrics) {
    MonitorHotspotRowVo vo = new MonitorHotspotRowVo();
    vo.setEventType(metrics.eventType());
    vo.setUrl(metrics.url());
    vo.setSelector(metrics.selector());
    vo.setLabel(metrics.label());
    vo.setCount(metrics.count());
    vo.setUniqueSessions(metrics.uniqueSessions());
    vo.setLastOccurredAt(metrics.lastOccurredAt());
    return vo;
  }

  private MonitorHotspotTrendPointVo toHotspotTrendPoint(HotspotTrendAccumulator metrics) {
    MonitorHotspotTrendPointVo vo = new MonitorHotspotTrendPointVo();
    vo.setBucket(metrics.bucket());
    vo.setCount(metrics.count());
    return vo;
  }

  private String requireText(String value, String message) {
    if (value == null || value.isBlank()) {
      throw new ServiceException(400, message);
    }
    return value;
  }

  private String resolvePageContextUrl(MonitorEvent event) {
    JsonNode basePayload = parsePayload(event.getBaseJson());
    String baseUrl = text(basePayload, "url");
    if (baseUrl != null && !baseUrl.isBlank()) {
      return baseUrl;
    }
    return event.getUrl();
  }

  private void collectNavigationVitals(
      MonitorDashboardQuery query,
      Map<String, BucketMetrics> buckets,
      MonitorEvent event
  ) {
    JsonNode payload = parsePayload(event.getPayloadJson());
    if (payload == null || !"navigation".equals(text(payload, "performanceType"))) {
      return;
    }

    JsonNode metrics = payload.get("metrics");
    if (metrics == null || metrics.isNull()) {
      return;
    }

    addMetricSample(query, buckets, event.getOccurredAt(), "FCP", "hard", number(metrics, "firstContentfulPaint"));
    addMetricSample(query, buckets, event.getOccurredAt(), "TTFB", "hard", number(metrics, "ttfb"));
  }

  private void collectWebVitalSamples(
      MonitorDashboardQuery query,
      Map<String, BucketMetrics> buckets,
      MonitorEvent event
  ) {
    JsonNode payload = parsePayload(event.getPayloadJson());
    if (payload == null || !"web_vital".equals(text(payload, "performanceType"))) {
      return;
    }

    String metricName = text(payload, "metricName");
    String navigationMode = Boolean.TRUE.equals(bool(payload, "softNavigation")) ? "soft" : "hard";
    Double value = number(payload, "value");
    if (metricName == null || value == null) {
      return;
    }

    addMetricSample(query, buckets, event.getOccurredAt(), metricName, navigationMode, value);
  }

  private void addMetricSample(
      MonitorDashboardQuery query,
      Map<String, BucketMetrics> buckets,
      LocalDateTime occurredAt,
      String metricName,
      String navigationMode,
      Double value
  ) {
    if (metricName == null || navigationMode == null || value == null || value < 0) {
      return;
    }

    String bucket = formatBucket(query, occurredAt);
    String key = bucket + "|" + navigationMode + "|" + metricName;
    buckets.computeIfAbsent(key, ignored -> new BucketMetrics(bucket, metricName, navigationMode)).add(value);
  }

  private String formatBucket(MonitorDashboardQuery query, LocalDateTime occurredAt) {
    if ("day".equalsIgnoreCase(query.getGranularity())) {
      return occurredAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    }
    return occurredAt.withMinute(0).withSecond(0).withNano(0)
        .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:00:00"));
  }

  private MonitorWebVitalTrendPointVo toWebVitalTrendPoint(BucketMetrics bucketMetrics) {
    MonitorWebVitalTrendPointVo vo = new MonitorWebVitalTrendPointVo();
    vo.setBucket(bucketMetrics.bucket());
    vo.setMetricName(bucketMetrics.metricName());
    vo.setNavigationMode(bucketMetrics.navigationMode());
    vo.setAvgValue(round(bucketMetrics.average()));
    vo.setP75Value(round(bucketMetrics.p75()));
    vo.setSampleCount(bucketMetrics.samples().size());
    vo.setGoodCount(bucketMetrics.countByRating("good"));
    vo.setNeedsImprovementCount(bucketMetrics.countByRating("needs-improvement"));
    vo.setPoorCount(bucketMetrics.countByRating("poor"));
    return vo;
  }

  private JsonNode parsePayload(String payloadJson) {
    if (payloadJson == null || payloadJson.isBlank()) {
      return null;
    }
    try {
      return objectMapper.readTree(payloadJson);
    } catch (Exception ignored) {
      return null;
    }
  }

  private String text(JsonNode node, String field) {
    if (node == null || !node.has(field) || node.get(field).isNull()) {
      return null;
    }
    JsonNode value = node.get(field);
    return value.isTextual() ? value.asText() : value.toString();
  }

  private Double number(JsonNode node, String field) {
    if (node == null || !node.has(field) || node.get(field).isNull()) {
      return null;
    }
    JsonNode value = node.get(field);
    if (!value.isNumber()) {
      return null;
    }
    return value.asDouble();
  }

  private Boolean bool(JsonNode node, String field) {
    if (node == null || !node.has(field) || node.get(field).isNull()) {
      return null;
    }
    return node.get(field).asBoolean();
  }

  private double round(double value) {
    return Math.round(value * 100D) / 100D;
  }

  private boolean isErrorStatus(Integer status) {
    return status != null && status >= 400;
  }

  private static String rate(String metricName, double value) {
    return switch (metricName) {
      case "CLS" -> value <= 0.1D ? "good" : value <= 0.25D ? "needs-improvement" : "poor";
      case "LCP" -> value <= 2500D ? "good" : value <= 4000D ? "needs-improvement" : "poor";
      case "INP" -> value <= 200D ? "good" : value <= 500D ? "needs-improvement" : "poor";
      case "FCP" -> value <= 1800D ? "good" : value <= 3000D ? "needs-improvement" : "poor";
      case "TTFB" -> value <= 800D ? "good" : value <= 1800D ? "needs-improvement" : "poor";
      default -> "needs-improvement";
    };
  }

  private record BucketMetrics(String bucket, String metricName, String navigationMode, List<Double> samples) {
    BucketMetrics(String bucket, String metricName, String navigationMode) {
      this(bucket, metricName, navigationMode, new ArrayList<>());
    }

    void add(double value) {
      samples.add(value);
    }

    double average() {
      return samples.stream().mapToDouble(Double::doubleValue).average().orElse(0D);
    }

    double p75() {
      if (samples.isEmpty()) {
        return 0D;
      }
      List<Double> sorted = samples.stream().sorted().toList();
      int index = (int) Math.ceil(sorted.size() * 0.75D) - 1;
      return sorted.get(Math.max(0, Math.min(index, sorted.size() - 1)));
    }

    long countByRating(String rating) {
      return samples.stream()
          .filter(value -> rating.equals(MonitorDashboardServiceImpl.rate(metricName, value)))
          .count();
    }
  }

  private MonitorRequestPerformanceTrendPointVo toRequestPerformanceTrendPoint(RequestBucketMetrics metrics) {
    MonitorRequestPerformanceTrendPointVo vo = new MonitorRequestPerformanceTrendPointVo();
    vo.setBucket(metrics.bucket());
    vo.setAvgDuration(round(metrics.average()));
    vo.setP75Duration(round(metrics.p75()));
    vo.setMaxDuration(round(metrics.max()));
    vo.setSampleCount(metrics.samples().size());
    vo.setErrorCount(metrics.errorCount());
    return vo;
  }

  private MonitorSlowRequestVo toSlowRequest(RequestEndpointMetrics metrics) {
    MonitorSlowRequestVo vo = new MonitorSlowRequestVo();
    vo.setUrl(metrics.url());
    vo.setMethod(metrics.method());
    vo.setTransport(metrics.transport());
    vo.setAvgDuration(round(metrics.average()));
    vo.setP75Duration(round(metrics.p75()));
    vo.setMaxDuration(round(metrics.max()));
    vo.setSampleCount(metrics.samples().size());
    vo.setErrorCount(metrics.errorCount());
    return vo;
  }

  private static final class RequestBucketMetrics {
    private final String bucket;
    private final List<Double> samples = new ArrayList<>();
    private long errorCount;

    private RequestBucketMetrics(String bucket) {
      this.bucket = bucket;
    }

    String bucket() {
      return bucket;
    }

    List<Double> samples() {
      return samples;
    }

    long errorCount() {
      return errorCount;
    }

    void add(double value, boolean error) {
      samples.add(value);
      if (error) {
        errorCount += 1;
      }
    }

    double average() {
      return samples.stream().mapToDouble(Double::doubleValue).average().orElse(0D);
    }

    double p75() {
      if (samples.isEmpty()) {
        return 0D;
      }
      List<Double> sorted = samples.stream().sorted().toList();
      int index = (int) Math.ceil(sorted.size() * 0.75D) - 1;
      return sorted.get(Math.max(0, Math.min(index, sorted.size() - 1)));
    }

    double max() {
      return samples.stream().mapToDouble(Double::doubleValue).max().orElse(0D);
    }
  }

  private static final class RequestEndpointMetrics {
    private final String url;
    private final String method;
    private final String transport;
    private final List<Double> samples = new ArrayList<>();
    private long errorCount;

    private RequestEndpointMetrics(String url, String method, String transport) {
      this.url = url;
      this.method = method;
      this.transport = transport;
    }

    String url() {
      return url;
    }

    String method() {
      return method;
    }

    String transport() {
      return transport;
    }

    List<Double> samples() {
      return samples;
    }

    long errorCount() {
      return errorCount;
    }

    void add(double value, boolean error) {
      samples.add(value);
      if (error) {
        errorCount += 1;
      }
    }

    double average() {
      return samples.stream().mapToDouble(Double::doubleValue).average().orElse(0D);
    }

    double p75() {
      if (samples.isEmpty()) {
        return 0D;
      }
      List<Double> sorted = samples.stream().sorted().toList();
      int index = (int) Math.ceil(sorted.size() * 0.75D) - 1;
      return sorted.get(Math.max(0, Math.min(index, sorted.size() - 1)));
    }

    double max() {
      return samples.stream().mapToDouble(Double::doubleValue).max().orElse(0D);
    }
  }

  private static final class TraceSummaryAccumulator {
    private final String traceId;
    private LocalDateTime startedAt;
    private LocalDateTime lastSeenAt;
    private long eventCount;
    private long errorCount;
    private String url;
    private String sessionId;

    private TraceSummaryAccumulator(String traceId) {
      this.traceId = traceId;
    }

    void add(MonitorEvent event) {
      if (startedAt == null || event.getOccurredAt().isBefore(startedAt)) {
        startedAt = event.getOccurredAt();
      }
      if (lastSeenAt == null || event.getOccurredAt().isAfter(lastSeenAt)) {
        lastSeenAt = event.getOccurredAt();
      }
      if (url == null || url.isBlank()) {
        url = event.getUrl();
      }
      if (sessionId == null || sessionId.isBlank()) {
        sessionId = event.getSessionId();
      }
      eventCount += 1;
      if (event.getIssueType() != null && !event.getIssueType().isBlank()) {
        errorCount += 1;
      }
    }

    String traceId() {
      return traceId;
    }

    LocalDateTime startedAt() {
      return startedAt;
    }

    LocalDateTime lastSeenAt() {
      return lastSeenAt;
    }

    long duration() {
      if (startedAt == null || lastSeenAt == null) {
        return 0L;
      }
      return ChronoUnit.MILLIS.between(startedAt, lastSeenAt);
    }

    long eventCount() {
      return eventCount;
    }

    long errorCount() {
      return errorCount;
    }

    String url() {
      return url;
    }

    String sessionId() {
      return sessionId;
    }
  }

  private static final class TraceTrendAccumulator {
    private final String bucket;
    private long totalCount;
    private long errorCount;

    private TraceTrendAccumulator(String bucket) {
      this.bucket = bucket;
    }

    String bucket() {
      return bucket;
    }

    long totalCount() {
      return totalCount;
    }

    long errorCount() {
      return errorCount;
    }

    void add(boolean error) {
      totalCount += 1;
      if (error) {
        errorCount += 1;
      }
    }
  }

  private static final class PageAnalyticsAccumulator {
    private final String url;
    private long pv;
    private long errorCount;
    private final Set<String> sessions = new HashSet<>();
    private final Set<String> users = new HashSet<>();
    private final List<Long> dwellDurations = new ArrayList<>();

    private PageAnalyticsAccumulator(String url) {
      this.url = url;
    }

    void add(MonitorEvent event) {
      if ("page_view".equals(event.getEventType())) {
        pv += 1;
      }
      if (event.getIssueType() != null && !event.getIssueType().isBlank()) {
        errorCount += 1;
      }
      if (event.getSessionId() != null && !event.getSessionId().isBlank()) {
        sessions.add(event.getSessionId());
      }
      if (event.getUserId() != null && !event.getUserId().isBlank()) {
        users.add(event.getUserId());
      }
      if ("page_dwell".equals(event.getEventType()) && event.getDuration() != null && event.getDuration() >= 0) {
        dwellDurations.add(event.getDuration());
      }
    }

    String url() {
      return url;
    }

    long pv() {
      return pv;
    }

    long errorCount() {
      return errorCount;
    }

    long uniqueSessions() {
      return sessions.size();
    }

    long uniqueUsers() {
      return users.size();
    }

    double averageDwell() {
      return dwellDurations.stream().mapToLong(Long::longValue).average().orElse(0D);
    }

    double p75Dwell() {
      return percentile(dwellDurations, 0.75D);
    }
  }

  private static final class PageTrendAccumulator {
    private final String bucket;
    private long pv;
    private long errorCount;
    private final List<Long> dwellDurations = new ArrayList<>();

    private PageTrendAccumulator(String bucket) {
      this.bucket = bucket;
    }

    String bucket() {
      return bucket;
    }

    long pv() {
      return pv;
    }

    long errorCount() {
      return errorCount;
    }

    void add(MonitorEvent event) {
      if ("page_view".equals(event.getEventType())) {
        pv += 1;
      }
      if (event.getIssueType() != null && !event.getIssueType().isBlank()) {
        errorCount += 1;
      }
      if ("page_dwell".equals(event.getEventType()) && event.getDuration() != null && event.getDuration() >= 0) {
        dwellDurations.add(event.getDuration());
      }
    }

    double averageDwell() {
      return dwellDurations.stream().mapToLong(Long::longValue).average().orElse(0D);
    }
  }

  private static final class HotspotAccumulator {
    private final String eventType;
    private final String url;
    private final String selector;
    private final String label;
    private final Set<String> sessions = new HashSet<>();
    private long count;
    private LocalDateTime lastOccurredAt;

    private HotspotAccumulator(MonitorEvent seed) {
      this.eventType = seed.getEventType();
      this.url = seed.getUrl();
      this.selector = seed.getSelector();
      this.label = seed.getMessage() == null || seed.getMessage().isBlank() ? seed.getSelector() : seed.getMessage();
    }

    void add(MonitorEvent event) {
      count += 1;
      if (event.getSessionId() != null && !event.getSessionId().isBlank()) {
        sessions.add(event.getSessionId());
      }
      if (lastOccurredAt == null || event.getOccurredAt().isAfter(lastOccurredAt)) {
        lastOccurredAt = event.getOccurredAt();
      }
    }

    String eventType() {
      return eventType;
    }

    String url() {
      return url;
    }

    String selector() {
      return selector;
    }

    String label() {
      return label;
    }

    long count() {
      return count;
    }

    long uniqueSessions() {
      return sessions.size();
    }

    LocalDateTime lastOccurredAt() {
      return lastOccurredAt;
    }
  }

  private static final class HotspotTrendAccumulator {
    private final String bucket;
    private long count;

    private HotspotTrendAccumulator(String bucket) {
      this.bucket = bucket;
    }

    String bucket() {
      return bucket;
    }

    long count() {
      return count;
    }

    void increment() {
      count += 1;
    }
  }

  private static double percentile(List<Long> values, double percentile) {
    if (values.isEmpty()) {
      return 0D;
    }
    List<Long> sorted = values.stream().sorted().toList();
    int index = (int) Math.ceil(sorted.size() * percentile) - 1;
    return sorted.get(Math.max(0, Math.min(index, sorted.size() - 1)));
  }
}
