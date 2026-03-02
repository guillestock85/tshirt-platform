import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { StorageService } from '../../infrastructure/storage/storage.interface'
import { UpdateOrderStatusDto, GetOrdersQueryDto } from './dto/admin.dto'
import { OrderStatus } from '@prisma/client'

// Admin can move orders through all transitions including force-corrections
const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED],
  IN_PRODUCTION: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getAllOrders(query: GetOrdersQueryDto) {
    const { status, page = 1, limit = 20 } = query
    const skip = (page - 1) * limit
    const where = status ? { status } : {}

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              productVariant: { include: { product: true } },
            },
          },
          payment: true,
          printJob: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ])

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getOrderDetails(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            productVariant: { include: { product: true } },
            upload: true,
          },
        },
        payment: true,
        printJob: true,
      },
    })

    if (!order) throw new NotFoundException('Pedido no encontrado')

    // Attach signed read URL to each item's upload
    const itemsWithUrls = await Promise.all(
      order.items.map(async (item) => {
        if (!item.upload) return item
        const url = await this.storage.generatePresignedReadUrl(item.upload.s3Key)
        return { ...item, upload: { ...item.upload, url } }
      }),
    )

    return { ...order, items: itemsWithUrls }
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { printJob: true },
    })

    if (!order) throw new NotFoundException('Pedido no encontrado')

    const allowed = ADMIN_TRANSITIONS[order.status]
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transición inválida: ${order.status} → ${dto.status}`,
      )
    }

    if (dto.status === OrderStatus.SHIPPED && !dto.trackingNumber) {
      throw new BadRequestException(
        'Se requiere número de seguimiento para marcar como enviado',
      )
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        ...(dto.notes != null ? { notes: dto.notes } : {}),
      },
    })

    // Create PrintJob when moving to IN_PRODUCTION
    if (dto.status === OrderStatus.IN_PRODUCTION) {
      if (!order.printJob) {
        await this.prisma.printJob.create({
          data: {
            orderId,
            status: 'PENDING',
            submittedAt: new Date(),
          },
        })
      }
    }

    // Update PrintJob with tracking when SHIPPED
    if (dto.status === OrderStatus.SHIPPED && dto.trackingNumber) {
      await this.prisma.printJob.upsert({
        where: { orderId },
        update: {
          status: 'COMPLETED',
          trackingNumber: dto.trackingNumber,
          trackingUrl: dto.trackingUrl,
          completedAt: new Date(),
        },
        create: {
          orderId,
          status: 'COMPLETED',
          trackingNumber: dto.trackingNumber,
          trackingUrl: dto.trackingUrl,
          submittedAt: new Date(),
          completedAt: new Date(),
        },
      })
    }

    this.logger.log(`Admin: order ${orderId} ${order.status} → ${dto.status}`)
    return updatedOrder
  }
}
