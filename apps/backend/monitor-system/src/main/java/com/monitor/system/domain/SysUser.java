package com.monitor.system.domain;

import com.monitor.core.domain.BaseEntity;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SysUser extends BaseEntity {
  private Long id;
  private String username;
  private String email;
  private String password;
  private String nickname;
  private String avatar;
  private Integer status;
  private Integer delFlag;
  private String loginIp;
  private LocalDateTime loginDate;
}
