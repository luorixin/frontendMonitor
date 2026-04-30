package com.monitor.web.controller.common;

import com.monitor.core.domain.ApiResponse;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

  @GetMapping
  public ApiResponse<HealthVo> health() {
    return ApiResponse.ok(new HealthVo("UP", Instant.now().toString()));
  }

  public record HealthVo(String status, String timestamp) {}
}
