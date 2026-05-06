package com.monitor.system.domain.monitor.vo;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorReplaySessionVo {
  private Long id;
  private Long projectId;
  private String replayId;
  private String sessionId;
  private String pageId;
  private String appName;
  private String appVersion;
  private String release;
  private String environment;
  private String userId;
  private String deviceId;
  private String initialUrl;
  private String title;
  private LocalDateTime startedAt;
  private LocalDateTime lastSeenAt;
  private Long chunkCount;
  private Long eventCount;
  private List<MonitorReplayChunkVo> chunks;
}
