import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Like JwtAuthGuard but never throws — unauthenticated requests pass through
 * with req.user = null, allowing endpoints to serve both authenticated users
 * and guests identified only by X-Guest-Id header.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Let passport try to authenticate, but catch any error
    return super.canActivate(context)
  }

  // Override: return user if found, null if not — never throw
  handleRequest(_err: unknown, user: unknown) {
    return user ?? null
  }
}
