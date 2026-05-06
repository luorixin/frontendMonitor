package com.monitor.system.service.monitor.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.vo.MonitorDashboardOverviewVo;
import com.monitor.system.domain.monitor.vo.MonitorEventTypeCountVo;
import com.monitor.system.domain.monitor.vo.MonitorIssueVo;
import com.monitor.system.domain.monitor.vo.MonitorPageStatsVo;
import com.monitor.system.domain.monitor.vo.MonitorRequestPerformanceTrendPointVo;
import com.monitor.system.domain.monitor.vo.MonitorSlowRequestVo;
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
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class MonitorDashboardServiceImpl implements IMonitorDashboardService {

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
        .limit(10)
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
}
