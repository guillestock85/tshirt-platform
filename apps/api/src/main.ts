import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import helmet from 'helmet'
import { json } from 'express'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)

  // Allow up to 10 MB JSON bodies (draft zonesData can contain base64 images)
  app.use(json({ limit: '10mb' }))

  // CORP: same-origin (helmet default) blocks cross-origin fetches even with CORS.
  // Set to cross-origin so the browser can read API responses from localhost:3000 → 3001.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

  // Allow the configured frontend origin plus the 127.0.0.1 variant
  // (preview browsers open on 127.0.0.1 even when FRONTEND_URL says localhost).
  const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  const allowedOrigins = [
    frontendOrigin,
    frontendOrigin.replace('localhost', '127.0.0.1'),
  ]

  app.enableCors({
    origin: (origin: string | undefined, cb: (e: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Id'],
  })

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.useGlobalFilters(new GlobalExceptionFilter())

  const port = process.env.PORT || 3001
  await app.listen(port, '0.0.0.0')
  logger.log(`API running on http://localhost:${port}/api/v1`)
}

bootstrap()