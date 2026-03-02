import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { UsersService } from '../users/users.service'
import { RegisterDto, LoginDto } from './dto/auth.dto'

import * as bcrypt from 'bcryptjs'
import { StringValue } from 'ms'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ================= REGISTER =================

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email)

    if (existing) {
      throw new ConflictException('El email ya está registrado')
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    })

    const tokens = await this.generateTokens(user.id, user.email, user.role)

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    }
  }

  // ================= LOGIN =================

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase())

    if (!user) throw new UnauthorizedException('Credenciales inválidas')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)

    if (!valid) throw new UnauthorizedException('Credenciales inválidas')

    const tokens = await this.generateTokens(user.id, user.email, user.role)

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    }
  }

  // ================= REFRESH =================

  async refresh(refreshToken: string) {
    let payload: any

    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException('Refresh inválido')
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
    })

    const match = await Promise.any(
      tokens.map((t: any) => bcrypt.compare(refreshToken, t.tokenHash)),
    ).catch(() => false)

    if (!match) {
      throw new UnauthorizedException('Refresh inválido')
    }

    // 🔥 refresh rotation
    await this.prisma.refreshToken.deleteMany({
      where: { userId: payload.sub },
    })

    const user = await this.usersService.findById(payload.sub)
    if (!user) throw new UnauthorizedException()

    return this.generateTokens(user.id, user.email, user.role)
  }

  // ================= TOKENS =================

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ) {
    const payload = { sub: userId, email, role }

    const jwtSecret = this.config.getOrThrow<string>('JWT_SECRET')
    const refreshSecret =
      this.config.getOrThrow<string>('JWT_REFRESH_SECRET')

    const expiresIn =
      this.config.getOrThrow<StringValue>('JWT_EXPIRES_IN')

    const refreshExpiresIn =
      this.config.getOrThrow<StringValue>('JWT_REFRESH_EXPIRES_IN')

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: jwtSecret,
        expiresIn,
      }),
      this.jwt.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ])

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10)

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return { accessToken, refreshToken }
  }

  // ================= HELPERS =================

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user
    return safe
  }
}