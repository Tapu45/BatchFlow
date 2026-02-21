"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
async function clearDatabase() {
    // Order matters due to foreign key constraints
    await prisma.currentStock.deleteMany();
    await prisma.byProduct.deleteMany();
    await prisma.finishedGood.deleteMany();
    await prisma.processingJob.deleteMany();
    await prisma.unfinishedStock.deleteMany();
    await prisma.cleaningLog.deleteMany();
    await prisma.cleaningJob.deleteMany();
    await prisma.stockEntry.deleteMany();
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.rawMaterialProduct.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.warehouse.deleteMany();
    // Reset auto-increment IDs (for PostgreSQL)
    // Remove/comment if using UUIDs only
    // await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Vendor_id_seq" RESTART WITH 1`);
    // await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Warehouse_id_seq" RESTART WITH 1`);
    // ...repeat for other tables if needed
    console.log('Database cleared.');
}
clearDatabase()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//npx ts-node server/src/utils/clear/rawClear.ts
