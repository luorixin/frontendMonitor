package com.monitor.web.controller.monitor;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.monitor.core.domain.ApiResponse;
import com.monitor.core.domain.TableDataInfo;
import com.monitor.system.domain.monitor.MonitorAlertRecord;
import com.monitor.system.domain.monitor.MonitorAlertRule;
import com.monitor.system.domain.monitor.dto.MonitorAlertRuleSaveBody;
import com.monitor.system.domain.monitor.query.MonitorAlertRecordQuery;
import com.monitor.system.domain.monitor.query.MonitorAlertRuleQuery;
import com.monitor.system.domain.monitor.vo.MonitorAlertEvaluationVo;
import com.monitor.system.service.monitor.IMonitorAlertService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/monitor/alerts")
public class MonitorAlertController {

  private final IMonitorAlertService alertService;

  public MonitorAlertController(IMonitorAlertService alertService) {
    this.alertService = alertService;
  }

  @GetMapping("/rules")
  public TableDataInfo rules(MonitorAlertRuleQuery query) {
    Page<MonitorAlertRule> page = PageHelper.startPage(query.getPageNum(), query.getPageSize())
        .doSelectPage(() -> alertService.selectRuleList(query));
    return TableDataInfo.of(page.getTotal(), page.getResult());
  }

  @GetMapping("/rules/{id}")
  public ApiResponse<MonitorAlertRule> detail(@PathVariable("id") Long id) {
    return ApiResponse.ok(alertService.selectRuleById(id));
  }

  @PostMapping("/rules")
  public ApiResponse<MonitorAlertRule> create(@Valid @RequestBody MonitorAlertRuleSaveBody body) {
    return ApiResponse.ok(alertService.createRule(body));
  }

  @PutMapping("/rules/{id}")
  public ApiResponse<MonitorAlertRule> update(
      @PathVariable("id") Long id,
      @Valid @RequestBody MonitorAlertRuleSaveBody body
  ) {
    return ApiResponse.ok(alertService.updateRule(id, body));
  }

  @PostMapping("/rules/{id}/status")
  public ApiResponse<Void> updateStatus(
      @PathVariable("id") Long id,
      @RequestBody Map<String, Boolean> body
  ) {
    alertService.updateRuleEnabled(id, body.get("enabled"));
    return ApiResponse.ok("OK", null);
  }

  @PostMapping("/rules/{id}/test")
  public ApiResponse<MonitorAlertEvaluationVo> test(@PathVariable("id") Long id) {
    return ApiResponse.ok(alertService.evaluateRule(id));
  }

  @GetMapping("/records")
  public TableDataInfo records(MonitorAlertRecordQuery query) {
    Page<MonitorAlertRecord> page = PageHelper.startPage(query.getPageNum(), query.getPageSize())
        .doSelectPage(() -> alertService.selectRecordList(query));
    return TableDataInfo.of(page.getTotal(), page.getResult());
  }
}
