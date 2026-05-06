package com.monitor.web.controller.monitor;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.monitor.core.domain.ApiResponse;
import com.monitor.core.domain.TableDataInfo;
import com.monitor.system.domain.monitor.query.MonitorSourceMapArtifactQuery;
import com.monitor.system.domain.monitor.vo.MonitorSourceMapArtifactVo;
import com.monitor.system.service.monitor.IMonitorSourceMapService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/monitor/source-maps")
public class MonitorSourceMapController {

  private final IMonitorSourceMapService sourceMapService;

  public MonitorSourceMapController(IMonitorSourceMapService sourceMapService) {
    this.sourceMapService = sourceMapService;
  }

  @GetMapping
  public TableDataInfo list(MonitorSourceMapArtifactQuery query) {
    Page<MonitorSourceMapArtifactVo> page = PageHelper.startPage(query.getPageNum(), query.getPageSize())
        .doSelectPage(() -> sourceMapService.selectSourceMapList(query));
    return TableDataInfo.of(page.getTotal(), page.getResult());
  }

  @PostMapping
  public ApiResponse<MonitorSourceMapArtifactVo> upload(
      @RequestParam("projectId") Long projectId,
      @RequestParam("release") String release,
      @RequestParam("artifact") String artifact,
      @RequestParam("file") MultipartFile file
  ) {
    return ApiResponse.ok(sourceMapService.uploadSourceMap(projectId, release, artifact, file));
  }
}
