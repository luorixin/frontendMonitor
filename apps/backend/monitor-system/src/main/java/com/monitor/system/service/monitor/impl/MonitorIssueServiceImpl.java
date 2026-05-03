package com.monitor.system.service.monitor.impl;

import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.MonitorIssue;
import com.monitor.system.domain.monitor.query.MonitorDashboardQuery;
import com.monitor.system.domain.monitor.query.MonitorEventQuery;
import com.monitor.system.domain.monitor.query.MonitorIssueQuery;
import com.monitor.system.domain.monitor.vo.MonitorIssueVo;
import com.monitor.system.domain.monitor.vo.MonitorTrendPointVo;
import com.monitor.system.mapper.monitor.MonitorEventMapper;
import com.monitor.system.mapper.monitor.MonitorIssueMapper;
import com.monitor.system.service.monitor.IMonitorIssueService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonitorIssueServiceImpl implements IMonitorIssueService {

  private static final Set<String> ALLOWED_STATUSES = Set.of(
      "OPEN",
      "INVESTIGATING",
      "IGNORED",
      "RESOLVED"
  );
  private static final Set<String> ALLOWED_PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");

  private final MonitorIssueMapper issueMapper;
  private final MonitorEventMapper eventMapper;

  public MonitorIssueServiceImpl(MonitorIssueMapper issueMapper, MonitorEventMapper eventMapper) {
    this.issueMapper = issueMapper;
    this.eventMapper = eventMapper;
  }

  @Override
  public List<MonitorIssueVo> selectIssueList(MonitorIssueQuery query) {
    applyDefaultTimeRange(query);
    return issueMapper.selectIssueList(query).stream().map(this::toVo).toList();
  }

  @Override
  public MonitorIssueVo selectIssueById(Long id) {
    return toVo(requireIssue(id));
  }

  @Override
  public List<MonitorEvent> selectIssueEventList(Long issueId, MonitorEventQuery query) {
    requireIssue(issueId);
    query.setIssueId(issueId);
    if (query.getEndTime() == null) {
      query.setEndTime(LocalDateTime.now());
    }
    if (query.getStartTime() == null) {
      query.setStartTime(query.getEndTime().minusHours(24));
    }
    return eventMapper.selectEventList(query);
  }

  @Override
  public List<MonitorTrendPointVo> selectIssueTrend(Long issueId, MonitorDashboardQuery query) {
    requireIssue(issueId);
    if (query.getEndTime() == null) {
      query.setEndTime(LocalDateTime.now());
    }
    if (query.getStartTime() == null) {
      query.setStartTime(query.getEndTime().minusHours(24));
    }
    if ("day".equalsIgnoreCase(query.getGranularity())) {
      return eventMapper.selectIssueTrendByDay(issueId, query.getStartTime(), query.getEndTime());
    }
    return eventMapper.selectIssueTrendByHour(issueId, query.getStartTime(), query.getEndTime());
  }

  @Override
  @Transactional
  public void updateIssueStatus(Long id, String status) {
    requireIssue(id);
    String normalized = status == null ? "" : status.trim().toUpperCase();
    if (!ALLOWED_STATUSES.contains(normalized)) {
      throw new ServiceException(400, "monitor.errors.invalidIssueStatus");
    }
    issueMapper.updateIssueStatus(id, normalized);
  }

  @Override
  @Transactional
  public void updateIssueAssignment(Long id, String assignee, String priority) {
    requireIssue(id);
    String normalizedPriority = priority == null || priority.isBlank()
        ? "MEDIUM"
        : priority.trim().toUpperCase();
    if (!ALLOWED_PRIORITIES.contains(normalizedPriority)) {
      throw new ServiceException(400, "monitor.errors.invalidIssuePriority");
    }
    issueMapper.updateIssueAssignment(id, trimToNull(assignee), normalizedPriority);
  }

  private void applyDefaultTimeRange(MonitorIssueQuery query) {
    if (query.getEndTime() == null) {
      query.setEndTime(LocalDateTime.now());
    }
    if (query.getStartTime() == null) {
      query.setStartTime(query.getEndTime().minusHours(24));
    }
  }

  private MonitorIssue requireIssue(Long id) {
    MonitorIssue issue = issueMapper.selectIssueById(id);
    if (issue == null) {
      throw new ServiceException(404, "monitor.errors.issueNotFound");
    }
    return issue;
  }

  private MonitorIssueVo toVo(MonitorIssue issue) {
    MonitorIssueVo vo = new MonitorIssueVo();
    vo.setId(issue.getId());
    vo.setProjectId(issue.getProjectId());
    vo.setIssueType(issue.getIssueType());
    vo.setFingerprint(issue.getFingerprint());
    vo.setTitle(issue.getTitle());
    vo.setFirstSeenAt(issue.getFirstSeenAt());
    vo.setLastSeenAt(issue.getLastSeenAt());
    vo.setOccurrenceCount(issue.getOccurrenceCount());
    vo.setLatestEventId(issue.getLatestEventId());
    vo.setStatus(issue.getStatus());
    vo.setAssignee(issue.getAssignee());
    vo.setPriority(issue.getPriority());
    vo.setCommentCount(issue.getCommentCount());
    return vo;
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
