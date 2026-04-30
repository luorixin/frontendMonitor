package com.monitor.system.service.impl;

import com.monitor.exception.ServiceException;
import com.monitor.system.domain.SysUser;
import com.monitor.system.mapper.SysUserMapper;
import com.monitor.system.service.ICurrentUserService;
import com.monitor.utils.SecurityUtils;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserServiceImpl implements ICurrentUserService {

  private final SysUserMapper sysUserMapper;

  public CurrentUserServiceImpl(SysUserMapper sysUserMapper) {
    this.sysUserMapper = sysUserMapper;
  }

  @Override
  public Long getCurrentUserId() {
    String username = SecurityUtils.getUsername();
    if (username == null || username.isBlank()) {
      throw new ServiceException(401, "auth.errors.unauthorized");
    }

    SysUser user = sysUserMapper.selectUserByUsername(username);
    if (user == null) {
      user = sysUserMapper.selectUserByEmail(username);
    }

    if (user == null) {
      throw new ServiceException(401, "auth.errors.unauthorized");
    }

    return user.getId();
  }
}
