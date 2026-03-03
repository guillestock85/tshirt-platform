import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Optional JWT guard — populates request.user if a valid token is present,
 * but does NOT throw if the token is absent or invalid.
 * Use this for endpoints that work for both guests and authenticated users.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest<TUser>(err: unknown, user: TUser, _info: unknown, _ctx: ExecutionContext): TUser {
    // Return user if valid, or undefined without throwing
    return user
  }

  canActivate(context: ExecutionContext) {
    // Always run the passport strategy; errors are swallowed in handleRequest
    return super.canActivate(context)
  }
}
