import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { CreateProductDto, CreateVariantDto } from './dto/product.dto'

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true },
    })

    if (!product) {
      throw new NotFoundException('Producto no encontrado')
    }

    return product
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    })

    if (!product) {
      throw new NotFoundException('Producto no encontrado')
    }

    return product
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        basePrice: dto.basePrice,
      },
    })
  }

  async addVariant(productId: string, dto: CreateVariantDto) {
    await this.findById(productId)

    return this.prisma.productVariant.create({
      data: {
        productId,
        color: dto.color,
        colorHex: dto.colorHex,
        size: dto.size,
        additionalPrice: dto.additionalPrice ?? 0,
      },
    })
  }

  async seedDefaultProduct() {
    const existing = await this.prisma.product.findUnique({
      where: { slug: 'remera-clasica' },
    })

    if (existing) return existing

    const product = await this.prisma.product.create({
      data: {
        name: 'Remera Clásica',
        slug: 'remera-clasica',
        description: 'Remera 100% algodón, corte regular',
        basePrice: 4500,
        variants: {
          create: [
            { color: 'Blanco', colorHex: '#FFFFFF', size: 'XS' },
            { color: 'Blanco', colorHex: '#FFFFFF', size: 'S' },
            { color: 'Blanco', colorHex: '#FFFFFF', size: 'M' },
            { color: 'Blanco', colorHex: '#FFFFFF', size: 'L' },
            { color: 'Blanco', colorHex: '#FFFFFF', size: 'XL' },
            { color: 'Blanco', colorHex: '#FFFFFF', size: 'XXL' },
            { color: 'Negro', colorHex: '#1A1A1A', size: 'XS' },
            { color: 'Negro', colorHex: '#1A1A1A', size: 'S' },
            { color: 'Negro', colorHex: '#1A1A1A', size: 'M' },
            { color: 'Negro', colorHex: '#1A1A1A', size: 'L' },
            { color: 'Negro', colorHex: '#1A1A1A', size: 'XL' },
            { color: 'Negro', colorHex: '#1A1A1A', size: 'XXL' },
            { color: 'Gris', colorHex: '#808080', size: 'S' },
            { color: 'Gris', colorHex: '#808080', size: 'M' },
            { color: 'Gris', colorHex: '#808080', size: 'L' },
            { color: 'Gris', colorHex: '#808080', size: 'XL' },
          ],
        },
      },
      include: { variants: true },
    })

    return product
  }

  async seedAllProducts() {
    const catalogue = [
      {
        name: 'Remera Clásica',
        slug: 'remera-clasica',
        description: 'Remera 100% algodón, corte regular',
        basePrice: 4500,
        variants: [
          { color: 'Blanco', colorHex: '#FFFFFF' },
          { color: 'Negro', colorHex: '#1A1A1A' },
          { color: 'Gris', colorHex: '#808080' },
          { color: 'Azul marino', colorHex: '#1B2A4A' },
          { color: 'Rojo', colorHex: '#C0392B' },
        ],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      },
      {
        name: 'Remera Oversize',
        slug: 'remera-oversize',
        description: 'Remera oversize, corte amplio, 100% algodón',
        basePrice: 5500,
        variants: [
          { color: 'Blanco', colorHex: '#FFFFFF' },
          { color: 'Negro', colorHex: '#1A1A1A' },
          { color: 'Arena', colorHex: '#C8B89A' },
          { color: 'Verde', colorHex: '#4A7C59' },
        ],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      },
      {
        name: 'Buzo con Capucha',
        slug: 'buzo-capucha',
        description: 'Hoodie frizado interior, bolsillo canguro',
        basePrice: 9500,
        variants: [
          { color: 'Negro', colorHex: '#1A1A1A' },
          { color: 'Gris', colorHex: '#808080' },
          { color: 'Azul marino', colorHex: '#1B2A4A' },
          { color: 'Blanco', colorHex: '#F5F5F5' },
        ],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      },
    ]

    const results = []

    for (const item of catalogue) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: item.slug },
        include: { variants: true },
      })
      if (existing) {
        results.push(existing)
        continue
      }

      const variantRows = item.variants.flatMap((v) =>
        item.sizes.map((size) => ({
          color: v.color,
          colorHex: v.colorHex,
          size,
          additionalPrice:
            item.slug === 'remera-oversize' && size === 'XXL' ? 500 : 0,
        })),
      )

      const product = await this.prisma.product.create({
        data: {
          name: item.name,
          slug: item.slug,
          description: item.description,
          basePrice: item.basePrice,
          variants: { create: variantRows },
        },
        include: { variants: true },
      })
      results.push(product)
    }

    return results
  }
}