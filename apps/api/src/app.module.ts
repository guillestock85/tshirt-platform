import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './infrastructure/config/env.validation'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { UploadsModule } from './modules/uploads/uploads.module'
import { ProductsModule } from './modules/products/products.module'
import { OrdersModule } from './modules/orders/orders.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { AdminModule } from './modules/admin/admin.module'
import { DraftsModule } from './modules/drafts/drafts.module'
import { CartModule } from './modules/cart/cart.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    AuthModule,
    UsersModule,
    UploadsModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    AdminModule,
    DraftsModule,
    CartModule,
  ],
})
export class AppModule {}