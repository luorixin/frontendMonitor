package com.monitor.system.service.monitor.impl;

import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.MonitorAlertRecord;
import com.monitor.system.domain.monitor.MonitorAlertRule;
import com.monitor.system.domain.monitor.dto.MonitorAlertRuleSaveBody;
import com.monitor.system.domain.monitor.query.MonitorAlertRecordQuery;
import com.monitor.system.domain.monitor.query.MonitorAlertRuleQuery;
import com.monitor.system.domain.monitor.vo.MonitorAlertEvaluationVo;
import com.monitor.system.mapper.monitor.MonitorAlertMapper;
import com.monitor.system.mapper.monitor.MonitorEventMapper;
import com.monitor.system.mapper.monitor.MonitorProjectMapper;
import com.monitor.system.service.monitor.IMonitorAlertService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonitorAlertServiceImpl implements IMonitorAlertService {

  private final MonitorAlertMapper alertMapper;
  private final MonitorEventMapper eventMapper;
  private final MonitorProjectMapper projectMapper;

  public MonitorAlertServiceImpl(
      MonitorAlertMapper alertMapper,
      MonitorEventMapper eventMapper,
      MonitorProjectMapper projectMapper
  ) {
    this.alertMapper = alertMapper;
    this.eventMapper = eventMapper;
    this.projectMapper = projectMapper;
  }

  @Override
  public List<MonitorAlertRule> selectRuleList(MonitorAlertRuleQuery query) {
    return alertMapper.selectRuleList(query);
  }

  @Override
  public MonitorAlertRule selectRuleById(Long id) {
    return requireRule(id);
  }

  @Override
  @Transactional
  public MonitorAlertRule createRule(MonitorAlertRuleSaveBody body) {
    requireProject(body.getProjectId());
    MonitorAlertRule rule = new MonitorAlertRule();
    applyBody(rule, body);
    alertMapper.insertRule(rule);
    return requireRule(rule.getId());
  }

  @Override
  @Transactional
  public MonitorAlertRule updateRule(Long id, MonitorAlertRuleSaveBody body) {
    requireRule(id);
    requireProject(body.getProjectId());
    MonitorAlertRule rule = new MonitorAlertRule();
    rule.setId(id);
    applyBody(rule, body);
    alertMapper.updateRule(rule);
    return requireRule(id);
  }

  @Override
  @Transactional
  public void updateRuleEnabled(Long id, Boolean enabled) {
    requireRule(id);
    alertMapper.updateRuleEnabled(id, enabled != null && enabled);
  }

  @Override
  @Transactional
  public MonitorAlertEvaluationVo evaluateRule(Long id) {
    return evaluate(requireRule(id));
  }

  @Override
  @Transactional
  @Scheduled(cron = "${app.monitor.alert.evaluate-cron:0 */1 * * * ?}")
  public void evaluateEnabledRules() {
    for (MonitorAlertRule rule : alertMapper.selectEnabledRules()) {
      evaluate(rule);
    }
  }

  @Override
  public List<MonitorAlertRecord> selectRecordList(MonitorAlertRecordQuery query) {
    if (query.getEndTime() == null) {
      query.setEndTime(LocalDateTime.now());
    }
    if (query.getStartTime() == null) {
      query.setStartTime(query.getEndTime().minusDays(7));
    }
    return alertMapper.selectRecordList(query);
  }

  private MonitorAlertEvaluationVo evaluate(MonitorAlertRule rule) {
    LocalDateTime windowEnd = LocalDateTime.now();
    LocalDateTime windowStart = windowEnd.minusMinutes(rule.getWindowMinutes());
    long count = eventMapper.countEventsByType(
        rule.getProjectId(),
        rule.getEventType(),
        windowStart,
        windowEnd
    );

    MonitorAlertEvaluationVo vo = new MonitorAlertEvaluationVo();
    vo.setActualCount(count);
    vo.setThresholdCount(rule.getThresholdCount());
    vo.setTriggered(count >= rule.getThresholdCount());

    if (vo.isTriggered()) {
      MonitorAlertRecord record = new MonitorAlertRecord();
      record.setRuleId(rule.getId());
      record.setProjectId(rule.getProjectId());
      record.setEventType(rule.getEventType());
      record.setWindowStart(windowStart);
      record.setWindowEnd(windowEnd);
      record.setActualCount(count);
      record.setThresholdCount(rule.getThresholdCount());
      record.setTriggeredAt(windowEnd);
      record.setMessage(rule.getName() + " triggered: " + count + " >= " + rule.getThresholdCount());
      alertMapper.insertRecord(record);
      vo.setRecordId(record.getId());
    }

    return vo;
  }

  private void applyBody(MonitorAlertRule rule, MonitorAlertRuleSaveBody body) {
    rule.setProjectId(body.getProjectId());
    rule.setName(body.getName().trim());
    rule.setEventType(trimToNull(body.getEventType()));
    rule.setThresholdCount(body.getThresholdCount());
    rule.setWindowMinutes(body.getWindowMinutes());
    rule.setEnabled(body.getEnabled() == null || body.getEnabled());
  }

  private MonitorAlertRule requireRule(Long id) {
    MonitorAlertRule rule = alertMapper.selectRuleById(id);
    if (rule == null) {
      throw new ServiceException(404, "monitor.errors.alertRuleNotFound");
    }
    return rule;
  }

  private void requireProject(Long projectId) {
    if (projectMapper.selectProjectById(projectId) == null) {
      throw new ServiceException(404, "monitor.errors.projectNotFound");
    }
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
