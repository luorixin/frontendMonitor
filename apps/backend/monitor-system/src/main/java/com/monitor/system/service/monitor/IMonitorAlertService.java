package com.monitor.system.service.monitor;

import com.monitor.system.domain.monitor.MonitorAlertRecord;
import com.monitor.system.domain.monitor.MonitorAlertRule;
import com.monitor.system.domain.monitor.dto.MonitorAlertRuleSaveBody;
import com.monitor.system.domain.monitor.query.MonitorAlertRecordQuery;
import com.monitor.system.domain.monitor.query.MonitorAlertRuleQuery;
import com.monitor.system.domain.monitor.vo.MonitorAlertEvaluationVo;
import java.util.List;

public interface IMonitorAlertService {
  List<MonitorAlertRule> selectRuleList(MonitorAlertRuleQuery query);

  MonitorAlertRule selectRuleById(Long id);

  MonitorAlertRule createRule(MonitorAlertRuleSaveBody body);

  MonitorAlertRule updateRule(Long id, MonitorAlertRuleSaveBody body);

  void updateRuleEnabled(Long id, Boolean enabled);

  MonitorAlertEvaluationVo evaluateRule(Long id);

  void evaluateEnabledRules();

  List<MonitorAlertRecord> selectRecordList(MonitorAlertRecordQuery query);
}
