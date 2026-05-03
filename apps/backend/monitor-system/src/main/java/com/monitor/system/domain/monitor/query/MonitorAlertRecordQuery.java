package com.monitor.system.domain.monitor.query;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

@Getter
@Setter
public class MonitorAlertRecordQuery {
  private Long projectId;
  private Long ruleId;
  private Integer pageNum = 1;
  private Integer pageSize = 20;

  @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime startTime;

  @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime endTime;
}
