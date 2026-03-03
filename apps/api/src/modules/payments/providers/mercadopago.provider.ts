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
    const accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN') ?? ''
    if (!accessToken) {
      this.logger.warn('MERCADOPAGO_ACCESS_TOKEN not set — payment endpoints will be unavailable')
    }
    this.client = new MercadoPagoConfig({ accessToken })
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

    // Support guest orders: user may be null, use guestEmail fallback
    const payerEmail: string =
      (order as any).guestEmail ?? order.user?.email ?? 'guest@remera.design'
    const payerName: string = order.user?.firstName ?? 'Cliente'
    const payerSurname: string = order.user?.lastName ?? ''

    const result = await preference.create({
      body: {
        external_reference: order.id,
        items,
        payer: {
          email: payerEmail,
          name: payerName,
          surname: payerSurname,
        },
        back_urls: {
          success: `${frontendUrl}/checkout/success?external_reference=${order.id}&collection_status=approved`,
          failure: `${frontendUrl}/checkout/success?external_reference=${order.id}&collection_status=failure`,
          pending: `${frontendUrl}/checkout/success?external_reference=${order.id}&collection_status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${apiUrl}/api/v1/payments/webhook`,
        statement_descriptor: 'REMERA DESIGN',
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
