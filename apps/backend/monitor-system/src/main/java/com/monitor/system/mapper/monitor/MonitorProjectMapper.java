package com.monitor.system.mapper.monitor;

import com.monitor.system.domain.monitor.MonitorProject;
import com.monitor.system.domain.monitor.query.MonitorProjectQuery;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MonitorProjectMapper {
  List<MonitorProject> selectProjectList(MonitorProjectQuery query);

  MonitorProject selectProjectById(@Param("id") Long id);

  MonitorProject selectProjectByKey(@Param("projectKey") String projectKey);

  int insertProject(MonitorProject project);

  int updateProject(MonitorProject project);

  int updateProjectStatus(@Param("id") Long id, @Param("status") Integer status);

  int updateProjectKey(@Param("id") Long id, @Param("projectKey") String projectKey);
}
