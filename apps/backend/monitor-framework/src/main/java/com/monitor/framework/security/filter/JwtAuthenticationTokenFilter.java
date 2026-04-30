package com.monitor.framework.security.filter;

import com.monitor.framework.security.LoginUser;
import com.monitor.framework.security.service.TokenService;
import com.monitor.utils.SecurityUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationTokenFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationTokenFilter.class);

  private final TokenService tokenService;

  public JwtAuthenticationTokenFilter(TokenService tokenService) {
    this.tokenService = tokenService;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    LoginUser loginUser = null;

    try {
      String token = getToken(request);
      if (StringUtils.hasText(token)) {
        loginUser = tokenService.getLoginUser(token);
      }
    } catch (Exception e) {
      log.warn("JWT token validation failed: {}", e.getMessage());
    }

    if (loginUser != null && SecurityUtils.getAuthentication() == null) {
      tokenService.verifyToken(loginUser);
      UsernamePasswordAuthenticationToken authToken =
          new UsernamePasswordAuthenticationToken(loginUser, null, loginUser.getAuthorities());
      authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
      SecurityContextHolder.getContext().setAuthentication(authToken);
    }

    filterChain.doFilter(request, response);
  }

  private String getToken(HttpServletRequest request) {
    String header = request.getHeader("Authorization");
    if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
      return header.substring(7).trim();
    }
    return null;
  }
}
