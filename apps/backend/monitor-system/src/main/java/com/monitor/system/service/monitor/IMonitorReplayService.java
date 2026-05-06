package com.monitor.system.service.monitor;

import com.monitor.system.domain.monitor.dto.MonitorReplayChunkRequest;
import com.monitor.system.domain.monitor.query.MonitorReplayQuery;
import com.monitor.system.domain.monitor.vo.MonitorReplaySessionVo;
import java.util.List;

public interface IMonitorReplayService {
  int collectReplay(String projectKey, MonitorReplayChunkRequest request, String origin);

  List<MonitorReplaySessionVo> selectReplayList(MonitorReplayQuery query);

  MonitorReplaySessionVo selectReplayByReplayId(String replayId);
}
