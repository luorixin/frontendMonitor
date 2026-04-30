package com.monitor.system.domain.vo;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthSessionVo {
  private String accessToken;
  private String refreshToken;
  private AuthUserVo user;
}
