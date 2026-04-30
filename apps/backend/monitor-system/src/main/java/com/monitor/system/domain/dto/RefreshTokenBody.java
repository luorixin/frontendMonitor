package com.monitor.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefreshTokenBody {
  @NotBlank(message = "auth.errors.refreshTokenRequired")
  private String refreshToken;
}
