import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed database...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.sessions.deleteMany({});
  await prisma.transactions.deleteMany({});
  await prisma.chargingStation.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleared existing data');

  // Create Users
  console.log('👥 Creating users...');
  
  // OEM Users
  const oem1 = await prisma.user.create({
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

  const oem2 = await prisma.user.create({
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
  const reseller1 = await prisma.user.create({
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

  const reseller2 = await prisma.user.create({
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
  const operator1 = await prisma.user.create({
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

  const operator2 = await prisma.user.create({
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
  const endUser1 = await prisma.user.create({
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

  const endUser2 = await prisma.user.create({
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

  const endUser3 = await prisma.user.create({
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

  const endUser4 = await prisma.user.create({
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
  
  const station1 = await prisma.chargingStation.create({
    data: {
      location: 'Downtown Mall - Parking Level B1',
      OEMId: oem1.id,
      resellerId: reseller1.id,
      operatorId: operator1.id,
      connectedUserID: endUser1.id,
      totalEnergyConsumption: BigInt(15000),
      healthPercentage: 95,
      isOccupied: true,
      isActive: true,
      isFaulty: false
    }
  });

  const station2 = await prisma.chargingStation.create({
    data: {
      location: 'Airport Terminal 2 - Ground Floor',
      OEMId: oem2.id,
      resellerId: reseller2.id,
      operatorId: operator2.id,
      connectedUserID: null,
      totalEnergyConsumption: BigInt(22000),
      healthPercentage: 88,
      isOccupied: false,
      isActive: true,
      isFaulty: false
    }
  });

  const station3 = await prisma.chargingStation.create({
    data: {
      location: 'Highway Service Station - Exit 15',
      OEMId: oem1.id,
      resellerId: reseller1.id,
      operatorId: operator1.id,
      connectedUserID: endUser3.id,
      totalEnergyConsumption: BigInt(31000),
      healthPercentage: 92,
      isOccupied: true,
      isActive: true,
      isFaulty: false
    }
  });

  const station4 = await prisma.chargingStation.create({
    data: {
      location: 'Office Complex - Basement Parking',
      OEMId: oem2.id,
      resellerId: reseller2.id,
      operatorId: operator2.id,
      connectedUserID: null,
      totalEnergyConsumption: BigInt(18500),
      healthPercentage: 78,
      isOccupied: false,
      isActive: false,
      isFaulty: true
    }
  });

  const station5 = await prisma.chargingStation.create({
    data: {
      location: 'Shopping Center - Rooftop Level',
      OEMId: oem1.id,
      resellerId: reseller2.id,
      operatorId: operator1.id,
      connectedUserID: endUser2.id,
      totalEnergyConsumption: BigInt(27800),
      healthPercentage: 96,
      isOccupied: true,
      isActive: true,
      isFaulty: false
    }
  });

  console.log('✅ Charging stations created');

  // Create Sessions
  console.log('📊 Creating sessions...');
  
  await prisma.sessions.create({
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

  await prisma.sessions.create({
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

  await prisma.sessions.create({
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

  await prisma.sessions.create({
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

  await prisma.sessions.create({
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
  
  await prisma.transactions.create({
    data: {
      transactionId: 'gpay_001_20240823_001',
      status: 'SUCCESS',
      userId: endUser1.id,
      coinsPurchased: BigInt(1000),
      amountPaid: 99.99
    }
  });

  await prisma.transactions.create({
    data: {
      transactionId: 'razorpay_002_20240823_002',
      status: 'SUCCESS',
      userId: endUser2.id,
      coinsPurchased: BigInt(2500),
      amountPaid: 249.99
    }
  });

  await prisma.transactions.create({
    data: {
      transactionId: 'paytm_003_20240823_003',
      status: 'PENDING',
      userId: endUser3.id,
      coinsPurchased: BigInt(500),
      amountPaid: 49.99
    }
  });

  await prisma.transactions.create({
    data: {
      transactionId: 'gpay_004_20240823_004',
      status: 'FAILED',
      userId: endUser4.id,
      coinsPurchased: BigInt(1500),
      amountPaid: 149.99
    }
  });

  await prisma.transactions.create({
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
  const userCount = await prisma.user.count();
  const stationCount = await prisma.chargingStation.count();
  const sessionCount = await prisma.sessions.count();
  const transactionCount = await prisma.transactions.count();

  console.log('\n📈 Summary:');
  console.log(`- Users: ${userCount}`);
  console.log(`- Charging Stations: ${stationCount}`);
  console.log(`- Sessions: ${sessionCount}`);
  console.log(`- Transactions: ${transactionCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
