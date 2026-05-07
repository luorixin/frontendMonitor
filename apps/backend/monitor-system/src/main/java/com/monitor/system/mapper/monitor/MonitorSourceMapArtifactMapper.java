package com.monitor.system.mapper.monitor;

import com.monitor.system.domain.monitor.MonitorSourceMapArtifact;
import com.monitor.system.domain.monitor.query.MonitorSourceMapArtifactQuery;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MonitorSourceMapArtifactMapper {
  List<MonitorSourceMapArtifact> selectSourceMapList(MonitorSourceMapArtifactQuery query);

  MonitorSourceMapArtifact selectByProjectReleaseArtifact(
      @Param("projectId") Long projectId,
      @Param("release") String release,
      @Param("dist") String dist,
      @Param("artifact") String artifact
  );

  List<MonitorSourceMapArtifact> selectByProjectReleaseDist(
      @Param("projectId") Long projectId,
      @Param("release") String release,
      @Param("dist") String dist
  );

  int insertSourceMap(MonitorSourceMapArtifact artifact);

  int updateSourceMap(MonitorSourceMapArtifact artifact);
}
