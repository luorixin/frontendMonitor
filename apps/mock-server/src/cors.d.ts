declare module "cors" {
  import type { RequestHandler } from "express"

  type CorsMiddleware = (options?: unknown) => RequestHandler

  const cors: CorsMiddleware
  export default cors
}
