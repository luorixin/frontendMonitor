package com.monitor.framework.security.service;

import com.monitor.constant.CacheConstants;
import com.monitor.constant.Constants;
import com.monitor.exception.ServiceException;
import com.monitor.framework.security.LoginUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

  private static final long MILLIS_MINUTE = 60 * 1000L;
  private static final long MILLIS_MINUTE_TEN = 20 * 60 * 1000L;

  private final RedisTemplate<String, Object> redisTemplate;
  private final SecretKey secretKey;

  @Value("${app.auth.access-token-ttl:30}")
  private long expireTime;

  @Value("${app.auth.refresh-token-ttl:720}")
  private long refreshExpireTime;

  @Value("${app.auth.issuer:quiz-backend}")
  private String issuer;

  public TokenService(
      @Qualifier("quizRedisTemplate") RedisTemplate<String, Object> redisTemplate,
      @Value("${app.auth.jwt-secret}") String jwtSecret
  ) {
    this.redisTemplate = redisTemplate;
    this.secretKey = Keys.hmacShaKeyFor(resolveSecret(jwtSecret));
  }

  public String createToken(LoginUser loginUser) {
    String loginUserKey = UUID.randomUUID().toString();
    loginUser.setToken(loginUserKey);

    refreshLoginUser(loginUser);

    Map<String, Object> claims = new HashMap<>();
    claims.put(Constants.LOGIN_USER_KEY, loginUserKey);
    claims.put(Constants.JWT_USERNAME, loginUser.getUsername());

    return Jwts.builder()
        .subject(loginUser.getUsername())
        .issuer(issuer)
        .claims(claims)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + expireTime * MILLIS_MINUTE))
        .signWith(secretKey)
        .compact();
  }

  public String createRefreshToken(LoginUser loginUser) {
    String refreshToken = UUID.randomUUID().toString();
    String key = CacheConstants.REFRESH_TOKEN_KEY + refreshToken;
    redisTemplate.opsForValue().set(key, loginUser, refreshExpireTime, TimeUnit.MINUTES);
    return refreshToken;
  }

  public LoginUser getLoginUserByRefreshToken(String refreshToken) {
    String key = CacheConstants.REFRESH_TOKEN_KEY + refreshToken;
    Object cached = redisTemplate.opsForValue().get(key);
    if (!(cached instanceof LoginUser loginUser)) {
      throw new ServiceException(401, "auth.errors.invalidRefreshToken");
    }
    return loginUser;
  }

  public String rotateRefreshToken(String previousRefreshToken, LoginUser loginUser) {
    delRefreshToken(previousRefreshToken);
    return createRefreshToken(loginUser);
  }

  public void refreshLoginUser(LoginUser loginUser) {
    loginUser.setLoginTime(System.currentTimeMillis());
    loginUser.setExpireTime(loginUser.getLoginTime() + expireTime * MILLIS_MINUTE);

    String key = CacheConstants.LOGIN_TOKEN_KEY + loginUser.getToken();
    redisTemplate.opsForValue().set(key, loginUser, expireTime, TimeUnit.MINUTES);
  }

  public LoginUser getLoginUser(String token) {
    try {
      Claims claims = Jwts.parser()
          .verifyWith(secretKey)
          .build()
          .parseSignedClaims(token)
          .getPayload();

      String loginUserKey = claims.get(Constants.LOGIN_USER_KEY, String.class);
      String key = CacheConstants.LOGIN_TOKEN_KEY + loginUserKey;

      LoginUser loginUser = (LoginUser) redisTemplate.opsForValue().get(key);
      if (loginUser == null) {
        throw new ServiceException(401, "auth.errors.expiredAccessToken");
      }

      return loginUser;
    } catch (ExpiredJwtException e) {
      throw new ServiceException(401, "auth.errors.expiredAccessToken");
    } catch (JwtException | IllegalArgumentException e) {
      throw new ServiceException(401, "auth.errors.invalidAccessToken");
    }
  }

  public void verifyToken(LoginUser loginUser) {
    long currentTime = System.currentTimeMillis();
    if (currentTime - loginUser.getLoginTime() > MILLIS_MINUTE_TEN) {
      refreshLoginUser(loginUser);
    }
  }

  public void delLoginUser(String token) {
    try {
      Claims claims = Jwts.parser()
          .verifyWith(secretKey)
          .build()
          .parseSignedClaims(token)
          .getPayload();

      String loginUserKey = claims.get(Constants.LOGIN_USER_KEY, String.class);
      String key = CacheConstants.LOGIN_TOKEN_KEY + loginUserKey;
      redisTemplate.delete(key);
    } catch (JwtException ignored) {
      // token already invalid
    }
  }

  public void delRefreshToken(String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      return;
    }
    redisTemplate.delete(CacheConstants.REFRESH_TOKEN_KEY + refreshToken);
  }

  private byte[] resolveSecret(String secret) {
    try {
      return Decoders.BASE64.decode(secret);
    } catch (RuntimeException ignored) {
      return secret.getBytes(StandardCharsets.UTF_8);
    }
  }
}
