package com.monitor.system.service.monitor;

import com.monitor.system.domain.monitor.MonitorSourceMapArtifact;
import com.monitor.system.domain.monitor.query.MonitorSourceMapArtifactQuery;
import com.monitor.system.domain.monitor.vo.MonitorSourceMapArtifactVo;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface IMonitorSourceMapService {
  List<MonitorSourceMapArtifactVo> selectSourceMapList(MonitorSourceMapArtifactQuery query);

  MonitorSourceMapArtifactVo uploadSourceMap(
      Long projectId,
      String release,
      String artifact,
      MultipartFile file
  );

  List<MonitorSourceMapArtifact> selectArtifactsByRelease(Long projectId, String release);
}
