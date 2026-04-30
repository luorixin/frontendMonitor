package com.monitor.system.mapper.monitor;

import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MonitorAggregateMapper {
  int upsertHourAggregate(
      @Param("projectId") Long projectId,
      @Param("bucketStart") LocalDateTime bucketStart,
      @Param("eventType") String eventType,
      @Param("totalCount") long totalCount,
      @Param("errorCount") long errorCount,
      @Param("pageViewCount") long pageViewCount
  );

  int upsertDayAggregate(
      @Param("projectId") Long projectId,
      @Param("eventDate") LocalDate eventDate,
      @Param("eventType") String eventType,
      @Param("totalCount") long totalCount,
      @Param("errorCount") long errorCount,
      @Param("pageViewCount") long pageViewCount
  );

  List<MonitorTrendPointVo> selectTrendByHour(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  List<MonitorTrendPointVo> selectTrendByDay(
      @Param("projectId") Long projectId,
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate
  );

  int deleteHourAggregatesOlderThan(@Param("cutoff") LocalDateTime cutoff);

  int deleteDayAggregatesOlderThan(@Param("cutoff") LocalDate cutoff);
}
