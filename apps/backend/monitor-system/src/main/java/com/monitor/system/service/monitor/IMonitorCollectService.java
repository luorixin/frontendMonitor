package com.monitor.system.service.monitor;

import com.monitor.system.domain.monitor.dto.MonitorCollectRequest;

public interface IMonitorCollectService {
  int collect(String projectKey, MonitorCollectRequest request);

  int collectFromImage(String projectKey, String data);
}
