-- CreateEnum
CREATE TYPE "VisaType" AS ENUM ('COST_INCREASE', 'DURATION_EXTEND', 'SCOPE_CHANGE');

-- CreateEnum
CREATE TYPE "VisaStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- AlterEnum
ALTER TYPE "Phase" ADD VALUE 'EXECUTION';
ALTER TYPE "Phase" ADD VALUE 'SETTLEMENT';

-- CreateTable
CREATE TABLE "visas" (
    "visa_id" BIGSERIAL NOT NULL,
    "ticket_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "reason" TEXT NOT NULL,
    "change_type" "VisaType" NOT NULL,
    "original_value" DECIMAL(12,2),
    "changed_value" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" TEXT,
    "status" "VisaStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_by" BIGINT NOT NULL,
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_comment" VARCHAR(500),
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "visas_pkey" PRIMARY KEY ("visa_id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "settlement_id" BIGSERIAL NOT NULL,
    "ticket_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "original_amount" DECIMAL(12,2) NOT NULL,
    "visa_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "attachments" TEXT,
    "status" "SettlementStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_by" BIGINT NOT NULL,
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_comment" VARCHAR(500),
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("settlement_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visas_ticket_id_key" ON "visas"("ticket_id");

-- CreateIndex
CREATE INDEX "visas_ticket_id_idx" ON "visas"("ticket_id");

-- CreateIndex
CREATE INDEX "visas_project_id_idx" ON "visas"("project_id");

-- CreateIndex
CREATE INDEX "visas_status_idx" ON "visas"("status");

-- CreateIndex
CREATE INDEX "visas_created_by_idx" ON "visas"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_ticket_id_key" ON "settlements"("ticket_id");

-- CreateIndex
CREATE INDEX "settlements_ticket_id_idx" ON "settlements"("ticket_id");

-- CreateIndex
CREATE INDEX "settlements_project_id_idx" ON "settlements"("project_id");

-- CreateIndex
CREATE INDEX "settlements_status_idx" ON "settlements"("status");

-- CreateIndex
CREATE INDEX "settlements_created_by_idx" ON "settlements"("created_by");

-- AddForeignKey
ALTER TABLE "visas" ADD CONSTRAINT "visas_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("ticket_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visas" ADD CONSTRAINT "visas_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visas" ADD CONSTRAINT "visas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visas" ADD CONSTRAINT "visas_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("ticket_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
