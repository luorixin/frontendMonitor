package com.monitor.system.domain.monitor.query;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

@Getter
@Setter
public class MonitorDashboardQuery {
  private Long projectId;
  private String traceId;
  private String url;
  private String selector;
  private String eventType;
  private String environment;
  private String release;
  private String dist;

  @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime startTime;

  @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime endTime;

  private String granularity = "hour";
  private Integer limit = 20;
  private Integer pageNum = 1;
  private Integer pageSize = 20;
}
