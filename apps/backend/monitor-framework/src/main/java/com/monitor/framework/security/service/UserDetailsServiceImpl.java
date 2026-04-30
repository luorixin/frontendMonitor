package com.monitor.framework.security.service;

import com.monitor.exception.ServiceException;
import com.monitor.framework.security.LoginUser;
import com.monitor.system.domain.SysUser;
import com.monitor.system.service.ISysUserService;
import java.util.HashSet;
import java.util.Set;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

  private final ISysUserService userService;

  public UserDetailsServiceImpl(ISysUserService userService) {
    this.userService = userService;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    SysUser user = userService.selectUserByUsername(username);
    if (user == null) {
      user = userService.selectUserByEmail(username);
    }
    if (user == null) {
      throw new ServiceException(401, "auth.errors.invalidCredentials");
    }

    Set<String> permissions = new HashSet<>();
    permissions.add("*:*:*");
    return new LoginUser(user, permissions);
  }
}
