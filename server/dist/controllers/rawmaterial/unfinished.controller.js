"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnfinishedStockController = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
class UnfinishedStockController {
    // Create a new unfinished/rejected stock entry
    static async createUnfinishedStock(req, res) {
        try {
            const { cleaningJobId, processingJobId, skuCode, quantity, reasonCode, warehouseId, } = req.body;
            const unfinishedStock = await prisma.unfinishedStock.create({
                data: {
                    cleaningJobId,
                    processingJobId,
                    skuCode,
                    quantity,
                    reasonCode,
                    warehouseId,
                },
            });
            res.status(201).json(unfinishedStock);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create unfinished stock', details: error });
        }
    }
    // Get all unfinished/rejected stock entries
    static async getUnfinishedStocks(req, res) {
        try {
            const unfinishedStocks = await prisma.unfinishedStock.findMany({
                include: { warehouse: true },
            });
            res.json(unfinishedStocks);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch unfinished stocks', details: error });
        }
    }
    // Get a single unfinished/rejected stock entry by ID
    static async getUnfinishedStockById(req, res) {
        try {
            const { id } = req.params;
            const unfinishedStock = await prisma.unfinishedStock.findUnique({
                where: { id },
                include: { warehouse: true },
            });
            if (!unfinishedStock) {
                res.status(404).json({ error: 'Unfinished stock not found' });
            }
            res.json(unfinishedStock);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch unfinished stock', details: error });
        }
    }
    // Update unfinished/rejected stock entry
    static async updateUnfinishedStock(req, res) {
        try {
            const { id } = req.params;
            const { skuCode, quantity, reasonCode, warehouseId, } = req.body;
            const unfinishedStock = await prisma.unfinishedStock.update({
                where: { id },
                data: {
                    skuCode,
                    quantity,
                    reasonCode,
                    warehouseId,
                },
            });
            res.json(unfinishedStock);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update unfinished stock', details: error });
        }
    }
}
exports.UnfinishedStockController = UnfinishedStockController;
