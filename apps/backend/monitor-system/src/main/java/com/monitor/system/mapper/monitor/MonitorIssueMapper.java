package com.monitor.system.mapper.monitor;

import com.monitor.system.domain.monitor.MonitorIssue;
import com.monitor.system.domain.monitor.query.MonitorIssueQuery;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MonitorIssueMapper {
  MonitorIssue selectIssueById(@Param("id") Long id);

  MonitorIssue selectIssueByFingerprint(
      @Param("projectId") Long projectId,
      @Param("fingerprint") String fingerprint
  );

  List<MonitorIssue> selectIssueList(MonitorIssueQuery query);

  List<MonitorIssue> selectTopIssues(
      @Param("projectId") Long projectId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime
  );

  int insertIssue(MonitorIssue issue);

  int updateIssueOccurrence(
      @Param("id") Long id,
      @Param("title") String title,
      @Param("lastSeenAt") LocalDateTime lastSeenAt,
      @Param("latestEventId") String latestEventId
  );

  int updateIssueStatus(@Param("id") Long id, @Param("status") String status);

  int updateIssueAssignment(
      @Param("id") Long id,
      @Param("assignee") String assignee,
      @Param("priority") String priority
  );
}
