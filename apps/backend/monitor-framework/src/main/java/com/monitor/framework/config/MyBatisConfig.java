package com.monitor.framework.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("com.monitor.system.mapper")
public class MyBatisConfig {
}
