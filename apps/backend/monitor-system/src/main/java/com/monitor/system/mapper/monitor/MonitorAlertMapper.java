package com.monitor.system.mapper.monitor;

import com.monitor.system.domain.monitor.MonitorAlertRecord;
import com.monitor.system.domain.monitor.MonitorAlertRule;
import com.monitor.system.domain.monitor.query.MonitorAlertRecordQuery;
import com.monitor.system.domain.monitor.query.MonitorAlertRuleQuery;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MonitorAlertMapper {
  int insertRule(MonitorAlertRule rule);

  int updateRule(MonitorAlertRule rule);

  int updateRuleEnabled(@Param("id") Long id, @Param("enabled") Boolean enabled);

  MonitorAlertRule selectRuleById(@Param("id") Long id);

  List<MonitorAlertRule> selectRuleList(MonitorAlertRuleQuery query);

  List<MonitorAlertRule> selectEnabledRules();

  int insertRecord(MonitorAlertRecord record);

  List<MonitorAlertRecord> selectRecordList(MonitorAlertRecordQuery query);
}
