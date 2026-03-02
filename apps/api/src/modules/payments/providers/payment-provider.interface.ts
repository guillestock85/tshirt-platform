import { Order, OrderItem, ProductVariant, Product, User } from '@prisma/client'

export type OrderWithRelations = Order & {
  user: User
  items: (OrderItem & {
    productVariant: ProductVariant & { product: Product }
  })[]
}

export interface PaymentPreference {
  preferenceId: string
  initPoint: string
  sandboxInitPoint: string
  externalReference: string
}

export interface PaymentDetails {
  id: string
  /** MercadoPago statuses: approved | rejected | pending | cancelled | in_process */
  status: string
  externalReference: string
  amount: number
  currency: string
  raw: Record<string, unknown>
}

export abstract class IPaymentProvider {
  abstract readonly name: string
  abstract createPreference(order: OrderWithRelations): Promise<PaymentPreference>
  abstract getPaymentDetails(paymentId: string): Promise<PaymentDetails>
}
