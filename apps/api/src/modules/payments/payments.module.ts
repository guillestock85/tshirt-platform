import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { IPaymentProvider } from './providers/payment-provider.interface'
import { MercadoPagoProvider } from './providers/mercadopago.provider'

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PrismaService,
    {
      provide: IPaymentProvider,
      useClass: MercadoPagoProvider,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
