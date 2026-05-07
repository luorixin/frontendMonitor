package com.monitor.system.domain.monitor.vo;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorSourceMapArtifactVo {
  private Long id;
  private Long projectId;
  private String release;
  private String dist;
  private String artifact;
  private String fileName;
  private Long fileSize;
  private LocalDateTime createTime;
  private LocalDateTime updateTime;
}
