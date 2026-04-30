package com.monitor.system.service.monitor;

import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.vo.MonitorDashboardOverviewVo;
import com.monitor.system.domain.monitor.vo.MonitorEventTypeCountVo;
import com.monitor.system.domain.monitor.vo.MonitorIssueVo;
import com.monitor.system.domain.monitor.vo.MonitorPageStatsVo;
import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import java.util.List;

public interface IMonitorDashboardService {
  MonitorDashboardOverviewVo getOverview(MonitorDashboardQuery query);

  List<MonitorTrendPointVo> getTrend(MonitorDashboardQuery query);

  List<MonitorEventTypeCountVo> getDistribution(MonitorDashboardQuery query);

  List<MonitorPageStatsVo> getTopPages(MonitorDashboardQuery query);

  List<MonitorIssueVo> getTopIssues(MonitorDashboardQuery query);
}
