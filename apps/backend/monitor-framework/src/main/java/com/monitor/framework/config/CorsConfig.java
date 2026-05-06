package com.monitor.framework.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
@ConfigurationProperties(prefix = "app.cors")
public class CorsConfig {

  private List<String> allowedOriginPatterns = List.of(
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:19006",
      "http://127.0.0.1:19006"
  );

  public void setAllowedOriginPatterns(List<String> allowedOriginPatterns) {
    this.allowedOriginPatterns = allowedOriginPatterns;
  }

  @Bean
  public CorsFilter corsFilter() {
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

    CorsConfiguration collectConfig = new CorsConfiguration();
    collectConfig.setAllowedOriginPatterns(List.of("*"));
    collectConfig.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
    collectConfig.setAllowedHeaders(List.of("*"));
    collectConfig.setAllowCredentials(false);
    source.registerCorsConfiguration("/api/v1/monitor/collect/**", collectConfig);
    source.registerCorsConfiguration("/api/v1/monitor/replays/**", collectConfig);

    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOriginPatterns(allowedOriginPatterns);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    source.registerCorsConfiguration("/api/**", config);
    return new CorsFilter(source);
  }
}
