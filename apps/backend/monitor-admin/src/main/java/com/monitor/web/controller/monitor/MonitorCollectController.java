package com.monitor.web.controller.monitor;

import com.monitor.core.domain.ApiResponse;
import com.monitor.system.domain.monitor.dto.MonitorCollectRequest;
import com.monitor.system.domain.monitor.vo.MonitorCollectResultVo;
import com.monitor.system.service.monitor.IMonitorCollectService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/monitor")
public class MonitorCollectController {

  private static final byte[] PIXEL_GIF = java.util.Base64.getDecoder().decode(
      "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
  );

  private final IMonitorCollectService collectService;

  public MonitorCollectController(IMonitorCollectService collectService) {
    this.collectService = collectService;
  }

  @PostMapping("/collect/{projectKey}")
  public ApiResponse<MonitorCollectResultVo> collect(
      @PathVariable("projectKey") String projectKey,
      @Valid @RequestBody MonitorCollectRequest request
  ) {
    return ApiResponse.ok(new MonitorCollectResultVo(collectService.collect(projectKey, request)));
  }

  @GetMapping("/collect/{projectKey}")
  public ResponseEntity<byte[]> collectByImage(
      @PathVariable("projectKey") String projectKey,
      @RequestParam(value = "data", required = false) String data
  ) {
    try {
      collectService.collectFromImage(projectKey, data);
    } catch (Exception ignored) {
      // Browser image beacons should always receive an image response.
    }

    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header(HttpHeaders.PRAGMA, "no-cache")
        .contentType(MediaType.IMAGE_GIF)
        .body(PIXEL_GIF);
  }

  @GetMapping("/health")
  public ApiResponse<Map<String, Object>> health() {
    return ApiResponse.ok(Map.of(
        "module", "monitor",
        "status", "UP"
    ));
  }
}
