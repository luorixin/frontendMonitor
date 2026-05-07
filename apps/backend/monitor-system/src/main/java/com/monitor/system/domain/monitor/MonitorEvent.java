package com.monitor.system.domain.monitor;

import com.monitor.core.domain.BaseEntity;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorEvent extends BaseEntity {
  private Long id;
  private Long projectId;
  private Long issueId;
  private String eventId;
  private String issueType;
  private String fingerprint;
  private String eventType;
  private LocalDateTime occurredAt;
  private String appName;
  private String appVersion;
  private String environment;
  private String release;
  private String dist;
  private String userId;
  private String deviceId;
  private String sessionId;
  private String pageId;
  private String replayId;
  private String url;
  private String title;
  private String requestMethod;
  private Integer requestStatus;
  private Long duration;
  private String message;
  private String selector;
  private String resourceType;
  private String transport;
  private String eventName;
  private String tagsJson;
  private String contextsJson;
  private String breadcrumbsJson;
  private String traceId;
  private String spanId;
  private String payloadJson;
  private String baseJson;
}
