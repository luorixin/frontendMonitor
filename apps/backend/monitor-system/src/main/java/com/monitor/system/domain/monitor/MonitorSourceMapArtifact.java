package com.monitor.system.domain.monitor;

import com.monitor.core.domain.BaseEntity;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorSourceMapArtifact extends BaseEntity {
  private Long id;
  private Long projectId;
  private String release;
  private String dist;
  private String artifact;
  private String artifactHash;
  private String fileName;
  private Long fileSize;
  private String sourceMapJson;
}
