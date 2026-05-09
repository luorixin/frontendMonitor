package com.monitor.system.service.monitor;

import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.vo.MonitorDashboardOverviewVo;
import com.monitor.system.domain.monitor.vo.MonitorDwellDistributionBucketVo;
import com.monitor.system.domain.monitor.vo.MonitorEventTypeCountVo;
import com.monitor.system.domain.monitor.vo.MonitorHotspotRowVo;
import com.monitor.system.domain.monitor.vo.MonitorHotspotTrendPointVo;
import com.monitor.system.domain.monitor.vo.MonitorIssueVo;
import com.monitor.system.domain.monitor.vo.MonitorPageAnalyticsRowVo;
import com.monitor.system.domain.monitor.vo.MonitorPageTrendPointVo;
import com.monitor.system.domain.monitor.vo.MonitorPageStatsVo;
import com.monitor.system.domain.monitor.vo.MonitorRequestPerformanceTrendPointVo;
import com.monitor.system.domain.monitor.vo.MonitorSlowRequestVo;
import com.monitor.system.domain.monitor.vo.MonitorTraceDetailVo;
import com.monitor.system.domain.monitor.vo.MonitorTraceOverviewVo;
import com.monitor.system.domain.monitor.vo.MonitorTraceSummaryVo;
import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import com.monitor.system.domain.monitor.vo.MonitorWebVitalTrendPointVo;
import java.util.List;

public interface IMonitorDashboardService {
  MonitorDashboardOverviewVo getOverview(MonitorDashboardQuery query);

  List<MonitorTrendPointVo> getTrend(MonitorDashboardQuery query);

  List<MonitorEventTypeCountVo> getDistribution(MonitorDashboardQuery query);

  List<MonitorPageStatsVo> getTopPages(MonitorDashboardQuery query);

  List<MonitorIssueVo> getTopIssues(MonitorDashboardQuery query);

  List<MonitorWebVitalTrendPointVo> getWebVitalTrend(MonitorDashboardQuery query);

  List<MonitorRequestPerformanceTrendPointVo> getRequestPerformanceTrend(MonitorDashboardQuery query);

  List<MonitorSlowRequestVo> getSlowRequests(MonitorDashboardQuery query);

  MonitorTraceOverviewVo getTraceOverview(MonitorDashboardQuery query);

  List<MonitorTraceSummaryVo> getTraces(MonitorDashboardQuery query);

  MonitorTraceDetailVo getTraceDetail(String traceId, MonitorDashboardQuery query);

  List<MonitorTrendPointVo> getTraceTrend(MonitorDashboardQuery query);

  List<MonitorPageAnalyticsRowVo> getPageAnalytics(MonitorDashboardQuery query);

  List<MonitorPageTrendPointVo> getPageAnalyticsTrend(MonitorDashboardQuery query);

  List<MonitorDwellDistributionBucketVo> getPageDwellDistribution(MonitorDashboardQuery query);

  List<MonitorHotspotRowVo> getHotspots(MonitorDashboardQuery query);

  List<MonitorHotspotTrendPointVo> getHotspotTrend(MonitorDashboardQuery query);

  List<com.monitor.system.domain.monitor.MonitorEvent> getHotspotSamples(MonitorDashboardQuery query);
}
