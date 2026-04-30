package com.monitor.framework.security.service;

import com.monitor.exception.ServiceException;
import com.monitor.framework.security.LoginUser;
import com.monitor.system.domain.dto.LoginBody;
import com.monitor.system.domain.dto.RefreshTokenBody;
import com.monitor.system.domain.vo.AuthSessionVo;
import com.monitor.system.domain.vo.AuthUserVo;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements IAuthService {

  private final AuthenticationManager authenticationManager;
  private final TokenService tokenService;

  public AuthServiceImpl(AuthenticationManager authenticationManager, TokenService tokenService) {
    this.authenticationManager = authenticationManager;
    this.tokenService = tokenService;
  }

  @Override
  public AuthSessionVo login(LoginBody body) {
    String loginId = body.getUsername() != null && !body.getUsername().isBlank()
        ? body.getUsername().trim()
        : body.getEmail() != null ? body.getEmail().trim() : null;

    if (loginId == null) {
      throw new ServiceException(400, "auth.errors.missingLoginId");
    }

    Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(loginId, body.getPassword())
    );

    LoginUser loginUser = (LoginUser) authentication.getPrincipal();
    String accessToken = tokenService.createToken(loginUser);
    String refreshToken = tokenService.createRefreshToken(loginUser);

    return new AuthSessionVo(
        accessToken,
        refreshToken,
        new AuthUserVo(loginUser.getUser().getEmail())
    );
  }

  @Override
  public AuthSessionVo refresh(RefreshTokenBody body) {
    String refreshToken = body.getRefreshToken().trim();
    if (refreshToken.isEmpty()) {
      throw new ServiceException(400, "auth.errors.refreshTokenRequired");
    }

    LoginUser loginUser = tokenService.getLoginUserByRefreshToken(refreshToken);
    String accessToken = tokenService.createToken(loginUser);
    String newRefreshToken = tokenService.rotateRefreshToken(refreshToken, loginUser);

    return new AuthSessionVo(
        accessToken,
        newRefreshToken,
        new AuthUserVo(loginUser.getUser().getEmail())
    );
  }

  @Override
  public void logout() {
    // Stateless JWT — client discards the token
  }
}
