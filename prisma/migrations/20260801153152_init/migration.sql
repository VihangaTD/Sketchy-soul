-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "packageId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "packageSize" TEXT NOT NULL,
    "addOns" JSONB NOT NULL DEFAULT '[]',
    "style" TEXT NOT NULL,
    "subjects" INTEGER NOT NULL DEFAULT 1,
    "deliveryType" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "subtotal" INTEGER NOT NULL,
    "addOnsTotal" INTEGER NOT NULL DEFAULT 0,
    "shipping" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "country" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "occasion" TEXT,
    "deadline" TEXT,
    "notes" TEXT,
    "consented" BOOLEAN NOT NULL DEFAULT false,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "provider" "PaymentProvider",
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "sheetStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "sheetError" TEXT,
    "sheetRowAt" TIMESTAMP(3),
    "visitorId" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "landing" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sheetStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER NOT NULL DEFAULT 0,
    "contentType" TEXT NOT NULL DEFAULT 'image/webp',
    "folder" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "sizeShort" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "blurb" TEXT NOT NULL,
    "includes" JSONB NOT NULL DEFAULT '[]',
    "subjectsIncluded" INTEGER NOT NULL DEFAULT 1,
    "turnaround" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sketch" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "requiresAddress" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioPiece" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "sketch" INTEGER NOT NULL DEFAULT 1,
    "caption" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSlide" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "imageUrl" TEXT,
    "alt" TEXT NOT NULL,
    "sketch" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "meta" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "placeholder" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStep" (
    "id" TEXT NOT NULL,
    "num" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assurance" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- CreateIndex
CREATE INDEX "Order_providerOrderId_idx" ON "Order"("providerOrderId");

-- CreateIndex
CREATE INDEX "Order_sheetStatus_idx" ON "Order"("sheetStatus");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_at_idx" ON "OrderEvent"("orderId", "at");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_folder_createdAt_idx" ON "MediaAsset"("folder", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Package_slug_key" ON "Package"("slug");

-- CreateIndex
CREATE INDEX "Package_active_sortOrder_idx" ON "Package"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioPiece_slug_key" ON "PortfolioPiece"("slug");

-- CreateIndex
CREATE INDEX "PortfolioPiece_published_sortOrder_idx" ON "PortfolioPiece"("published", "sortOrder");

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
