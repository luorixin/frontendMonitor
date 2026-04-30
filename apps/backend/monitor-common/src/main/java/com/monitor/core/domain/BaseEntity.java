package com.monitor.core.domain;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

public class BaseEntity implements Serializable {
  @JsonIgnore
  private String searchValue;

  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime createTime;

  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
  private LocalDateTime updateTime;

  @JsonInclude(JsonInclude.Include.NON_EMPTY)
  private Map<String, Object> params;

  public String getSearchValue() { return searchValue; }
  public void setSearchValue(String searchValue) { this.searchValue = searchValue; }
  public LocalDateTime getCreateTime() { return createTime; }
  public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
  public LocalDateTime getUpdateTime() { return updateTime; }
  public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }
  public Map<String, Object> getParams() {
    if (params == null) params = new HashMap<>();
    return params;
  }
  public void setParams(Map<String, Object> params) { this.params = params; }
}
