package com.monitor.system.service;

import com.monitor.system.domain.SysUser;

public interface ISysUserService {
  SysUser selectUserByUsername(String username);

  SysUser selectUserByEmail(String email);
}
