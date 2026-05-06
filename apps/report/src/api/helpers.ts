import type { ApiEnvelope, TableEnvelope } from "../types/api"

const ERROR_MESSAGES: Record<string, string> = {
  "auth.errors.expiredAccessToken": "登录已过期，请重新登录",
  "auth.errors.forbidden": "当前账号没有访问权限",
  "auth.errors.invalidCredentials": "用户名或密码错误",
  "auth.errors.invalidRefreshToken": "登录状态已失效，请重新登录",
  "auth.errors.missingLoginId": "请输入用户名或邮箱",
  "auth.errors.passwordRequired": "请输入密码",
  "auth.errors.refreshTokenRequired": "缺少刷新令牌",
  "auth.errors.unauthorized": "请先登录"
}

export function unwrapApi<T>(payload: ApiEnvelope<T>) {
  return payload.data
}

export function unwrapTable<T>(payload: TableEnvelope<T>) {
  return payload
}

export function getErrorMessage(reason: unknown, fallback: string) {
  if (!(reason instanceof Error)) {
    return fallback
  }

  return ERROR_MESSAGES[reason.message] || reason.message || fallback
}
