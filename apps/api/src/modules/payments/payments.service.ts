import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { IPaymentProvider } from './providers/payment-provider.interface'
import { OrderStatus, PaymentStatus } from '@prisma/client'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentProvider: IPaymentProvider,
  ) {}

  async createPreference(
    orderId: string,
    userId?: string,
    guestId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            productVariant: { include: { product: true } },
          },
        },
        payment: true,
      },
    })

    if (!order) throw new NotFoundException('Pedido no encontrado')

    const ownedByUser = userId && order.userId === userId
    const ownedByGuest = guestId && order.guestId === guestId
    if (!ownedByUser && !ownedByGuest) {
      throw new BadRequestException('No tenés acceso a este pedido')
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `El pedido debe estar en estado CONFIRMED para iniciar el pago (estado actual: ${order.status})`,
      )
    }

    if (order.payment) {
      throw new BadRequestException('Este pedido ya tiene un pago iniciado')
    }

    const preference = await this.paymentProvider.createPreference(order as any)

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: this.paymentProvider.name,
        status: PaymentStatus.PENDING,
        amount: order.total,
        currency: order.currency,
        providerResponse: { preferenceId: preference.preferenceId },
      },
    })

    return preference
  }

  async handleWebhook(payload: { type?: string; action?: string; data?: { id: string } }) {
    if (payload.type !== 'payment') {
      this.logger.debug(`Ignoring non-payment webhook: type=${payload.type}`)
      return { received: true }
    }

    const paymentId = payload.data?.id
    if (!paymentId) {
      this.logger.warn('Webhook received without payment id')
      return { received: true }
    }

    let details: Awaited<ReturnType<typeof this.paymentProvider.getPaymentDetails>>
    try {
      details = await this.paymentProvider.getPaymentDetails(paymentId)
    } catch (err) {
      this.logger.error(`Failed to fetch payment details for id=${paymentId}`, err)
      return { received: true }
    }

    const orderId = details.externalReference
    if (!orderId) {
      this.logger.warn(`Payment ${paymentId} has no external_reference`)
      return { received: true }
    }

    const newPaymentStatus = this.mapPaymentStatus(details.status)
    const newOrderStatus = details.status === 'approved' ? OrderStatus.PAID : null

    const existingPayment = await this.prisma.payment.findFirst({
      where: { orderId },
    })

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: newPaymentStatus,
          providerPaymentId: paymentId,
          providerResponse: details.raw as any,
        },
      })
    } else {
      // Webhook arrived before preference was confirmed – create record
      const order = await this.prisma.order.findUnique({ where: { id: orderId } })
      if (order) {
        await this.prisma.payment.create({
          data: {
            orderId,
            provider: this.paymentProvider.name,
            providerPaymentId: paymentId,
            status: newPaymentStatus,
            amount: order.total,
            currency: order.currency,
            providerResponse: details.raw as any,
          },
        })
      }
    }

    if (newOrderStatus) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } })
      if (order && order.status === OrderStatus.CONFIRMED) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: newOrderStatus },
        })
        this.logger.log(`Order ${orderId} → ${newOrderStatus} (payment ${paymentId} approved)`)
      }
    }

    return { received: true }
  }

  private mapPaymentStatus(mpStatus: string): PaymentStatus {
    switch (mpStatus) {
      case 'approved':
        return PaymentStatus.APPROVED
      case 'rejected':
        return PaymentStatus.REJECTED
      case 'cancelled':
        return PaymentStatus.CANCELLED
      default:
        return PaymentStatus.PENDING
    }
  }
}
