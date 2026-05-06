package com.monitor.web.controller.monitor;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.monitor.core.domain.ApiResponse;
import com.monitor.core.domain.TableDataInfo;
import com.monitor.system.domain.monitor.dto.MonitorReplayChunkRequest;
import com.monitor.system.domain.monitor.query.MonitorReplayQuery;
import com.monitor.system.domain.monitor.vo.MonitorReplaySessionVo;
import com.monitor.system.service.monitor.IMonitorReplayService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/monitor")
public class MonitorReplayController {

  private final IMonitorReplayService replayService;

  public MonitorReplayController(IMonitorReplayService replayService) {
    this.replayService = replayService;
  }

  @PostMapping("/replays/{projectKey}")
  public ApiResponse<Map<String, Integer>> collect(
      @PathVariable("projectKey") String projectKey,
      @RequestHeader(value = "Origin", required = false) String origin,
      @RequestBody MonitorReplayChunkRequest request
  ) {
    return ApiResponse.ok(Map.of(
        "received",
        replayService.collectReplay(projectKey, request, origin)
    ));
  }

  @GetMapping("/replays")
  public TableDataInfo list(MonitorReplayQuery query) {
    Page<MonitorReplaySessionVo> page = PageHelper.startPage(query.getPageNum(), query.getPageSize())
        .doSelectPage(() -> replayService.selectReplayList(query));
    return TableDataInfo.of(page.getTotal(), page.getResult());
  }

  @GetMapping("/replays/{replayId}")
  public ApiResponse<MonitorReplaySessionVo> detail(@PathVariable("replayId") String replayId) {
    return ApiResponse.ok(replayService.selectReplayByReplayId(replayId));
  }
}
