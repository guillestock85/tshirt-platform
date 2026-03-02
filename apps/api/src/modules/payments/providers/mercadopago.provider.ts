import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import {
  IPaymentProvider,
  OrderWithRelations,
  PaymentPreference,
  PaymentDetails,
} from './payment-provider.interface'

@Injectable()
export class MercadoPagoProvider extends IPaymentProvider {
  readonly name = 'MERCADOPAGO'
  private readonly logger = new Logger(MercadoPagoProvider.name)
  private readonly client: MercadoPagoConfig

  constructor(private readonly config: ConfigService) {
    super()
    this.client = new MercadoPagoConfig({
      accessToken: this.config.getOrThrow<string>('MERCADOPAGO_ACCESS_TOKEN'),
    })
  }

  async createPreference(order: OrderWithRelations): Promise<PaymentPreference> {
    const preference = new Preference(this.client)

    const items = order.items.map((item) => ({
      id: item.productVariantId,
      title: `${item.productVariant.product.name} – ${item.productVariant.color} ${item.productVariant.size}`,
      currency_id: order.currency,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }))

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL')
    const apiUrl = this.config.getOrThrow<string>('API_URL')

    const result = await preference.create({
      body: {
        external_reference: order.id,
        items,
        payer: {
          email: order.user.email,
          name: order.user.firstName,
          surname: order.user.lastName,
        },
        back_urls: {
          success: `${frontendUrl}/orders/${order.id}?payment=success`,
          failure: `${frontendUrl}/orders/${order.id}?payment=failure`,
          pending: `${frontendUrl}/orders/${order.id}?payment=pending`,
        },
        auto_return: 'approved',
        notification_url: `${apiUrl}/api/v1/payments/webhook`,
        statement_descriptor: 'TSHIRT PLATFORM',
      },
    })

    this.logger.log(`Preference created: ${result.id} for order ${order.id}`)

    return {
      preferenceId: result.id!,
      initPoint: result.init_point!,
      sandboxInitPoint: result.sandbox_init_point!,
      externalReference: order.id,
    }
  }

  async getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
    const paymentApi = new Payment(this.client)
    const result = await paymentApi.get({ id: paymentId })

    return {
      id: String(result.id),
      status: result.status ?? 'pending',
      externalReference: result.external_reference ?? '',
      amount: result.transaction_amount ?? 0,
      currency: result.currency_id ?? 'ARS',
      raw: result as unknown as Record<string, unknown>,
    }
  }
}
