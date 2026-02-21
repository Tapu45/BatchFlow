"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
/**
 * Standalone script to reset all database data including user-related data
 */
async function resetDatabase() {
    try {
        console.log('Starting complete database reset operation (including user data)');
        console.log('Deleting records from tables in proper order...');
        // RAW MATERIAL, WAREHOUSE, CLEANING, PROCESSING, STOCK MODULES
        await prisma.rMQualityParameter.deleteMany().catch(() => console.log('No RMQualityParameter records to delete'));
        await prisma.rMQualityReport.deleteMany().catch(() => console.log('No RMQualityReport records to delete'));
        await prisma.reusableStock.deleteMany().catch(() => console.log('No ReusableStock records to delete'));
        await prisma.transactionLog.deleteMany().catch(() => console.log('No TransactionLog records to delete'));
        await prisma.currentStock.deleteMany().catch(() => console.log('No CurrentStock records to delete'));
        await prisma.byProduct.deleteMany().catch(() => console.log('No ByProduct records to delete'));
        await prisma.finishedGood.deleteMany().catch(() => console.log('No FinishedGood records to delete'));
        await prisma.unfinishedStock.deleteMany().catch(() => console.log('No UnfinishedStock records to delete'));
        await prisma.cleaningLog.deleteMany().catch(() => console.log('No CleaningLog records to delete'));
        await prisma.cleaningJob.deleteMany().catch(() => console.log('No CleaningJob records to delete'));
        await prisma.processingJob.deleteMany().catch(() => console.log('No ProcessingJob records to delete'));
        await prisma.stockEntry.deleteMany().catch(() => console.log('No StockEntry records to delete'));
        await prisma.purchaseOrderItem.deleteMany().catch(() => console.log('No PurchaseOrderItem records to delete'));
        await prisma.purchaseOrder.deleteMany().catch(() => console.log('No PurchaseOrder records to delete'));
        await prisma.rawMaterialProduct.deleteMany().catch(() => console.log('No RawMaterialProduct records to delete'));
        await prisma.vendor.deleteMany().catch(() => console.log('No Vendor records to delete'));
        await prisma.warehouse.deleteMany().catch(() => console.log('No Warehouse records to delete'));
        // Training module data
        await prisma.trainingSessionPhoto.deleteMany().catch(() => console.log('No TrainingSessionPhoto records to delete'));
        await prisma.feedbackForm.deleteMany().catch(() => console.log('No FeedbackForm records to delete'));
        await prisma.trainingInviteToken.deleteMany().catch(() => console.log('No TrainingInviteToken records to delete'));
        await prisma.trainingNotification.deleteMany().catch(() => console.log('No TrainingNotification records to delete'));
        await prisma.trainingFollowup.deleteMany().catch(() => console.log('No TrainingFollowup records to delete'));
        await prisma.trainingPhoto.deleteMany().catch(() => console.log('No TrainingPhoto records to delete'));
        await prisma.trainingFeedback.deleteMany().catch(() => console.log('No TrainingFeedback records to delete'));
        await prisma.attendance.deleteMany().catch(() => console.log('No Attendance records to delete'));
        await prisma.trainingParticipant.deleteMany().catch(() => console.log('No TrainingParticipant records to delete'));
        await prisma.trainingDocument.deleteMany().catch(() => console.log('No TrainingDocument records to delete'));
        await prisma.trainingSession.deleteMany().catch(() => console.log('No TrainingSession records to delete'));
        await prisma.training.deleteMany().catch(() => console.log('No Training records to delete'));
        await prisma.trainingCalendar.deleteMany().catch(() => console.log('No TrainingCalendar records to delete'));
        await prisma.participant.deleteMany().catch(() => console.log('No Participant records to delete'));
        await prisma.batchDraft.deleteMany().catch(() => console.log('No BatchDraft records to delete'));
        // Audit module data
        await prisma.auditNotification.deleteMany().catch(() => console.log('No AuditNotification records to delete'));
        await prisma.auditReminder.deleteMany().catch(() => console.log('No AuditReminder records to delete'));
        await prisma.preAuditChecklistItem.deleteMany().catch(() => console.log('No PreAuditChecklistItem records to delete'));
        await prisma.auditDocument.deleteMany().catch(() => console.log('No AuditDocument records to delete'));
        await prisma.correctiveAction.deleteMany().catch(() => console.log('No CorrectiveAction records to delete'));
        await prisma.finding.deleteMany().catch(() => console.log('No Finding records to delete'));
        await prisma.auditInspectionItem.deleteMany().catch(() => console.log('No AuditInspectionItem records to delete'));
        await prisma.audit.deleteMany().catch(() => console.log('No Audit records to delete'));
        await prisma.department.deleteMany().catch(() => console.log('No Department records to delete'));
        await prisma.auditor.deleteMany().catch(() => console.log('No Auditor records to delete'));
        // Batch flow data
        await prisma.batchParameterValue.deleteMany().catch(() => console.log('No BatchParameterValue records to delete'));
        await prisma.notification.deleteMany().catch(() => console.log('No Notification records to delete'));
        await prisma.activityLog.deleteMany().catch(() => console.log('No ActivityLog records to delete'));
        await prisma.batch.deleteMany().catch(() => console.log('No Batch records to delete'));
        await prisma.standardDefinition.deleteMany().catch(() => console.log('No StandardDefinition records to delete'));
        await prisma.standardParameter.deleteMany().catch(() => console.log('No StandardParameter records to delete'));
        await prisma.standard.deleteMany().catch(() => console.log('No Standard records to delete'));
        await prisma.productParameter.deleteMany().catch(() => console.log('No ProductParameter records to delete'));
        await prisma.productStandardCategory.deleteMany().catch(() => console.log('No ProductStandardCategory records to delete'));
        await prisma.standardCategory.deleteMany().catch(() => console.log('No StandardCategory records to delete'));
        await prisma.methodology.deleteMany().catch(() => console.log('No Methodology records to delete'));
        await prisma.unitOfMeasurement.deleteMany().catch(() => console.log('No UnitOfMeasurement records to delete'));
        await prisma.product.deleteMany().catch(() => console.log('No Product records to delete'));
        await prisma.exportLog.deleteMany().catch(() => console.log('No ExportLog records to delete'));
        // User-related data
        await prisma.user.deleteMany().catch(() => console.log('No User records to delete'));
        await prisma.role.deleteMany().catch(() => console.log('No Role records to delete'));
        await prisma.permission.deleteMany().catch(() => console.log('No Permission records to delete'));
        console.log('Resetting auto-increment sequences...');
        // Reset sequences for tables that might have auto-incrementing IDs
        // Note: Most of your tables use UUID, but some might have sequences
        const sequenceResets = [
            'SELECT setval(pg_get_serial_sequence(\'"User"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"Role"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"Permission"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"Product"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"StandardCategory"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"StandardParameter"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"Standard"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"StandardDefinition"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"UnitOfMeasurement"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"Methodology"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"Batch"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"BatchParameterValue"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"ExportLog"\', \'id\'), 1, false)',
            // Add for raw/warehouse/cleaning/processing/stock if needed
            'SELECT setval(pg_get_serial_sequence(\'"Vendor"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"RawMaterialProduct"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"PurchaseOrder"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"PurchaseOrderItem"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"StockEntry"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"Warehouse"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"CleaningJob"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"CleaningLog"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"UnfinishedStock"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"ProcessingJob"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"FinishedGood"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"ByProduct"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"CurrentStock"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"TransactionLog"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"ReusableStock"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"RMQualityReport"\', \'id\'), 1, false)',
            'SELECT setval(pg_get_serial_sequence(\'"RMQualityParameter"\', \'id\'), 1, false)'
        ];
        for (const query of sequenceResets) {
            try {
                await prisma.$executeRawUnsafe(query);
            }
            catch (error) {
                console.log(`Sequence reset query failed (might not exist): ${query}`);
            }
        }
        console.log('Complete database reset completed successfully (including user data)');
    }
    catch (error) {
        console.error('Error resetting database:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Execute the function when this file is run directly
resetDatabase()
    .then(() => {
    console.log('Script execution complete');
    process.exit(0);
})
    .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
