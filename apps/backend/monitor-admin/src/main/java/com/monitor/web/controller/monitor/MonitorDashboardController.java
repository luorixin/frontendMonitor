package com.monitor.web.controller.monitor;

import com.monitor.core.domain.ApiResponse;
import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.vo.MonitorDashboardOverviewVo;
import com.monitor.system.domain.monitor.vo.MonitorEventTypeCountVo;
import com.monitor.system.domain.monitor.vo.MonitorIssueVo;
import com.monitor.system.domain.monitor.vo.MonitorPageStatsVo;
import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import com.monitor.system.service.monitor.IMonitorDashboardService;
import java.util.List;
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
}
