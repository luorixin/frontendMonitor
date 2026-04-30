package com.monitor.web.controller.monitor;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.monitor.core.domain.ApiResponse;
import com.monitor.core.domain.TableDataInfo;
import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.dto.MonitorIssueStatusBody;
import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.query.MonitorEventQuery;
import com.monitor.system.domain.monitor.query.MonitorIssueQuery;
import com.monitor.system.domain.monitor.vo.MonitorIssueVo;
import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import com.monitor.system.service.monitor.IMonitorIssueService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/monitor/issues")
public class MonitorIssueController {

  private final IMonitorIssueService issueService;

  public MonitorIssueController(IMonitorIssueService issueService) {
    this.issueService = issueService;
  }

  @GetMapping
  public TableDataInfo list(MonitorIssueQuery query) {
    Page<MonitorIssueVo> page = PageHelper.startPage(query.getPageNum(), query.getPageSize())
        .doSelectPage(() -> issueService.selectIssueList(query));
    return TableDataInfo.of(page.getTotal(), page.getResult());
  }

  @GetMapping("/{id}")
  public ApiResponse<MonitorIssueVo> detail(@PathVariable("id") Long id) {
    return ApiResponse.ok(issueService.selectIssueById(id));
  }

  @GetMapping("/{id}/events")
  public TableDataInfo issueEvents(@PathVariable("id") Long id, MonitorEventQuery query) {
    Page<MonitorEvent> page = PageHelper.startPage(query.getPageNum(), query.getPageSize())
        .doSelectPage(() -> issueService.selectIssueEventList(id, query));
    return TableDataInfo.of(page.getTotal(), page.getResult());
  }

  @GetMapping("/{id}/trend")
  public ApiResponse<List<MonitorTrendPointVo>> trend(@PathVariable("id") Long id, MonitorDashboardQuery query) {
    return ApiResponse.ok(issueService.selectIssueTrend(id, query));
  }

  @PostMapping("/{id}/status")
  public ApiResponse<Void> updateStatus(
      @PathVariable("id") Long id,
      @Valid @RequestBody MonitorIssueStatusBody body
  ) {
    issueService.updateIssueStatus(id, body.getStatus());
    return ApiResponse.ok("OK", null);
  }
}
