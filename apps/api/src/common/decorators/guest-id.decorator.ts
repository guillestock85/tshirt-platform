import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * Extracts the X-Guest-Id header from the request.
 * Returns undefined if the header is not present.
 */
export const GuestId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest()
    const guestId = request.headers['x-guest-id']
    return typeof guestId === 'string' && guestId.trim() ? guestId.trim() : undefined
  },
)
