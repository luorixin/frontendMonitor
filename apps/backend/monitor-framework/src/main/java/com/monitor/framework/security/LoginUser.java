package com.monitor.framework.security;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.monitor.system.domain.SysUser;
import java.util.Collection;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Getter
@Setter
public class LoginUser implements UserDetails {
  private Long userId;
  private String token;
  private Long loginTime;
  private Long expireTime;
  private SysUser user;
  private Set<String> permissions;

  public LoginUser() {}

  public LoginUser(SysUser user, Set<String> permissions) {
    this.userId = user.getId();
    this.user = user;
    this.permissions = permissions;
  }

  @Override
  @JsonIgnore
  public String getUsername() {
    return user.getUsername();
  }

  @Override
  @JsonIgnore
  public String getPassword() {
    return user.getPassword();
  }

  @Override
  @JsonIgnore
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return Set.of();
  }

  @Override
  @JsonIgnore
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  @JsonIgnore
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  @JsonIgnore
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  @JsonIgnore
  public boolean isEnabled() {
    return user.getStatus() == null || user.getStatus() == 1;
  }
}
