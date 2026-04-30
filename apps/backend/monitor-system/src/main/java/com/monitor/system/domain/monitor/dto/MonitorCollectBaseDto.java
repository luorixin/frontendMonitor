package com.monitor.system.domain.monitor.dto;

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
  private Long timestamp;
  private Map<String, Integer> viewport;
}
