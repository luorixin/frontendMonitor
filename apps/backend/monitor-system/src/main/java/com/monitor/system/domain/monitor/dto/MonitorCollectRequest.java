package com.monitor.system.domain.monitor.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonitorCollectRequest {
  @Valid
  @NotNull
  private MonitorCollectBaseDto base;

  @NotEmpty
  private List<JsonNode> events;
}
