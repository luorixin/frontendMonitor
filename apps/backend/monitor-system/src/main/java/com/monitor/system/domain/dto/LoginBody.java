package com.monitor.system.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginBody {
  private String username;
  private String email;

  @NotBlank(message = "auth.errors.passwordRequired")
  private String password;
}
