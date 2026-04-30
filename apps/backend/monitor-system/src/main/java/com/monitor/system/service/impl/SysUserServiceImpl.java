package com.monitor.system.service.impl;

import com.monitor.system.domain.SysUser;
import com.monitor.system.mapper.SysUserMapper;
import com.monitor.system.service.ISysUserService;
import org.springframework.stereotype.Service;

@Service
public class SysUserServiceImpl implements ISysUserService {
  private final SysUserMapper sysUserMapper;

  public SysUserServiceImpl(SysUserMapper sysUserMapper) {
    this.sysUserMapper = sysUserMapper;
  }

  @Override
  public SysUser selectUserByUsername(String username) {
    return sysUserMapper.selectUserByUsername(username);
  }

  @Override
  public SysUser selectUserByEmail(String email) {
    return sysUserMapper.selectUserByEmail(email);
  }
}
