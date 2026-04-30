package com.monitor.system.mapper;

import com.monitor.system.domain.SysUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SysUserMapper {
  SysUser selectUserByUsername(@Param("username") String username);

  SysUser selectUserByEmail(@Param("email") String email);

  SysUser selectUserById(@Param("id") Long id);
}
