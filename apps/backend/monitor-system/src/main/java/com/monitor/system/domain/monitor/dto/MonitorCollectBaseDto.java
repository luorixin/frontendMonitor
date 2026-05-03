package com.monitor.system.domain.monitor.dto;

import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorCollectBaseDto {
  private String appName;
  private String appVersion;
  private String deviceId;
  private String userId;
  private String sessionId;
  private String pageId;
  private String url;
  private String title;
  private String userAgent;
  private String sdkVersion;
  private String environment;
  private String release;
  private Map<String, String> tags;
  private Map<String, Object> contexts;
  private List<Map<String, Object>> breadcrumbs;
  private Long timestamp;
  private Map<String, Integer> viewport;
}
