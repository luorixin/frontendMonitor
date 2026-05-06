package com.monitor.system.service.monitor.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.MonitorProject;
import com.monitor.system.domain.monitor.MonitorReplayChunk;
import com.monitor.system.domain.monitor.MonitorReplaySession;
import com.monitor.system.domain.monitor.dto.MonitorReplayChunkRequest;
import com.monitor.system.domain.monitor.query.MonitorReplayQuery;
import com.monitor.system.domain.monitor.vo.MonitorReplayChunkVo;
import com.monitor.system.domain.monitor.vo.MonitorReplaySessionVo;
import com.monitor.system.mapper.monitor.MonitorProjectMapper;
import com.monitor.system.mapper.monitor.MonitorReplayMapper;
import com.monitor.system.service.monitor.IMonitorReplayService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonitorReplayServiceImpl implements IMonitorReplayService {

  private final MonitorProjectMapper projectMapper;
  private final MonitorReplayMapper replayMapper;
  private final ObjectMapper objectMapper;
  private final int maxPayloadBytes;

  public MonitorReplayServiceImpl(
      MonitorProjectMapper projectMapper,
      MonitorReplayMapper replayMapper,
      ObjectMapper objectMapper,
      @Value("${app.monitor.replay.max-payload-bytes:262144}") int maxPayloadBytes
  ) {
    this.projectMapper = projectMapper;
    this.replayMapper = replayMapper;
    this.objectMapper = objectMapper;
    this.maxPayloadBytes = Math.max(1024, maxPayloadBytes);
  }

  @Override
  @Transactional
  public int collectReplay(String projectKey, MonitorReplayChunkRequest request, String origin) {
    MonitorProject project = requireCollectProject(projectKey);
    validateReplayRequest(project, request, origin);

    MonitorReplaySession session = replayMapper.selectReplaySessionByReplayId(request.getReplayId());
    if (session == null) {
      session = new MonitorReplaySession();
      session.setProjectId(project.getId());
      session.setReplayId(request.getReplayId());
      session.setSessionId(request.getSessionId().trim());
      session.setPageId(trimToNull(request.getPageId()));
      session.setAppName(request.getAppName().trim());
      session.setAppVersion(trimToNull(request.getAppVersion()));
      session.setRelease(trimToNull(request.getRelease()));
      session.setEnvironment(trimToNull(request.getEnvironment()));
      session.setUserId(trimToNull(request.getUserId()));
      session.setDeviceId(trimToNull(request.getDeviceId()));
      session.setInitialUrl(trimToNull(request.getUrl()));
      session.setTitle(trimToNull(request.getTitle()));
      session.setStartedAt(resolveTimestamp(request.getStartedAt()));
      session.setLastSeenAt(resolveTimestamp(request.getEndedAt()));
      session.setChunkCount(0L);
      session.setEventCount(0L);
      replayMapper.insertReplaySession(session);
    }

    MonitorReplayChunk chunk = new MonitorReplayChunk();
    chunk.setReplaySessionId(session.getId());
    chunk.setSequenceNo(request.getSequence());
    chunk.setStartedAt(resolveTimestamp(request.getStartedAt()));
    chunk.setEndedAt(resolveTimestamp(request.getEndedAt()));
    chunk.setEventCount((long) request.getEvents().size());
    chunk.setPayloadJson(writeJson(request.getEvents()));
    replayMapper.insertReplayChunk(chunk);

    session.setPageId(trimToNull(request.getPageId()));
    session.setAppName(request.getAppName().trim());
    session.setAppVersion(trimToNull(request.getAppVersion()));
    session.setRelease(trimToNull(request.getRelease()));
    session.setEnvironment(trimToNull(request.getEnvironment()));
    session.setUserId(trimToNull(request.getUserId()));
    session.setDeviceId(trimToNull(request.getDeviceId()));
    session.setInitialUrl(trimToNull(request.getUrl()));
    session.setTitle(trimToNull(request.getTitle()));
    session.setStartedAt(minTime(session.getStartedAt(), chunk.getStartedAt()));
    session.setLastSeenAt(maxTime(session.getLastSeenAt(), chunk.getEndedAt()));
    session.setChunkCount((session.getChunkCount() == null ? 0L : session.getChunkCount()) + 1L);
    session.setEventCount((session.getEventCount() == null ? 0L : session.getEventCount()) + chunk.getEventCount());
    replayMapper.updateReplaySession(session);

    return request.getEvents().size();
  }

  @Override
  public List<MonitorReplaySessionVo> selectReplayList(MonitorReplayQuery query) {
    return replayMapper.selectReplaySessionList(query).stream()
        .map(session -> toVo(session, false))
        .toList();
  }

  @Override
  public MonitorReplaySessionVo selectReplayByReplayId(String replayId) {
    MonitorReplaySession session = replayMapper.selectReplaySessionByReplayId(replayId);
    if (session == null) {
      throw new ServiceException(404, "monitor.errors.replayNotFound");
    }
    return toVo(session, true);
  }

  private MonitorReplaySessionVo toVo(MonitorReplaySession session, boolean includeChunks) {
    MonitorReplaySessionVo vo = new MonitorReplaySessionVo();
    vo.setId(session.getId());
    vo.setProjectId(session.getProjectId());
    vo.setReplayId(session.getReplayId());
    vo.setSessionId(session.getSessionId());
    vo.setPageId(session.getPageId());
    vo.setAppName(session.getAppName());
    vo.setAppVersion(session.getAppVersion());
    vo.setRelease(session.getRelease());
    vo.setEnvironment(session.getEnvironment());
    vo.setUserId(session.getUserId());
    vo.setDeviceId(session.getDeviceId());
    vo.setInitialUrl(session.getInitialUrl());
    vo.setTitle(session.getTitle());
    vo.setStartedAt(session.getStartedAt());
    vo.setLastSeenAt(session.getLastSeenAt());
    vo.setChunkCount(session.getChunkCount());
    vo.setEventCount(session.getEventCount());
    vo.setChunks(includeChunks
        ? replayMapper.selectReplayChunksBySessionId(session.getId()).stream().map(this::toChunkVo).toList()
        : Collections.emptyList());
    return vo;
  }

  private MonitorReplayChunkVo toChunkVo(MonitorReplayChunk chunk) {
    MonitorReplayChunkVo vo = new MonitorReplayChunkVo();
    vo.setSequenceNo(chunk.getSequenceNo());
    vo.setStartedAt(chunk.getStartedAt());
    vo.setEndedAt(chunk.getEndedAt());
    vo.setEventCount(chunk.getEventCount());
    vo.setPayloadJson(chunk.getPayloadJson());
    return vo;
  }

  private MonitorProject requireCollectProject(String projectKey) {
    MonitorProject project = projectMapper.selectProjectByKey(projectKey);
    if (project == null) {
      throw new ServiceException(404, "monitor.errors.projectNotFound");
    }
    if (project.getStatus() == null || project.getStatus() != 1) {
      throw new ServiceException(403, "monitor.errors.projectDisabled");
    }
    return project;
  }

  private void validateReplayRequest(
      MonitorProject project,
      MonitorReplayChunkRequest request,
      String origin
  ) {
    if (trimToNull(request.getReplayId()) == null) {
      throw new ServiceException(400, "monitor.errors.replayIdRequired");
    }
    if (trimToNull(request.getSessionId()) == null) {
      throw new ServiceException(400, "monitor.errors.sessionIdRequired");
    }
    if (trimToNull(request.getAppName()) == null) {
      throw new ServiceException(400, "monitor.errors.appNameRequired");
    }
    if (request.getSequence() == null || request.getSequence() < 0) {
      throw new ServiceException(400, "monitor.errors.replaySequenceRequired");
    }
    if (request.getEvents() == null || request.getEvents().isEmpty()) {
      throw new ServiceException(400, "monitor.errors.replayEventsRequired");
    }
    if (writeJson(request).length() > maxPayloadBytes) {
      throw new ServiceException(400, "monitor.errors.payloadTooLarge");
    }
    if (!isOriginAllowed(project, origin)) {
      throw new ServiceException(403, "monitor.errors.originNotAllowed");
    }
  }

  private boolean isOriginAllowed(MonitorProject project, String origin) {
    if (origin == null || origin.isBlank()) {
      return true;
    }
    List<String> allowedOrigins = readAllowedOrigins(project.getAllowedOrigins());
    if (allowedOrigins.isEmpty()) {
      return true;
    }
    return allowedOrigins.contains("*") || allowedOrigins.contains(origin);
  }

  private List<String> readAllowedOrigins(String raw) {
    if (raw == null || raw.isBlank()) {
      return Collections.emptyList();
    }
    try {
      return objectMapper.readValue(
          raw,
          objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
      );
    } catch (JsonProcessingException e) {
      throw new ServiceException("monitor.errors.invalidAllowedOrigins");
    }
  }

  private String writeJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException e) {
      throw new ServiceException("monitor.errors.jsonSerializeFailed");
    }
  }

  private LocalDateTime resolveTimestamp(Long timestamp) {
    if (timestamp == null || timestamp <= 0) {
      return LocalDateTime.now();
    }
    return LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.systemDefault());
  }

  private LocalDateTime minTime(LocalDateTime left, LocalDateTime right) {
    if (left == null) return right;
    if (right == null) return left;
    return left.isBefore(right) ? left : right;
  }

  private LocalDateTime maxTime(LocalDateTime left, LocalDateTime right) {
    if (left == null) return right;
    if (right == null) return left;
    return left.isAfter(right) ? left : right;
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
