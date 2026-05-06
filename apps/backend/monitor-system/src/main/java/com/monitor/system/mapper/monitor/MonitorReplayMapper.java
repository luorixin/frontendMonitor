package com.monitor.system.mapper.monitor;

import com.monitor.system.domain.monitor.MonitorReplayChunk;
import com.monitor.system.domain.monitor.MonitorReplaySession;
import com.monitor.system.domain.monitor.query.MonitorReplayQuery;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MonitorReplayMapper {
  MonitorReplaySession selectReplaySessionByReplayId(@Param("replayId") String replayId);

  List<MonitorReplaySession> selectReplaySessionList(MonitorReplayQuery query);

  int insertReplaySession(MonitorReplaySession session);

  int updateReplaySession(MonitorReplaySession session);

  int insertReplayChunk(MonitorReplayChunk chunk);

  List<MonitorReplayChunk> selectReplayChunksBySessionId(@Param("replaySessionId") Long replaySessionId);
}
