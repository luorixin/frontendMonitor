package com.monitor.system.service.monitor.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.debugging.sourcemap.SourceMapConsumerV3;
import com.google.debugging.sourcemap.SourceMapParseException;
import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.MonitorProject;
import com.monitor.system.domain.monitor.MonitorSourceMapArtifact;
import com.monitor.system.domain.monitor.query.MonitorSourceMapArtifactQuery;
import com.monitor.system.domain.monitor.vo.MonitorSourceMapArtifactVo;
import com.monitor.system.mapper.monitor.MonitorProjectMapper;
import com.monitor.system.mapper.monitor.MonitorSourceMapArtifactMapper;
import com.monitor.system.service.monitor.IMonitorSourceMapService;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MonitorSourceMapServiceImpl implements IMonitorSourceMapService {

  private final MonitorSourceMapArtifactMapper sourceMapArtifactMapper;
  private final MonitorProjectMapper projectMapper;
  private final ObjectMapper objectMapper;
  private final long maxFileBytes;

  public MonitorSourceMapServiceImpl(
      MonitorSourceMapArtifactMapper sourceMapArtifactMapper,
      MonitorProjectMapper projectMapper,
      ObjectMapper objectMapper,
      @Value("${app.monitor.source-map.max-file-bytes:2097152}") long maxFileBytes
  ) {
    this.sourceMapArtifactMapper = sourceMapArtifactMapper;
    this.projectMapper = projectMapper;
    this.objectMapper = objectMapper;
    this.maxFileBytes = maxFileBytes;
  }

  @Override
  public List<MonitorSourceMapArtifactVo> selectSourceMapList(MonitorSourceMapArtifactQuery query) {
    return sourceMapArtifactMapper.selectSourceMapList(query).stream().map(this::toVo).toList();
  }

  @Override
  @Transactional
  public MonitorSourceMapArtifactVo uploadSourceMap(
      Long projectId,
      String release,
      String artifact,
      MultipartFile file
  ) {
    requireProject(projectId);
    String normalizedRelease = requireText(release, "monitor.errors.sourceMapReleaseRequired");
    String normalizedArtifact = requireText(artifact, "monitor.errors.sourceMapArtifactRequired");
    if (file == null || file.isEmpty()) {
      throw new ServiceException(400, "monitor.errors.sourceMapFileRequired");
    }
    if (file.getSize() > maxFileBytes) {
      throw new ServiceException(400, "monitor.errors.sourceMapFileTooLarge");
    }

    String sourceMapJson = readUtf8(file);
    validateSourceMap(sourceMapJson);

    MonitorSourceMapArtifact existing = sourceMapArtifactMapper.selectByProjectReleaseArtifact(
        projectId,
        normalizedRelease,
        normalizedArtifact
    );

    if (existing == null) {
      MonitorSourceMapArtifact created = new MonitorSourceMapArtifact();
      created.setProjectId(projectId);
      created.setRelease(normalizedRelease);
      created.setArtifact(normalizedArtifact);
      created.setFileName(trimToNull(file.getOriginalFilename()));
      created.setFileSize(file.getSize());
      created.setSourceMapJson(sourceMapJson);
      sourceMapArtifactMapper.insertSourceMap(created);
      return toVo(created);
    }

    existing.setFileName(trimToNull(file.getOriginalFilename()));
    existing.setFileSize(file.getSize());
    existing.setSourceMapJson(sourceMapJson);
    sourceMapArtifactMapper.updateSourceMap(existing);
    return toVo(existing);
  }

  @Override
  public List<MonitorSourceMapArtifact> selectArtifactsByRelease(Long projectId, String release) {
    if (projectId == null || release == null || release.isBlank()) {
      return List.of();
    }
    return sourceMapArtifactMapper.selectByProjectRelease(projectId, release.trim());
  }

  private MonitorProject requireProject(Long projectId) {
    if (projectId == null) {
      throw new ServiceException(400, "monitor.errors.projectIdRequired");
    }
    MonitorProject project = projectMapper.selectProjectById(projectId);
    if (project == null) {
      throw new ServiceException(404, "monitor.errors.projectNotFound");
    }
    return project;
  }

  private void validateSourceMap(String sourceMapJson) {
    try {
      JsonNode node = objectMapper.readTree(sourceMapJson);
      if (!node.has("version") || !node.has("mappings")) {
        throw new ServiceException(400, "monitor.errors.invalidSourceMap");
      }
      SourceMapConsumerV3 consumer = new SourceMapConsumerV3();
      consumer.parse(sourceMapJson);
    } catch (JsonProcessingException | SourceMapParseException e) {
      throw new ServiceException(400, "monitor.errors.invalidSourceMap");
    }
  }

  private String readUtf8(MultipartFile file) {
    try {
      return new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new ServiceException("monitor.errors.sourceMapReadFailed");
    }
  }

  private MonitorSourceMapArtifactVo toVo(MonitorSourceMapArtifact artifact) {
    MonitorSourceMapArtifactVo vo = new MonitorSourceMapArtifactVo();
    vo.setId(artifact.getId());
    vo.setProjectId(artifact.getProjectId());
    vo.setRelease(artifact.getRelease());
    vo.setArtifact(artifact.getArtifact());
    vo.setFileName(artifact.getFileName());
    vo.setFileSize(artifact.getFileSize());
    vo.setCreateTime(artifact.getCreateTime());
    vo.setUpdateTime(artifact.getUpdateTime());
    return vo;
  }

  private String requireText(String value, String message) {
    String normalized = trimToNull(value);
    if (normalized == null) {
      throw new ServiceException(400, message);
    }
    return normalized;
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
