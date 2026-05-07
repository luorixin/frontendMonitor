package com.monitor.system.domain.monitor.vo;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorSourceMapFrameVo {
  private String rawLine;
  private String functionName;
  private String generatedFile;
  private Integer generatedLine;
  private Integer generatedColumn;
  private String dist;
  private String artifact;
  private boolean resolved;
  private String originalSource;
  private Integer originalLine;
  private Integer originalColumn;
  private String identifier;
  private List<MonitorSourceContextLineVo> sourceContext;
}
