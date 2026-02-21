"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionLogController = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
class TransactionLogController {
    // Get all transaction logs, with optional filters
    static async getAllTransactionLogs(req, res) {
        try {
            const { entity, type, userId } = req.query;
            const where = {};
            if (entity)
                where.entity = entity;
            if (type)
                where.type = type;
            if (userId)
                where.userId = userId;
            const logs = await prisma.transactionLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: { user: true }, // To get user details
            });
            res.json(logs);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch transaction logs', details: error });
        }
    }
}
exports.TransactionLogController = TransactionLogController;
