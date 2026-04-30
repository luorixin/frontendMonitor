package com.monitor.system.service.monitor.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.MonitorProject;
import com.monitor.system.domain.monitor.dto.MonitorProjectSaveBody;
import com.monitor.system.domain.monitor.query.MonitorProjectQuery;
import com.monitor.system.domain.monitor.vo.MonitorProjectVo;
import com.monitor.system.mapper.monitor.MonitorProjectMapper;
import com.monitor.system.service.monitor.IMonitorProjectService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonitorProjectServiceImpl implements IMonitorProjectService {

  private final MonitorProjectMapper projectMapper;
  private final ObjectMapper objectMapper;

  public MonitorProjectServiceImpl(MonitorProjectMapper projectMapper, ObjectMapper objectMapper) {
    this.projectMapper = projectMapper;
    this.objectMapper = objectMapper;
  }

  @Override
  public List<MonitorProjectVo> selectProjectList(MonitorProjectQuery query) {
    return projectMapper.selectProjectList(query).stream().map(this::toVo).toList();
  }

  @Override
  public MonitorProjectVo selectProjectById(Long id) {
    return toVo(requireProject(id));
  }

  @Override
  @Transactional
  public MonitorProjectVo createProject(MonitorProjectSaveBody body) {
    validateProjectStatus(body.getStatus());

    MonitorProject project = new MonitorProject();
    project.setProjectName(body.getProjectName().trim());
    project.setAppName(body.getAppName().trim());
    project.setAppVersion(trimToNull(body.getAppVersion()));
    project.setDescription(trimToNull(body.getDescription()));
    project.setAllowedOrigins(writeAllowedOrigins(body.getAllowedOrigins()));
    project.setProjectKey(generateUniqueProjectKey());
    project.setStatus(body.getStatus());
    projectMapper.insertProject(project);
    return toVo(requireProject(project.getId()));
  }

  @Override
  @Transactional
  public MonitorProjectVo updateProject(Long id, MonitorProjectSaveBody body) {
    validateProjectStatus(body.getStatus());

    MonitorProject existing = requireProject(id);
    existing.setProjectName(body.getProjectName().trim());
    existing.setAppName(body.getAppName().trim());
    existing.setAppVersion(trimToNull(body.getAppVersion()));
    existing.setDescription(trimToNull(body.getDescription()));
    existing.setAllowedOrigins(writeAllowedOrigins(body.getAllowedOrigins()));
    existing.setStatus(body.getStatus());
    projectMapper.updateProject(existing);
    return toVo(requireProject(id));
  }

  @Override
  @Transactional
  public MonitorProjectVo rotateProjectKey(Long id) {
    requireProject(id);
    projectMapper.updateProjectKey(id, generateUniqueProjectKey());
    return toVo(requireProject(id));
  }

  @Override
  @Transactional
  public void updateProjectStatus(Long id, Integer status) {
    validateProjectStatus(status);
    requireProject(id);
    projectMapper.updateProjectStatus(id, status);
  }

  private MonitorProject requireProject(Long id) {
    MonitorProject project = projectMapper.selectProjectById(id);
    if (project == null) {
      throw new ServiceException(404, "monitor.errors.projectNotFound");
    }
    return project;
  }

  private MonitorProjectVo toVo(MonitorProject project) {
    MonitorProjectVo vo = new MonitorProjectVo();
    vo.setId(project.getId());
    vo.setProjectName(project.getProjectName());
    vo.setProjectKey(project.getProjectKey());
    vo.setAppName(project.getAppName());
    vo.setAppVersion(project.getAppVersion());
    vo.setStatus(project.getStatus());
    vo.setDescription(project.getDescription());
    vo.setAllowedOrigins(readAllowedOrigins(project.getAllowedOrigins()));
    vo.setDsn("/api/v1/monitor/collect/" + project.getProjectKey());
    vo.setCreateTime(project.getCreateTime());
    vo.setUpdateTime(project.getUpdateTime());
    return vo;
  }

  private List<String> readAllowedOrigins(String raw) {
    if (raw == null || raw.isBlank()) {
      return List.of();
    }
    try {
      return objectMapper.readValue(raw, new TypeReference<>() {});
    } catch (JsonProcessingException e) {
      throw new ServiceException("monitor.errors.invalidAllowedOrigins");
    }
  }

  private String writeAllowedOrigins(List<String> allowedOrigins) {
    try {
      return objectMapper.writeValueAsString(allowedOrigins == null ? List.of() : allowedOrigins);
    } catch (JsonProcessingException e) {
      throw new ServiceException("monitor.errors.invalidAllowedOrigins");
    }
  }

  private String generateUniqueProjectKey() {
    String key = UUID.randomUUID().toString().replace("-", "");
    while (projectMapper.selectProjectByKey(key) != null) {
      key = UUID.randomUUID().toString().replace("-", "");
    }
    return key;
  }

  private void validateProjectStatus(Integer status) {
    if (status == null || (status != 0 && status != 1)) {
      throw new ServiceException(400, "monitor.errors.invalidProjectStatus");
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
