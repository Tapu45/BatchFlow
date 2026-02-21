"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleaningJobController = void 0;
const prisma_1 = require("../../generated/prisma");
const activityLogger_1 = require("../../utils/handler/activityLogger");
const prisma = new prisma_1.PrismaClient();
class CleaningJobController {
    // Create a new cleaning job
    static async createCleaningJob(req, res) {
        try {
            const { rawMaterialId, fromWarehouseId, toWarehouseId, quantity, unit, // <-- Accept unit from request
            status, startedAt, finishedAt, } = req.body;
            // Fetch base unit for the raw material
            const rawMaterial = await prisma.rawMaterialProduct.findUnique({
                where: { id: rawMaterialId },
                select: { unitOfMeasurement: true },
            });
            if (!rawMaterial) {
                res.status(400).json({ error: 'Invalid rawMaterialId' });
                return;
            }
            // Convert quantity to base unit
            const baseQuantity = (0, activityLogger_1.convertToBaseUOM)(quantity, unit || rawMaterial.unitOfMeasurement, // fallback to base if unit not provided
            rawMaterial.unitOfMeasurement);
            const lastJob = await prisma.cleaningJob.findFirst({
                orderBy: { id: 'desc' },
                where: { id: { startsWith: 'CJ' } },
            });
            let nextNumber = 1;
            if (lastJob && /^CJ\d+$/.test(lastJob.id)) {
                nextNumber = parseInt(lastJob.id.replace('CJ', ''), 10) + 1;
            }
            const newId = `CJ${String(nextNumber).padStart(5, '0')}`;
            const cleaningJob = await prisma.cleaningJob.create({
                data: {
                    id: newId,
                    rawMaterialId,
                    fromWarehouseId,
                    toWarehouseId,
                    quantity: baseQuantity, // <-- Store in base unit
                    status,
                    startedAt: new Date(startedAt),
                    finishedAt: finishedAt ? new Date(finishedAt) : undefined,
                },
            });
            await prisma.currentStock.update({
                where: {
                    rawMaterialId_warehouseId: {
                        rawMaterialId,
                        warehouseId: fromWarehouseId,
                    },
                },
                data: {
                    currentQuantity: { decrement: baseQuantity }, // <-- Use base unit
                },
            });
            res.status(201).json(cleaningJob);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create cleaning job', details: error });
            console.log(error);
        }
    }
    // Get all cleaning jobs
    static async getCleaningJobs(req, res) {
        try {
            const { status } = req.query;
            const where = {};
            if (status) {
                where.status = status;
            }
            const cleaningJobs = await prisma.cleaningJob.findMany({
                where,
                include: { rawMaterial: true, fromWarehouse: true, toWarehouse: true },
            });
            res.json(cleaningJobs);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch cleaning jobs', details: error });
        }
    }
    // Get a single cleaning job by ID
    static async getCleaningJobById(req, res) {
        try {
            const { id } = req.params;
            const cleaningJob = await prisma.cleaningJob.findUnique({
                where: { id },
                include: { rawMaterial: true, fromWarehouse: true, toWarehouse: true },
            });
            if (!cleaningJob) {
                res.status(404).json({ error: 'Cleaning job not found' });
            }
            res.json(cleaningJob);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch cleaning job', details: error });
        }
    }
    // Update cleaning job
    static async updateCleaningJob(req, res) {
        try {
            const { id } = req.params;
            const { quantity, status, startedAt, finishedAt, leftoverQuantity, // <-- Add these to destructure from req.body
            reasonCode, isReusable, } = req.body;
            const cleaningJob = await prisma.cleaningJob.update({
                where: { id },
                data: {
                    quantity,
                    status,
                    startedAt: startedAt ? new Date(startedAt) : undefined,
                    finishedAt: finishedAt ? new Date(finishedAt) : undefined,
                },
            });
            // Handle leftover/unusable stock if job is marked as Cleaned/Finished
            if ((status === 'Cleaned' || status === 'Finished') &&
                leftoverQuantity > 0) {
                const unfinishedSku = `${cleaningJob.rawMaterialId}-UNF-${Date.now()}`;
                await prisma.unfinishedStock.create({
                    data: {
                        cleaningJobId: cleaningJob.id,
                        skuCode: unfinishedSku,
                        quantity: leftoverQuantity,
                        reasonCode,
                        warehouseId: cleaningJob.toWarehouseId,
                    },
                });
                if (isReusable) {
                    await prisma.reusableStock.create({
                        data: {
                            cleaningJobId: cleaningJob.id,
                            skuCode: unfinishedSku,
                            quantity: leftoverQuantity,
                            warehouseId: cleaningJob.toWarehouseId,
                            createdAt: new Date(),
                        },
                    });
                }
            }
            res.json(cleaningJob);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update cleaning job', details: error });
        }
    }
    static async getCleanedMaterials(req, res) {
        try {
            const cleanedJobs = await prisma.cleaningJob.findMany({
                where: { status: 'Cleaned' },
                include: {
                    rawMaterial: true,
                    fromWarehouse: true,
                    toWarehouse: true,
                    cleaningLogs: true,
                },
            });
            // Calculate netQuantity and wastage for each job
            const jobsWithNet = await Promise.all(cleanedJobs.map(async (job) => {
                const totalWastage = await prisma.unfinishedStock.aggregate({
                    where: { cleaningJobId: job.id },
                    _sum: { quantity: true }
                });
                const wastage = totalWastage._sum.quantity || 0;
                return {
                    ...job,
                    netQuantity: job.quantity - wastage,
                    wastageQuantity: wastage,
                };
            }));
            // Aggregate by rawMaterialId + toWarehouseId
            const aggregated = {};
            for (const job of jobsWithNet) {
                const key = `${job.rawMaterialId}_${job.toWarehouseId}`;
                if (!aggregated[key]) {
                    aggregated[key] = {
                        rawMaterialId: job.rawMaterialId,
                        toWarehouseId: job.toWarehouseId,
                        rawMaterial: job.rawMaterial,
                        toWarehouse: job.toWarehouse,
                        netQuantity: 0,
                        wastageQuantity: 0,
                    };
                }
                aggregated[key].netQuantity += job.netQuantity;
                aggregated[key].wastageQuantity += job.wastageQuantity;
            }
            // Subtract processed quantity for each group
            for (const key of Object.keys(aggregated)) {
                const { rawMaterialId, toWarehouseId } = aggregated[key];
                // Sum all processing jobs for this rawMaterialId and toWarehouseId
                const processed = await prisma.processingJob.aggregate({
                    where: {
                        inputRawMaterialId: rawMaterialId,
                        // warehouseId: toWarehouseId, // Removed because warehouseId does not exist in ProcessingJobWhereInput
                    },
                    _sum: { quantityInput: true }
                });
                const processedQty = processed._sum && processed._sum.quantityInput ? processed._sum.quantityInput : 0;
                aggregated[key].availableQuantity = Math.max(aggregated[key].netQuantity - processedQty, 0);
            }
            res.json(Object.values(aggregated));
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch cleaned materials', details: error });
        }
    }
}
exports.CleaningJobController = CleaningJobController;
