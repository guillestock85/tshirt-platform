import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AdminService } from './admin.service'
import { UpdateOrderStatusDto, GetOrdersQueryDto } from './dto/admin.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('orders')
  getAllOrders(@Query() query: GetOrdersQueryDto) {
    return this.adminService.getAllOrders(query)
  }

  @Get('orders/:id')
  getOrderDetails(@Param('id') id: string) {
    return this.adminService.getOrderDetails(id)
  }

  @Patch('orders/:id/status')
  @HttpCode(HttpStatus.OK)
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, dto)
  }
}
