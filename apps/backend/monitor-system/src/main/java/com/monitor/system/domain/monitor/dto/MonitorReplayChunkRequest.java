package com.monitor.system.domain.monitor.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorReplayChunkRequest {
  private String appName;
  private String appVersion;
  private String deviceId;
  private String userId;
  private String sessionId;
  private String pageId;
  private String replayId;
  private String url;
  private String title;
  private String userAgent;
  private String sdkVersion;
  private String environment;
  private String release;
  private Integer sequence;
  private Long startedAt;
  private Long endedAt;
  private List<Object> events;
}
