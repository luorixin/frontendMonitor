package com.monitor.web.controller.monitor;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.monitor.core.domain.ApiResponse;
import com.monitor.core.domain.TableDataInfo;
import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.query.MonitorEventQuery;
import com.monitor.system.domain.monitor.vo.MonitorEventRawVo;
import com.monitor.system.service.monitor.IMonitorEventService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/monitor/events")
public class MonitorEventController {

  private final IMonitorEventService eventService;

  public MonitorEventController(IMonitorEventService eventService) {
    this.eventService = eventService;
  }

  @GetMapping
  public TableDataInfo list(MonitorEventQuery query) {
    Page<MonitorEvent> page = PageHelper.startPage(query.getPageNum(), query.getPageSize())
        .doSelectPage(() -> eventService.selectEventList(query));
    return TableDataInfo.of(page.getTotal(), page.getResult());
  }

  @GetMapping("/{id}")
  public ApiResponse<MonitorEvent> detail(@PathVariable("id") Long id) {
    return ApiResponse.ok(eventService.selectEventById(id));
  }

  @GetMapping("/{id}/raw")
  public ApiResponse<MonitorEventRawVo> raw(@PathVariable("id") Long id) {
    return ApiResponse.ok(eventService.selectEventRawById(id));
  }
}
