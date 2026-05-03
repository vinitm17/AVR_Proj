-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OEM', 'Reseller', 'Operator', 'EndUser');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "linkedOEM" INTEGER,
    "linkedReseller" INTEGER,
    "linkedOperator" INTEGER,
    "points" BIGINT,
    "vehicle" TEXT,
    "gstNumber" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chargingStation" (
    "id" SERIAL NOT NULL,
    "location" TEXT NOT NULL,
    "OEMId" INTEGER NOT NULL,
    "resellerId" INTEGER NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "totalEnergyConsumption" BIGINT NOT NULL,
    "healthPercentage" INTEGER NOT NULL,
    "isOccupied" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "isFaulty" BOOLEAN NOT NULL,

    CONSTRAINT "chargingStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessions" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "location" TEXT NOT NULL,
    "stationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "transactionID" TEXT,
    "pointsUsed" BIGINT NOT NULL DEFAULT 0,
    "energyConsumption" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transactions" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "userId" INTEGER NOT NULL,
    "coinsPurchased" BIGINT NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "chargingStation_id_key" ON "chargingStation"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_id_key" ON "Sessions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Transactions_id_key" ON "Transactions"("id");

-- AddForeignKey
ALTER TABLE "chargingStation" ADD CONSTRAINT "chargingStation_OEMId_fkey" FOREIGN KEY ("OEMId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargingStation" ADD CONSTRAINT "chargingStation_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargingStation" ADD CONSTRAINT "chargingStation_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "chargingStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
