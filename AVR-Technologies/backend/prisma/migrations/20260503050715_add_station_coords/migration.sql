-- CreateEnum
CREATE TYPE "public"."QueueStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."Sessions" ADD COLUMN     "estimatedDuration" INTEGER;

-- AlterTable
ALTER TABLE "public"."chargingStation" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "mapIframe" TEXT;

-- CreateTable
CREATE TABLE "public"."StationQueue" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "public"."QueueStatus" NOT NULL DEFAULT 'WAITING',

    CONSTRAINT "StationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StationQueue_id_key" ON "public"."StationQueue"("id");

-- CreateIndex
CREATE UNIQUE INDEX "StationQueue_stationId_userId_key" ON "public"."StationQueue"("stationId", "userId");

-- AddForeignKey
ALTER TABLE "public"."StationQueue" ADD CONSTRAINT "StationQueue_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."chargingStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StationQueue" ADD CONSTRAINT "StationQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
