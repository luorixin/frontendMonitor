package com.monitor.web.controller.system;

import com.monitor.core.domain.ApiResponse;
import com.monitor.system.domain.dto.LoginBody;
import com.monitor.system.domain.dto.RefreshTokenBody;
import com.monitor.system.domain.vo.AuthSessionVo;
import com.monitor.framework.security.service.IAuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final IAuthService authService;

  public AuthController(IAuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  public ApiResponse<AuthSessionVo> login(@Valid @RequestBody LoginBody body) {
    return ApiResponse.ok(authService.login(body));
  }

  @PostMapping("/refresh")
  public ApiResponse<AuthSessionVo> refresh(@Valid @RequestBody RefreshTokenBody body) {
    return ApiResponse.ok(authService.refresh(body));
  }

  @PostMapping("/logout")
  public ApiResponse<Void> logout() {
    authService.logout();
    return ApiResponse.ok("已登出", null);
  }
}
