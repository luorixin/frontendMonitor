package com.monitor.system.service.monitor.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.MonitorIssue;
import com.monitor.system.domain.monitor.MonitorProject;
import com.monitor.system.domain.monitor.dto.MonitorCollectBaseDto;
import com.monitor.system.domain.monitor.dto.MonitorCollectRequest;
import com.monitor.system.mapper.monitor.MonitorAggregateMapper;
import com.monitor.system.mapper.monitor.MonitorEventMapper;
import com.monitor.system.mapper.monitor.MonitorIssueMapper;
import com.monitor.system.mapper.monitor.MonitorProjectMapper;
import com.monitor.system.service.monitor.IMonitorCollectService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonitorCollectServiceImpl implements IMonitorCollectService {

  private static final Set<String> ISSUE_TYPES = Set.of(
      "js_error",
      "promise_rejection",
      "console_error",
      "resource_error",
      "request_error"
  );

  private final MonitorProjectMapper projectMapper;
  private final MonitorIssueMapper issueMapper;
  private final MonitorEventMapper eventMapper;
  private final MonitorAggregateMapper aggregateMapper;
  private final ObjectMapper objectMapper;
  private final int maxEventsPerRequest;
  private final int maxPayloadBytes;

  public MonitorCollectServiceImpl(
      MonitorProjectMapper projectMapper,
      MonitorIssueMapper issueMapper,
      MonitorEventMapper eventMapper,
      MonitorAggregateMapper aggregateMapper,
      ObjectMapper objectMapper,
      @Value("${app.monitor.collect.max-events-per-request:100}") int maxEventsPerRequest,
      @Value("${app.monitor.collect.max-payload-bytes:262144}") int maxPayloadBytes
  ) {
    this.projectMapper = projectMapper;
    this.issueMapper = issueMapper;
    this.eventMapper = eventMapper;
    this.aggregateMapper = aggregateMapper;
    this.objectMapper = objectMapper;
    this.maxEventsPerRequest = Math.max(1, maxEventsPerRequest);
    this.maxPayloadBytes = Math.max(1024, maxPayloadBytes);
  }

  @Override
  @Transactional
  public int collect(String projectKey, MonitorCollectRequest request, String origin) {
    MonitorProject project = requireCollectProject(projectKey);
    validateCollectRequest(project, request, origin);
    String baseJson = writeJson(request.getBase());
    int received = 0;

    for (JsonNode node : request.getEvents()) {
      MonitorEvent event = buildEvent(project, request.getBase(), node, baseJson);
      if (event == null) {
        continue;
      }

      attachIssue(project, event, node);
      eventMapper.insertEvent(event);
      upsertAggregates(event);
      received += 1;
    }

    return received;
  }

  @Override
  public int collectFromImage(String projectKey, String data) {
    if (data == null || data.isBlank()) {
      return 0;
    }
    try {
      MonitorCollectRequest request = objectMapper.readValue(data, MonitorCollectRequest.class);
      return collect(projectKey, request, null);
    } catch (JsonProcessingException e) {
      return 0;
    }
  }

  private MonitorProject requireCollectProject(String projectKey) {
    MonitorProject project = projectMapper.selectProjectByKey(projectKey);
    if (project == null) {
      throw new ServiceException(404, "monitor.errors.projectNotFound");
    }
    if (project.getStatus() == null || project.getStatus() != 1) {
      throw new ServiceException(403, "monitor.errors.projectDisabled");
    }
    return project;
  }

  private void validateCollectRequest(
      MonitorProject project,
      MonitorCollectRequest request,
      String origin
  ) {
    if (request.getEvents().size() > maxEventsPerRequest) {
      throw new ServiceException(400, "monitor.errors.tooManyEvents");
    }
    if (writeJson(request).length() > maxPayloadBytes) {
      throw new ServiceException(400, "monitor.errors.payloadTooLarge");
    }
    if (!isOriginAllowed(project, origin)) {
      throw new ServiceException(403, "monitor.errors.originNotAllowed");
    }
  }

  private boolean isOriginAllowed(MonitorProject project, String origin) {
    if (origin == null || origin.isBlank()) {
      return true;
    }
    List<String> allowedOrigins = readAllowedOrigins(project.getAllowedOrigins());
    if (allowedOrigins.isEmpty()) {
      return true;
    }
    return allowedOrigins.contains("*") || allowedOrigins.contains(origin);
  }

  private List<String> readAllowedOrigins(String raw) {
    if (raw == null || raw.isBlank()) {
      return Collections.emptyList();
    }
    try {
      return objectMapper.readValue(
          raw,
          objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
      );
    } catch (JsonProcessingException e) {
      throw new ServiceException("monitor.errors.invalidAllowedOrigins");
    }
  }

  private MonitorEvent buildEvent(
      MonitorProject project,
      MonitorCollectBaseDto base,
      JsonNode node,
      String baseJson
  ) {
    String eventType = text(node, "type");
    if (eventType == null) {
      return null;
    }

    MonitorEvent event = new MonitorEvent();
    event.setProjectId(project.getId());
    event.setEventId(UUID.randomUUID().toString().replace("-", ""));
    event.setEventType(eventType);
    event.setIssueType(ISSUE_TYPES.contains(eventType) ? eventType : null);
    event.setOccurredAt(resolveOccurredAt(node, base));
    event.setAppName(base.getAppName());
    event.setAppVersion(base.getAppVersion());
    event.setEnvironment(base.getEnvironment());
    event.setRelease(base.getRelease());
    event.setDist(base.getDist());
    event.setUserId(base.getUserId());
    event.setDeviceId(base.getDeviceId());
    event.setSessionId(base.getSessionId());
    event.setPageId(base.getPageId());
    event.setReplayId(firstNonBlank(text(node, "replayId"), base.getReplayId()));
    event.setUrl(firstNonBlank(text(node, "url"), base.getUrl()));
    event.setTitle(base.getTitle());
    event.setMessage(resolveMessage(eventType, node));
    event.setSelector(text(node, "selector"));
    event.setResourceType(resolveResourceType(node));
    event.setRequestMethod(resolveRequestMethod(node));
    event.setRequestStatus(resolveInteger(node, "status"));
    event.setDuration(resolveLong(node, "duration"));
    event.setTransport(text(node, "transport"));
    event.setEventName(resolveEventName(eventType, node));
    event.setTagsJson(writeNullableJson(base.getTags()));
    event.setContextsJson(writeNullableJson(base.getContexts()));
    event.setBreadcrumbsJson(writeNullableJson(base.getBreadcrumbs()));
    event.setTraceId(text(node, "traceId"));
    event.setSpanId(text(node, "spanId"));
    event.setPayloadJson(writeJson(node));
    event.setBaseJson(baseJson);
    event.setFingerprint(buildFingerprint(eventType, node, event));
    return event;
  }

  private void attachIssue(MonitorProject project, MonitorEvent event, JsonNode node) {
    if (event.getIssueType() == null || event.getFingerprint() == null) {
      return;
    }

    MonitorIssue issue = issueMapper.selectIssueByFingerprint(project.getId(), event.getFingerprint());
    if (issue == null) {
      issue = new MonitorIssue();
      issue.setProjectId(project.getId());
      issue.setIssueType(event.getIssueType());
      issue.setFingerprint(event.getFingerprint());
      issue.setTitle(buildIssueTitle(event, node));
      issue.setFirstSeenAt(event.getOccurredAt());
      issue.setLastSeenAt(event.getOccurredAt());
      issue.setOccurrenceCount(1L);
      issue.setLatestEventId(event.getEventId());
      issue.setStatus("OPEN");
      issueMapper.insertIssue(issue);
    } else {
      issueMapper.updateIssueOccurrence(
          issue.getId(),
          buildIssueTitle(event, node),
          event.getOccurredAt(),
          event.getEventId()
      );
    }

    event.setIssueId(issue.getId());
  }

  private void upsertAggregates(MonitorEvent event) {
    LocalDateTime hourBucket = event.getOccurredAt().truncatedTo(ChronoUnit.HOURS);
    long errorCount = event.getIssueType() == null ? 0L : 1L;
    long pageViewCount = "page_view".equals(event.getEventType()) ? 1L : 0L;
    aggregateMapper.upsertHourAggregate(
        event.getProjectId(),
        hourBucket,
        event.getEventType(),
        1L,
        errorCount,
        pageViewCount
    );
    aggregateMapper.upsertDayAggregate(
        event.getProjectId(),
        event.getOccurredAt().toLocalDate(),
        event.getEventType(),
        1L,
        errorCount,
        pageViewCount
    );
  }

  private LocalDateTime resolveOccurredAt(JsonNode node, MonitorCollectBaseDto base) {
    Long timestamp = resolveLong(node, "timestamp");
    if (timestamp == null) {
      timestamp = base.getTimestamp();
    }
    if (timestamp == null) {
      return LocalDateTime.now();
    }
    long nowMillis = System.currentTimeMillis();
    if (timestamp <= 0 || timestamp > nowMillis + 86_400_000L) {
      return LocalDateTime.now();
    }
    return LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.systemDefault());
  }

  private String resolveMessage(String eventType, JsonNode node) {
    return switch (eventType) {
      case "js_error", "promise_rejection" -> text(node, "message");
      case "console_error" -> joinArray(node.get("args"));
      case "resource_error" -> text(node, "message");
      case "request_error" -> firstNonBlank(text(node, "errorMessage"), text(node, "message"));
      case "click", "exposure" -> text(node, "textPreview");
      case "custom" -> text(node, "eventName");
      case "performance" -> "web_vital".equals(text(node, "performanceType"))
          ? text(node, "metricName")
          : text(node, "performanceType");
      case "request_performance" -> text(node, "url");
      case "page_view", "route_change" -> firstNonBlank(text(node, "to"), text(node, "url"));
      default -> text(node, "message");
    };
  }

  private String resolveEventName(String eventType, JsonNode node) {
    if ("custom".equals(eventType)) {
      return text(node, "eventName");
    }
    if ("performance".equals(eventType)) {
      return "web_vital".equals(text(node, "performanceType"))
          ? text(node, "metricName")
          : text(node, "performanceType");
    }
    if ("exposure".equals(eventType)) {
      return text(node, "action");
    }
    return null;
  }

  private String resolveResourceType(JsonNode node) {
    String resourceType = text(node, "resourceType");
    if (resourceType != null) {
      return resourceType;
    }
    if ("web_vital".equals(text(node, "performanceType"))) {
      return text(node, "metricName");
    }
    return text(node, "performanceType");
  }

  private String resolveRequestMethod(JsonNode node) {
    return firstNonBlank(text(node, "method"), text(node, "requestMethod"));
  }

  private String buildFingerprint(String eventType, JsonNode node, MonitorEvent event) {
    if (!ISSUE_TYPES.contains(eventType)) {
      return null;
    }

    return switch (eventType) {
      case "js_error", "promise_rejection" -> String.join(
          "|",
          eventType,
          nullSafe(event.getMessage()),
          nullSafe(text(node, "source")),
          nullSafe(firstStackLine(text(node, "stack")))
      );
      case "console_error" -> String.join("|", eventType, nullSafe(joinArray(node.get("args"))));
      case "resource_error" -> String.join(
          "|",
          eventType,
          nullSafe(event.getResourceType()),
          nullSafe(event.getSelector()),
          nullSafe(event.getMessage())
      );
      case "request_error" -> String.join(
          "|",
          eventType,
          nullSafe(event.getRequestMethod()),
          nullSafe(event.getUrl()),
          String.valueOf(event.getRequestStatus())
      );
      default -> null;
    };
  }

  private String buildIssueTitle(MonitorEvent event, JsonNode node) {
    return switch (event.getIssueType()) {
      case "request_error" -> firstNonBlank(
          event.getRequestMethod() + " " + event.getUrl() + " (" + event.getRequestStatus() + ")",
          event.getMessage()
      );
      case "console_error" -> joinArray(node.get("args"));
      default -> firstNonBlank(event.getMessage(), event.getEventType());
    };
  }

  private String joinArray(JsonNode node) {
    if (node == null || !node.isArray()) {
      return null;
    }
    StringBuilder builder = new StringBuilder();
    Iterator<JsonNode> iterator = node.iterator();
    while (iterator.hasNext()) {
      JsonNode item = iterator.next();
      if (builder.length() > 0) {
        builder.append(" | ");
      }
      builder.append(item.isTextual() ? item.asText() : item.toString());
    }
    return builder.toString();
  }

  private Integer resolveInteger(JsonNode node, String field) {
    if (node == null || !node.has(field) || node.get(field).isNull()) {
      return null;
    }
    return node.get(field).asInt();
  }

  private Long resolveLong(JsonNode node, String field) {
    if (node == null || !node.has(field) || node.get(field).isNull()) {
      return null;
    }
    return node.get(field).asLong();
  }

  private String text(JsonNode node, String field) {
    if (node == null || !node.has(field) || node.get(field).isNull()) {
      return null;
    }
    JsonNode value = node.get(field);
    return value.isTextual() ? value.asText() : value.toString();
  }

  private String firstNonBlank(String... values) {
    if (values == null) {
      return null;
    }
    for (String value : values) {
      if (value != null && !value.isBlank()) {
        return value;
      }
    }
    return null;
  }

  private String firstStackLine(String stack) {
    if (stack == null || stack.isBlank()) {
      return null;
    }
    return List.of(stack.split("\\R")).getFirst();
  }

  private String nullSafe(String value) {
    return value == null ? "" : value;
  }

  private String writeJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException e) {
      throw new ServiceException("monitor.errors.jsonSerializeFailed");
    }
  }

  private String writeNullableJson(Object value) {
    if (value == null) {
      return null;
    }
    return writeJson(value);
  }
}
