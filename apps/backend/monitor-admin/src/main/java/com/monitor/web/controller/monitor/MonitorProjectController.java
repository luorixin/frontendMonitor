package com.monitor.web.controller.monitor;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.monitor.core.domain.ApiResponse;
import com.monitor.core.domain.TableDataInfo;
import com.monitor.system.domain.monitor.dto.MonitorProjectSaveBody;
import com.monitor.system.domain.monitor.dto.MonitorProjectStatusBody;
import com.monitor.system.domain.monitor.query.MonitorProjectQuery;
import com.monitor.system.domain.monitor.vo.MonitorProjectVo;
import com.monitor.system.service.monitor.IMonitorProjectService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/monitor/projects")
public class MonitorProjectController {

  private final IMonitorProjectService projectService;

  public MonitorProjectController(IMonitorProjectService projectService) {
    this.projectService = projectService;
  }

  @GetMapping
  public TableDataInfo list(MonitorProjectQuery query) {
    Page<MonitorProjectVo> page = PageHelper.startPage(query.getPageNum(), query.getPageSize())
        .doSelectPage(() -> projectService.selectProjectList(query));
    return TableDataInfo.of(page.getTotal(), page.getResult());
  }

  @GetMapping("/{id}")
  public ApiResponse<MonitorProjectVo> detail(@PathVariable("id") Long id) {
    return ApiResponse.ok(projectService.selectProjectById(id));
  }

  @PostMapping
  public ApiResponse<MonitorProjectVo> create(@Valid @RequestBody MonitorProjectSaveBody body) {
    return ApiResponse.ok(projectService.createProject(body));
  }

  @PutMapping("/{id}")
  public ApiResponse<MonitorProjectVo> update(
      @PathVariable("id") Long id,
      @Valid @RequestBody MonitorProjectSaveBody body
  ) {
    return ApiResponse.ok(projectService.updateProject(id, body));
  }

  @PostMapping("/{id}/rotate-key")
  public ApiResponse<Map<String, String>> rotateKey(@PathVariable("id") Long id) {
    MonitorProjectVo project = projectService.rotateProjectKey(id);
    return ApiResponse.ok(Map.of(
        "projectKey", project.getProjectKey(),
        "dsn", project.getDsn()
    ));
  }

  @PostMapping("/{id}/status")
  public ApiResponse<Void> updateStatus(
      @PathVariable("id") Long id,
      @Valid @RequestBody MonitorProjectStatusBody body
  ) {
    projectService.updateProjectStatus(id, body.getStatus());
    return ApiResponse.ok("OK", null);
  }
}
