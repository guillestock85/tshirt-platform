-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "draft_designs" (
    "id" TEXT NOT NULL,
    "guestId" TEXT,
    "userId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "zonesData" JSONB NOT NULL DEFAULT '{}',
    "uploadIds" JSONB NOT NULL DEFAULT '{}',
    "previewS3Key" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "guestId" TEXT,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "draftDesignId" TEXT,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceSnapshot" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "draft_designs_guestId_status_idx" ON "draft_designs"("guestId", "status");

-- CreateIndex
CREATE INDEX "draft_designs_userId_status_idx" ON "draft_designs"("userId", "status");

-- CreateIndex
CREATE INDEX "draft_designs_productId_idx" ON "draft_designs"("productId");

-- CreateIndex
CREATE INDEX "draft_designs_expiresAt_idx" ON "draft_designs"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "carts_guestId_key" ON "carts"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "carts_guestId_idx" ON "carts"("guestId");

-- CreateIndex
CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- AddForeignKey
ALTER TABLE "draft_designs" ADD CONSTRAINT "draft_designs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_designs" ADD CONSTRAINT "draft_designs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_designs" ADD CONSTRAINT "draft_designs_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_draftDesignId_fkey" FOREIGN KEY ("draftDesignId") REFERENCES "draft_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
