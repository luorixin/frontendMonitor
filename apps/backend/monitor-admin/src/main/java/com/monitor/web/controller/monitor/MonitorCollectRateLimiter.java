package com.monitor.web.controller.monitor;

import com.monitor.exception.ServiceException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class MonitorCollectRateLimiter {

  private static final DateTimeFormatter MINUTE_FORMAT =
      DateTimeFormatter.ofPattern("yyyyMMddHHmm");

  private final StringRedisTemplate redisTemplate;
  private final int rateLimitPerMinute;
  private final Map<String, AtomicInteger> fallbackCounters = new ConcurrentHashMap<>();

  public MonitorCollectRateLimiter(
      ObjectProvider<StringRedisTemplate> redisTemplateProvider,
      @Value("${app.monitor.collect.rate-limit-per-minute:6000}") int rateLimitPerMinute
  ) {
    this.redisTemplate = redisTemplateProvider.getIfAvailable();
    this.rateLimitPerMinute = Math.max(1, rateLimitPerMinute);
  }

  public void check(String projectKey) {
    String key = "monitor:collect:rate:" + projectKey + ":" + currentMinute();
    long count = increment(key);
    if (count > rateLimitPerMinute) {
      throw new ServiceException(429, "monitor.errors.rateLimited");
    }
  }

  private long increment(String key) {
    if (redisTemplate != null) {
      try {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
          redisTemplate.expire(key, Duration.ofMinutes(2));
        }
        if (count != null) {
          return count;
        }
      } catch (RuntimeException ignored) {
        // Fall through to the in-memory counter for local tests or Redis outages.
      }
    }

    return fallbackCounters
        .computeIfAbsent(key, ignored -> new AtomicInteger())
        .incrementAndGet();
  }

  private String currentMinute() {
    return LocalDateTime.now().format(MINUTE_FORMAT);
  }
}
