package com.monitor.system.domain.monitor.query;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

@Getter
@Setter
public class MonitorEventQuery {
  private Long projectId;
  private Long issueId;
  private String eventType;
  private String issueType;
  private String appVersion;
  private String userId;
  private String sessionId;
  private String deviceId;
  private String url;
  private String keyword;

  @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime startTime;

  @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime endTime;

  private Integer pageNum = 1;
  private Integer pageSize = 20;
}
