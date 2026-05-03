"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Starting to seed database...');
        // Clear existing data (optional - comment out if you want to keep existing data)
        yield prisma.sessions.deleteMany({});
        yield prisma.transactions.deleteMany({});
        yield prisma.chargingStation.deleteMany({});
        yield prisma.user.deleteMany({});
        console.log('🧹 Cleared existing data');
        // Create Users
        console.log('👥 Creating users...');
        // OEM Users
        const oem1 = yield prisma.user.create({
            data: {
                firstName: 'John',
                lastName: 'Smith',
                email: 'john.smith@oemdemo.com',
                password: 'hashed_password_123',
                role: 'OEM',
                points: BigInt(10000),
                vehicle: 'Tesla Model S',
                gstNumber: '22AAAAA0000A1Z5'
            }
        });
        const oem2 = yield prisma.user.create({
            data: {
                firstName: 'Sarah',
                lastName: 'Johnson',
                email: 'sarah.johnson@oemdemo.com',
                password: 'hashed_password_456',
                role: 'OEM',
                points: BigInt(15000),
                vehicle: 'BMW iX',
                gstNumber: '27BBBBB1111B2Z6'
            }
        });
        // Reseller Users
        const reseller1 = yield prisma.user.create({
            data: {
                firstName: 'Michael',
                lastName: 'Brown',
                email: 'michael.brown@resellerdemo.com',
                password: 'hashed_password_789',
                role: 'Reseller',
                linkedOEM: oem1.id,
                points: BigInt(8000),
                vehicle: 'Audi e-tron',
                gstNumber: '29CCCCC2222C3Z7'
            }
        });
        const reseller2 = yield prisma.user.create({
            data: {
                firstName: 'Emily',
                lastName: 'Davis',
                email: 'emily.davis@resellerdemo.com',
                password: 'hashed_password_101',
                role: 'Reseller',
                linkedOEM: oem2.id,
                points: BigInt(12000),
                vehicle: 'Mercedes EQC',
                gstNumber: '33DDDDD3333D4Z8'
            }
        });
        // Operator Users
        const operator1 = yield prisma.user.create({
            data: {
                firstName: 'David',
                lastName: 'Wilson',
                email: 'david.wilson@operatordemo.com',
                password: 'hashed_password_202',
                role: 'Operator',
                linkedOEM: oem1.id,
                linkedReseller: reseller1.id,
                points: BigInt(5000),
                vehicle: 'Hyundai Kona Electric',
                gstNumber: '36EEEEE4444E5Z9'
            }
        });
        const operator2 = yield prisma.user.create({
            data: {
                firstName: 'Lisa',
                lastName: 'Miller',
                email: 'lisa.miller@operatordemo.com',
                password: 'hashed_password_303',
                role: 'Operator',
                linkedOEM: oem2.id,
                linkedReseller: reseller2.id,
                points: BigInt(7500),
                vehicle: 'Nissan Leaf',
                gstNumber: '09FFFFF5555F6Z0'
            }
        });
        // EndUser Users
        const endUser1 = yield prisma.user.create({
            data: {
                firstName: 'Robert',
                lastName: 'Garcia',
                email: 'robert.garcia@userdemo.com',
                password: 'hashed_password_404',
                role: 'EndUser',
                linkedOEM: oem1.id,
                linkedReseller: reseller1.id,
                linkedOperator: operator1.id,
                points: BigInt(2500),
                vehicle: 'Chevrolet Bolt EV'
            }
        });
        const endUser2 = yield prisma.user.create({
            data: {
                firstName: 'Jennifer',
                lastName: 'Martinez',
                email: 'jennifer.martinez@userdemo.com',
                password: 'hashed_password_505',
                role: 'EndUser',
                linkedOEM: oem2.id,
                linkedReseller: reseller2.id,
                linkedOperator: operator2.id,
                points: BigInt(3200),
                vehicle: 'Volkswagen ID.4'
            }
        });
        const endUser3 = yield prisma.user.create({
            data: {
                firstName: 'James',
                lastName: 'Anderson',
                email: 'james.anderson@userdemo.com',
                password: 'hashed_password_606',
                role: 'EndUser',
                linkedOEM: oem1.id,
                linkedReseller: reseller1.id,
                linkedOperator: operator1.id,
                points: BigInt(1800),
                vehicle: 'Ford Mustang Mach-E'
            }
        });
        const endUser4 = yield prisma.user.create({
            data: {
                firstName: 'Amanda',
                lastName: 'Taylor',
                email: 'amanda.taylor@userdemo.com',
                password: 'hashed_password_707',
                role: 'EndUser',
                linkedOEM: oem2.id,
                linkedReseller: reseller2.id,
                linkedOperator: operator2.id,
                points: BigInt(4100),
                vehicle: 'Polestar 2'
            }
        });
        console.log('✅ Users created');
        // Create Charging Stations
        console.log('🔌 Creating charging stations...');
        const station1 = yield prisma.chargingStation.create({
            data: {
                location: 'Downtown Mall - Parking Level B1',
                OEMId: oem1.id,
                resellerId: reseller1.id,
                operatorId: operator1.id,
                connectedUserID: endUser1.id,
                totalEnergyConsumption: BigInt(15000),
                healthPercentage: 95,
                isOccupied: true,
                latitude: 16.8472558,
                longitude: 74.5987356,
                mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d432.8030714416994!2d74.59873562066275!3d16.84725578534954!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc123007d046a15%3A0x51abb635d9ba80a0!2sEffotel%20by%20Sayaji%2C%20Sangli!5e0!3m2!1sen!2sin!4v1777801055197!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
                isActive: true,
                isFaulty: false
            }
        });
        const station2 = yield prisma.chargingStation.create({
            data: {
                location: 'Airport Terminal 2 - Ground Floor',
                OEMId: oem2.id,
                resellerId: reseller2.id,
                operatorId: operator2.id,
                connectedUserID: null,
                totalEnergyConsumption: BigInt(22000),
                healthPercentage: 88,
                isOccupied: false,
                latitude: 16.865268,
                longitude: 74.5909501,
                mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d238.63842201666768!2d74.5909501303994!3d16.865267967468114!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc1180acf8cbd2f%3A0x8a37f1372dc62bd3!2sVraj%20Technologies%20Charging%20Station!5e0!3m2!1sen!2sin!4v1777801198980!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
                isActive: true,
                isFaulty: false
            }
        });
        const station3 = yield prisma.chargingStation.create({
            data: {
                location: 'Highway Service Station - Exit 15',
                OEMId: oem1.id,
                resellerId: reseller1.id,
                operatorId: operator1.id,
                connectedUserID: endUser3.id,
                totalEnergyConsumption: BigInt(31000),
                healthPercentage: 92,
                isOccupied: true,
                latitude: 16.8652679,
                longitude: 74.5885361,
                mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3818.214753241584!2d74.58853613886272!3d16.865267919212357!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc1192fc537db45%3A0xf16ce72abb35dd73!2sKrishna%20godavari%20ev%20charging%20station!5e0!3m2!1sen!2sin!4v1777801255281!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
                isActive: true,
                isFaulty: false
            }
        });
        const station4 = yield prisma.chargingStation.create({
            data: {
                location: 'Office Complex - Basement Parking',
                OEMId: oem2.id,
                resellerId: reseller2.id,
                operatorId: operator2.id,
                connectedUserID: null,
                totalEnergyConsumption: BigInt(18500),
                healthPercentage: 78,
                isOccupied: false,
                latitude: 16.8429686,
                longitude: 74.6116278,
                mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3818.6649728327634!2d74.60905287604193!3d16.842968583954345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc119755cbdb9ad%3A0x4e5cf9d3e94caf88!2sJIMIS%20BURGER%20%C2%AE%20-%20Sangli!5e0!3m2!1sen!2sin!4v1777801303378!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
                isActive: false,
                isFaulty: true
            }
        });
        const station5 = yield prisma.chargingStation.create({
            data: {
                location: 'Shopping Center - Rooftop Level',
                OEMId: oem1.id,
                resellerId: reseller2.id,
                operatorId: operator1.id,
                connectedUserID: endUser2.id,
                totalEnergyConsumption: BigInt(27800),
                healthPercentage: 96,
                isOccupied: true,
                latitude: 19.166445,
                longitude: 72.936014,
                mapIframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d60298.52692515201!2d72.936014!3d19.166445!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b913585fc533%3A0x4c5fa5cf22f5bd5d!2sPiramal%20Revanta%20Sales%20Office!5e0!3m2!1sen!2sin!4v1732468527570!5m2!1sen!2sin" width="100%" height="450" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="border: 0px;"></iframe>`,
                isActive: true,
                isFaulty: false
            }
        });
        console.log('✅ Charging stations created');
        // Create Sessions
        console.log('📊 Creating sessions...');
        yield prisma.sessions.create({
            data: {
                totalTime: '2h 45m',
                isActive: false,
                location: 'Downtown Mall - Parking Level B1',
                stationId: station1.id,
                userId: endUser1.id,
                transactionID: 'txn_001_razorpay',
                pointsUsed: BigInt(450),
                energyConsumption: 45.7
            }
        });
        yield prisma.sessions.create({
            data: {
                totalTime: '1h 20m',
                isActive: true,
                location: 'Highway Service Station - Exit 15',
                stationId: station3.id,
                userId: endUser3.id,
                transactionID: 'txn_002_razorpay',
                pointsUsed: BigInt(280),
                energyConsumption: 28.3
            }
        });
        yield prisma.sessions.create({
            data: {
                totalTime: '3h 10m',
                isActive: false,
                location: 'Shopping Center - Rooftop Level',
                stationId: station5.id,
                userId: endUser2.id,
                transactionID: null,
                pointsUsed: BigInt(620),
                energyConsumption: 62.1
            }
        });
        yield prisma.sessions.create({
            data: {
                totalTime: '0h 55m',
                isActive: false,
                location: 'Downtown Mall - Parking Level B1',
                stationId: station1.id,
                userId: endUser4.id,
                transactionID: 'txn_003_razorpay',
                pointsUsed: BigInt(165),
                energyConsumption: 16.8
            }
        });
        yield prisma.sessions.create({
            data: {
                totalTime: '4h 30m',
                isActive: false,
                location: 'Airport Terminal 2 - Ground Floor',
                stationId: station2.id,
                userId: endUser1.id,
                transactionID: 'txn_004_razorpay',
                pointsUsed: BigInt(900),
                energyConsumption: 89.5
            }
        });
        console.log('✅ Sessions created');
        // Create Transactions
        console.log('💳 Creating transactions...');
        yield prisma.transactions.create({
            data: {
                transactionId: 'gpay_001_20240823_001',
                status: 'SUCCESS',
                userId: endUser1.id,
                coinsPurchased: BigInt(1000),
                amountPaid: 99.99
            }
        });
        yield prisma.transactions.create({
            data: {
                transactionId: 'razorpay_002_20240823_002',
                status: 'SUCCESS',
                userId: endUser2.id,
                coinsPurchased: BigInt(2500),
                amountPaid: 249.99
            }
        });
        yield prisma.transactions.create({
            data: {
                transactionId: 'paytm_003_20240823_003',
                status: 'PENDING',
                userId: endUser3.id,
                coinsPurchased: BigInt(500),
                amountPaid: 49.99
            }
        });
        yield prisma.transactions.create({
            data: {
                transactionId: 'gpay_004_20240823_004',
                status: 'FAILED',
                userId: endUser4.id,
                coinsPurchased: BigInt(1500),
                amountPaid: 149.99
            }
        });
        yield prisma.transactions.create({
            data: {
                transactionId: 'upi_005_20240823_005',
                status: 'SUCCESS',
                userId: endUser1.id,
                coinsPurchased: BigInt(3000),
                amountPaid: 299.99
            }
        });
        console.log('✅ Transactions created');
        console.log('🎉 Database seeding completed successfully!');
        // Display summary
        const userCount = yield prisma.user.count();
        const stationCount = yield prisma.chargingStation.count();
        const sessionCount = yield prisma.sessions.count();
        const transactionCount = yield prisma.transactions.count();
        console.log('\n📈 Summary:');
        console.log(`- Users: ${userCount}`);
        console.log(`- Charging Stations: ${stationCount}`);
        console.log(`- Sessions: ${sessionCount}`);
        console.log(`- Transactions: ${transactionCount}`);
    });
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
