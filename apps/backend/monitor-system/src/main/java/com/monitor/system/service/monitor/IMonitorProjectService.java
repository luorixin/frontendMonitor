package com.monitor.system.service.monitor;

import com.monitor.system.domain.monitor.query.MonitorProjectQuery;
import com.monitor.system.domain.monitor.dto.MonitorProjectSaveBody;
import com.monitor.system.domain.monitor.vo.MonitorProjectVo;
import java.util.List;

public interface IMonitorProjectService {
  List<MonitorProjectVo> selectProjectList(MonitorProjectQuery query);

  MonitorProjectVo selectProjectById(Long id);

  MonitorProjectVo createProject(MonitorProjectSaveBody body);

  MonitorProjectVo updateProject(Long id, MonitorProjectSaveBody body);

  MonitorProjectVo rotateProjectKey(Long id);

  void updateProjectStatus(Long id, Integer status);
}
