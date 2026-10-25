ALTER TABLE "Testimonial" ADD COLUMN "orderReference" TEXT;
CREATE UNIQUE INDEX "Testimonial_orderReference_key" ON "Testimonial"("orderReference");
