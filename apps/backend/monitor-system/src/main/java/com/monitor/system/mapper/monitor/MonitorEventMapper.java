package com.monitor.system.mapper.monitor;

import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.query.MonitorEventQuery;
import com.monitor.system.domain.monitor.vo.MonitorEventTypeCountVo;
import com.monitor.system.domain.monitor.vo.MonitorPageStatsVo;
import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MonitorEventMapper {
  int insertEvent(MonitorEvent event);

  List<MonitorEvent> selectEventList(MonitorEventQuery query);

  MonitorEvent selectEventById(@Param("id") Long id);

  long countEvents(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  long countErrorEvents(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  long countEventsByType(
      @Param("projectId") Long projectId,
      @Param("eventType") String eventType,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  long countPageViews(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  long countDistinctSessions(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  long countDistinctUsers(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  long countDistinctDevices(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  List<MonitorEventTypeCountVo> selectDistribution(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  List<MonitorPageStatsVo> selectTopPages(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  List<MonitorTrendPointVo> selectIssueTrendByHour(
      @Param("issueId") Long issueId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  List<MonitorTrendPointVo> selectIssueTrendByDay(
      @Param("issueId") Long issueId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  List<MonitorEvent> selectPerformanceEvents(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  List<MonitorEvent> selectRequestPerformanceEvents(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  int deleteEventsOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
