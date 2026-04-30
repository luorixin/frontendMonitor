package com.monitor.utils;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class SecurityUtils {

  private SecurityUtils() {}

  public static Authentication getAuthentication() {
    return SecurityContextHolder.getContext().getAuthentication();
  }

  public static String getUsername() {
    Authentication authentication = getAuthentication();
    if (authentication == null) {
      return null;
    }
    return authentication.getName();
  }

  public static String encryptPassword(String password) {
    return new BCryptPasswordEncoder().encode(password);
  }

  public static boolean matchesPassword(String rawPassword, String encodedPassword) {
    return new BCryptPasswordEncoder().matches(rawPassword, encodedPassword);
  }
}
