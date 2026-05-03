package com.monitor.system.service.monitor;

import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.query.MonitorEventQuery;
import com.monitor.system.domain.monitor.query.MonitorIssueQuery;
import com.monitor.system.domain.monitor.vo.MonitorIssueVo;
import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import java.util.List;

public interface IMonitorIssueService {
  List<MonitorIssueVo> selectIssueList(MonitorIssueQuery query);

  MonitorIssueVo selectIssueById(Long id);

  List<MonitorEvent> selectIssueEventList(Long issueId, MonitorEventQuery query);

  List<MonitorTrendPointVo> selectIssueTrend(Long issueId, MonitorDashboardQuery query);

  void updateIssueStatus(Long id, String status);

  void updateIssueAssignment(Long id, String assignee, String priority);
}
