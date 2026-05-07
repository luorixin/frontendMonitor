package com.monitor.framework.config;

import com.monitor.framework.security.filter.JwtAuthenticationTokenFilter;
import com.monitor.framework.web.filter.MonitorGzipRequestFilter;
import com.monitor.framework.security.handler.AccessDeniedHandlerImpl;
import com.monitor.framework.security.handler.AuthenticationEntryPointImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
public class SecurityConfig {

  @Bean
  public BCryptPasswordEncoder bCryptPasswordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
      throws Exception {
    return config.getAuthenticationManager();
  }

  @Bean
  public SecurityFilterChain filterChain(
      HttpSecurity http,
      MonitorGzipRequestFilter monitorGzipRequestFilter,
      JwtAuthenticationTokenFilter jwtFilter,
      AuthenticationEntryPointImpl authEntryPoint,
      AccessDeniedHandlerImpl accessDeniedHandler
  ) throws Exception {
    http
        .csrf(AbstractHttpConfigurer::disable)
        .cors(cors -> {})
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(handling -> handling
            .authenticationEntryPoint(authEntryPoint)
            .accessDeniedHandler(accessDeniedHandler)
        )
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/v1/monitor/health").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/v1/monitor/collect/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/monitor/collect/**").permitAll()
            .requestMatchers(HttpMethod.OPTIONS, "/api/v1/monitor/collect/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/v1/monitor/replays/**").permitAll()
            .requestMatchers(HttpMethod.OPTIONS, "/api/v1/monitor/replays/**").permitAll()
            .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
            .anyRequest().authenticated()
        )
        .addFilterBefore(monitorGzipRequestFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }
}
