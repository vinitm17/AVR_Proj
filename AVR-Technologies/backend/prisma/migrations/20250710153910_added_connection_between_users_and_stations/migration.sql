-- AlterTable
ALTER TABLE "chargingStation" ADD COLUMN     "connectedUserID" INTEGER;

-- AddForeignKey
ALTER TABLE "chargingStation" ADD CONSTRAINT "chargingStation_connectedUserID_fkey" FOREIGN KEY ("connectedUserID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
