package com.monitor.system.service.monitor.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.debugging.sourcemap.SourceMapParseException;
import com.google.debugging.sourcemap.SourceMapConsumerV3;
import com.google.debugging.sourcemap.proto.Mapping.OriginalMapping;
import com.monitor.exception.ServiceException;
import com.monitor.system.domain.monitor.MonitorEvent;
import com.monitor.system.domain.monitor.MonitorSourceMapArtifact;
import com.monitor.system.domain.monitor.query.MonitorEventQuery;
import com.monitor.system.domain.monitor.vo.MonitorEventRawVo;
import com.monitor.system.domain.monitor.vo.MonitorResolvedEventVo;
import com.monitor.system.domain.monitor.vo.MonitorSourceContextLineVo;
import com.monitor.system.domain.monitor.vo.MonitorSourceMapFrameVo;
import com.monitor.system.mapper.monitor.MonitorEventMapper;
import com.monitor.system.service.monitor.IMonitorEventService;
import com.monitor.system.service.monitor.IMonitorSourceMapService;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class MonitorEventServiceImpl implements IMonitorEventService {

  private static final int SOURCE_CONTEXT_RADIUS = 2;
  private static final Pattern STACK_FRAME_PATTERN =
      Pattern.compile("^\\s*at\\s+(?:(.*?)\\s+\\()?(.+):(\\d+):(\\d+)\\)?$");

  private final MonitorEventMapper eventMapper;
  private final IMonitorSourceMapService sourceMapService;
  private final ObjectMapper objectMapper;

  public MonitorEventServiceImpl(
      MonitorEventMapper eventMapper,
      IMonitorSourceMapService sourceMapService,
      ObjectMapper objectMapper
  ) {
    this.eventMapper = eventMapper;
    this.sourceMapService = sourceMapService;
    this.objectMapper = objectMapper;
  }

  @Override
  public List<MonitorEvent> selectEventList(MonitorEventQuery query) {
    applyDefaultTimeRange(query);
    return eventMapper.selectEventList(query);
  }

  @Override
  public MonitorEvent selectEventById(Long id) {
    MonitorEvent event = eventMapper.selectEventById(id);
    if (event == null) {
      throw new ServiceException(404, "monitor.errors.eventNotFound");
    }
    return event;
  }

  @Override
  public MonitorEventRawVo selectEventRawById(Long id) {
    MonitorEvent event = selectEventById(id);
    return new MonitorEventRawVo(event.getBaseJson(), event.getPayloadJson());
  }

  @Override
  public MonitorResolvedEventVo selectResolvedEventById(Long id) {
    MonitorEvent event = selectEventById(id);
    MonitorResolvedEventVo resolved = new MonitorResolvedEventVo();
    resolved.setEventId(event.getId());
    resolved.setEventType(event.getEventType());
    resolved.setRelease(event.getRelease());
    resolved.setDist(event.getDist());

    String originalStack = extractStack(event.getPayloadJson());
    resolved.setOriginalStack(originalStack);
    if (originalStack == null || originalStack.isBlank()) {
      resolved.setApplied(false);
      resolved.setStatus("stack_not_available");
      resolved.setResolvedStack(null);
      resolved.setFrames(List.of());
      return resolved;
    }
    if (event.getRelease() == null || event.getRelease().isBlank()) {
      resolved.setApplied(false);
      resolved.setStatus("release_not_available");
      resolved.setResolvedStack(originalStack);
      resolved.setFrames(parseFrames(originalStack));
      return resolved;
    }

    List<MonitorSourceMapArtifact> artifacts = sourceMapService.selectArtifactsByReleaseDist(
        event.getProjectId(),
        event.getRelease(),
        event.getDist()
    );
    if (artifacts.isEmpty()) {
      resolved.setApplied(false);
      resolved.setStatus("source_map_not_found");
      resolved.setResolvedStack(originalStack);
      resolved.setFrames(parseFrames(originalStack));
      return resolved;
    }

    List<MonitorSourceMapFrameVo> frames = parseFrames(originalStack);
    Map<Long, SourceMapConsumerV3> consumers = new HashMap<>();
    Map<Long, JsonNode> sourceMapNodes = new HashMap<>();
    boolean applied = false;
    StringBuilder resolvedStackBuilder = new StringBuilder();
    List<String> lines = List.of(originalStack.split("\\R"));
    if (!lines.isEmpty()) {
      resolvedStackBuilder.append(lines.getFirst());
    }

    int frameIndex = 0;
    for (int lineIndex = 1; lineIndex < lines.size(); lineIndex++) {
      String line = lines.get(lineIndex);
      resolvedStackBuilder.append('\n');
      if (frameIndex >= frames.size()) {
        resolvedStackBuilder.append(line);
        continue;
      }
      MonitorSourceMapFrameVo frame = frames.get(frameIndex++);
      String resolvedLine = line;
      MonitorSourceMapArtifact artifact = findBestArtifact(frame.getGeneratedFile(), artifacts);
      if (artifact != null) {
        frame.setDist(artifact.getDist());
        frame.setArtifact(artifact.getArtifact());
        OriginalMapping mapping = lookupMapping(consumers, artifact, frame.getGeneratedLine(), frame.getGeneratedColumn());
        if (mapping != null) {
          frame.setResolved(true);
          frame.setOriginalSource(mapping.getOriginalFile());
          frame.setOriginalLine(mapping.getLineNumber());
          frame.setOriginalColumn(mapping.getColumnPosition());
          frame.setIdentifier(mapping.getIdentifier());
          frame.setSourceContext(resolveSourceContext(sourceMapNodes, artifact, mapping.getOriginalFile(), mapping.getLineNumber()));
          resolvedLine = buildResolvedLine(frame);
          applied = true;
        }
      }
      resolvedStackBuilder.append(resolvedLine);
    }

    resolved.setApplied(applied);
    resolved.setStatus(applied ? "resolved" : "mapping_not_found");
    resolved.setResolvedStack(resolvedStackBuilder.toString());
    resolved.setFrames(frames);
    return resolved;
  }

  private OriginalMapping lookupMapping(
      Map<Long, SourceMapConsumerV3> consumers,
      MonitorSourceMapArtifact artifact,
      Integer generatedLine,
      Integer generatedColumn
  ) {
    if (generatedLine == null || generatedColumn == null) {
      return null;
    }
    SourceMapConsumerV3 consumer = consumers.computeIfAbsent(artifact.getId(), ignored -> parseConsumer(artifact));
    try {
      OriginalMapping mapping = consumer.getMappingForLine(generatedLine, generatedColumn);
      if (mapping == null && generatedColumn > 0) {
        mapping = consumer.getMappingForLine(generatedLine, generatedColumn - 1);
      }
      return mapping;
    } catch (RuntimeException ex) {
      return null;
    }
  }

  private SourceMapConsumerV3 parseConsumer(MonitorSourceMapArtifact artifact) {
    try {
      SourceMapConsumerV3 consumer = new SourceMapConsumerV3();
      consumer.parse(artifact.getSourceMapJson());
      return consumer;
    } catch (SourceMapParseException e) {
      throw new ServiceException(400, "monitor.errors.invalidSourceMap");
    }
  }

  private JsonNode parseSourceMapNode(MonitorSourceMapArtifact artifact) {
    try {
      return objectMapper.readTree(artifact.getSourceMapJson());
    } catch (IOException e) {
      throw new ServiceException("monitor.errors.invalidSourceMap");
    }
  }

  private String extractStack(String payloadJson) {
    if (payloadJson == null || payloadJson.isBlank()) {
      return null;
    }
    try {
      JsonNode node = objectMapper.readTree(payloadJson);
      JsonNode stack = node.get("stack");
      if (stack == null || stack.isNull()) {
        return null;
      }
      return stack.asText();
    } catch (IOException e) {
      throw new ServiceException("monitor.errors.invalidPayloadJson");
    }
  }

  private List<MonitorSourceMapFrameVo> parseFrames(String stack) {
    List<MonitorSourceMapFrameVo> frames = new ArrayList<>();
    if (stack == null || stack.isBlank()) {
      return frames;
    }
    for (String line : stack.split("\\R")) {
      Matcher matcher = STACK_FRAME_PATTERN.matcher(line);
      if (!matcher.matches()) {
        continue;
      }
      MonitorSourceMapFrameVo frame = new MonitorSourceMapFrameVo();
      frame.setRawLine(line);
      frame.setFunctionName(trimToNull(matcher.group(1)));
      frame.setGeneratedFile(trimToNull(matcher.group(2)));
      frame.setGeneratedLine(parseInteger(matcher.group(3)));
      frame.setGeneratedColumn(parseInteger(matcher.group(4)));
      frame.setResolved(false);
      frames.add(frame);
    }
    return frames;
  }

  private MonitorSourceMapArtifact findBestArtifact(String generatedFile, List<MonitorSourceMapArtifact> artifacts) {
    if (generatedFile == null || artifacts.isEmpty()) {
      return null;
    }
    MonitorSourceMapArtifact best = null;
    int bestScore = -1;
    for (MonitorSourceMapArtifact artifact : artifacts) {
      int score = matchScore(generatedFile, artifact.getArtifact());
      if (score > bestScore) {
        bestScore = score;
        best = artifact;
      }
    }
    return bestScore > 0 ? best : null;
  }

  private List<MonitorSourceContextLineVo> resolveSourceContext(
      Map<Long, JsonNode> sourceMapNodes,
      MonitorSourceMapArtifact artifact,
      String originalSource,
      Integer originalLine
  ) {
    if (originalSource == null || originalLine == null || originalLine <= 0) {
      return List.of();
    }

    JsonNode sourceMapNode = sourceMapNodes.computeIfAbsent(artifact.getId(), ignored -> parseSourceMapNode(artifact));
    JsonNode sourcesNode = sourceMapNode.get("sources");
    JsonNode sourcesContentNode = sourceMapNode.get("sourcesContent");
    if (sourcesNode == null || !sourcesNode.isArray() || sourcesContentNode == null || !sourcesContentNode.isArray()) {
      return List.of();
    }

    int sourceIndex = findBestSourceIndex(originalSource, sourcesNode);
    if (sourceIndex < 0 || sourceIndex >= sourcesContentNode.size()) {
      return List.of();
    }

    JsonNode contentNode = sourcesContentNode.get(sourceIndex);
    if (contentNode == null || contentNode.isNull()) {
      return List.of();
    }

    String[] lines = contentNode.asText("").split("\\R", -1);
    if (lines.length == 0) {
      return List.of();
    }

    int startLine = Math.max(1, originalLine - SOURCE_CONTEXT_RADIUS);
    int endLine = Math.min(lines.length, originalLine + SOURCE_CONTEXT_RADIUS);
    List<MonitorSourceContextLineVo> context = new ArrayList<>();
    for (int lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
      MonitorSourceContextLineVo line = new MonitorSourceContextLineVo();
      line.setLineNumber(lineNumber);
      line.setContent(lines[lineNumber - 1]);
      line.setFocus(lineNumber == originalLine);
      context.add(line);
    }
    return context;
  }

  private int findBestSourceIndex(String originalSource, JsonNode sourcesNode) {
    int bestIndex = -1;
    int bestScore = -1;
    for (int index = 0; index < sourcesNode.size(); index++) {
      JsonNode candidateNode = sourcesNode.get(index);
      if (candidateNode == null || candidateNode.isNull()) {
        continue;
      }
      int score = matchScore(originalSource, candidateNode.asText());
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  private int matchScore(String generatedFile, String artifact) {
    if (generatedFile == null || artifact == null || artifact.isBlank()) {
      return -1;
    }
    LinkedHashSet<String> candidates = new LinkedHashSet<>();
    candidates.add(generatedFile);

    String path = extractPath(generatedFile);
    if (path != null) {
      candidates.add(path);
      candidates.add(trimLeadingSlash(path));
    }

    String fileName = extractFileName(generatedFile);
    if (fileName != null) {
      candidates.add(fileName);
    }

    if (candidates.contains(artifact)) {
      return 4;
    }
    if (path != null && artifact.equals(path)) {
      return 3;
    }
    if (path != null && artifact.equals(trimLeadingSlash(path))) {
      return 2;
    }
    if (fileName != null && artifact.equals(fileName)) {
      return 1;
    }
    return -1;
  }

  private String buildResolvedLine(MonitorSourceMapFrameVo frame) {
    StringBuilder builder = new StringBuilder("    at ");
    if (frame.getFunctionName() != null) {
      builder.append(frame.getFunctionName()).append(" (");
    }
    builder.append(frame.getOriginalSource())
        .append(':')
        .append(frame.getOriginalLine())
        .append(':')
        .append(frame.getOriginalColumn());
    if (frame.getFunctionName() != null) {
      builder.append(')');
    }
    return builder.toString();
  }

  private String extractPath(String value) {
    try {
      URI uri = new URI(value);
      return trimToNull(uri.getPath());
    } catch (URISyntaxException ignored) {
      return null;
    }
  }

  private String extractFileName(String value) {
    String path = extractPath(value);
    if (path == null) {
      path = value;
    }
    int index = path.lastIndexOf('/');
    if (index >= 0 && index < path.length() - 1) {
      return path.substring(index + 1);
    }
    return trimToNull(path);
  }

  private String trimLeadingSlash(String value) {
    if (value == null) {
      return null;
    }
    return value.startsWith("/") ? value.substring(1) : value;
  }

  private Integer parseInteger(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return Integer.parseInt(value);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private void applyDefaultTimeRange(MonitorEventQuery query) {
    if (query.getEndTime() == null) {
      query.setEndTime(LocalDateTime.now());
    }
    if (query.getStartTime() == null) {
      query.setStartTime(query.getEndTime().minusHours(24));
    }
  }
}
