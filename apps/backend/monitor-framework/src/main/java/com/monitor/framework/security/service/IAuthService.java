package com.monitor.framework.security.service;

import com.monitor.system.domain.dto.LoginBody;
import com.monitor.system.domain.dto.RefreshTokenBody;
import com.monitor.system.domain.vo.AuthSessionVo;

public interface IAuthService {
  AuthSessionVo login(LoginBody body);

  AuthSessionVo refresh(RefreshTokenBody body);

  void logout();
}
