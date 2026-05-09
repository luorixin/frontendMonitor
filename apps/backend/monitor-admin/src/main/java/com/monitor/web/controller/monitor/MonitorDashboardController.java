package com.monitor.web.controller.monitor;

import com.monitor.core.domain.ApiResponse;
import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.vo.MonitorDwellDistributionBucketVo;
import com.monitor.system.domain.monitor.vo.MonitorDashboardOverviewVo;
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
import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.service.monitor.IMonitorDashboardService;
import java.util.List;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/monitor/dashboard")
public class MonitorDashboardController {

  private final IMonitorDashboardService dashboardService;

  public MonitorDashboardController(IMonitorDashboardService dashboardService) {
    this.dashboardService = dashboardService;
  }

  @GetMapping("/overview")
  public ApiResponse<MonitorDashboardOverviewVo> overview(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getOverview(query));
  }

  @GetMapping("/trend")
  public ApiResponse<List<MonitorTrendPointVo>> trend(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getTrend(query));
  }

  @GetMapping("/distribution")
  public ApiResponse<List<MonitorEventTypeCountVo>> distribution(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getDistribution(query));
  }

  @GetMapping("/top-pages")
  public ApiResponse<List<MonitorPageStatsVo>> topPages(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getTopPages(query));
  }

  @GetMapping("/top-issues")
  public ApiResponse<List<MonitorIssueVo>> topIssues(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getTopIssues(query));
  }

  @GetMapping("/web-vitals-trend")
  public ApiResponse<List<MonitorWebVitalTrendPointVo>> webVitalsTrend(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getWebVitalTrend(query));
  }

  @GetMapping("/request-performance-trend")
  public ApiResponse<List<MonitorRequestPerformanceTrendPointVo>> requestPerformanceTrend(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getRequestPerformanceTrend(query));
  }

  @GetMapping("/slow-requests")
  public ApiResponse<List<MonitorSlowRequestVo>> slowRequests(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getSlowRequests(query));
  }

  @GetMapping("/trace-overview")
  public ApiResponse<MonitorTraceOverviewVo> traceOverview(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getTraceOverview(query));
  }

  @GetMapping("/trace-trend")
  public ApiResponse<List<MonitorTrendPointVo>> traceTrend(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getTraceTrend(query));
  }

  @GetMapping("/traces")
  public ApiResponse<List<MonitorTraceSummaryVo>> traces(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getTraces(query));
  }

  @GetMapping("/traces/{traceId}")
  public ApiResponse<MonitorTraceDetailVo> traceDetail(
      @PathVariable("traceId") String traceId,
      MonitorDashboardQuery query
  ) {
    return ApiResponse.ok(dashboardService.getTraceDetail(traceId, query));
  }

  @GetMapping("/page-analytics")
  public ApiResponse<List<MonitorPageAnalyticsRowVo>> pageAnalytics(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getPageAnalytics(query));
  }

  @GetMapping("/page-analytics/trend")
  public ApiResponse<List<MonitorPageTrendPointVo>> pageAnalyticsTrend(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getPageAnalyticsTrend(query));
  }

  @GetMapping("/page-analytics/dwell-distribution")
  public ApiResponse<List<MonitorDwellDistributionBucketVo>> pageDwellDistribution(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getPageDwellDistribution(query));
  }

  @GetMapping("/hotspots")
  public ApiResponse<List<MonitorHotspotRowVo>> hotspots(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getHotspots(query));
  }

  @GetMapping("/hotspots/trend")
  public ApiResponse<List<MonitorHotspotTrendPointVo>> hotspotTrend(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getHotspotTrend(query));
  }

  @GetMapping("/hotspots/samples")
  public ApiResponse<List<MonitorEvent>> hotspotSamples(MonitorDashboardQuery query) {
    return ApiResponse.ok(dashboardService.getHotspotSamples(query));
  }
}
