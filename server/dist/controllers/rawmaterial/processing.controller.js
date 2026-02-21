"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingJobController = void 0;
const prisma_1 = require("../../generated/prisma");
const activityLogger_1 = require("../../utils/handler/activityLogger");
const prisma = new prisma_1.PrismaClient();
class ProcessingJobController {
    static async createProcessingJob(req, res) {
        try {
            const { inputRawMaterialId, quantityInput, unit, startedAt, finishedAt, status, } = req.body;
            const rawMaterial = await prisma.rawMaterialProduct.findUnique({
                where: { id: inputRawMaterialId },
                select: { unitOfMeasurement: true },
            });
            if (!rawMaterial) {
                res.status(400).json({ error: 'Invalid inputRawMaterialId' });
                return;
            }
            // Convert quantityInput to base unit
            const baseQuantityInput = (0, activityLogger_1.convertToBaseUOM)(quantityInput, unit || rawMaterial.unitOfMeasurement, rawMaterial.unitOfMeasurement);
            // Generate custom ID like PJ00001
            const lastJob = await prisma.processingJob.findFirst({
                orderBy: { id: 'desc' },
                where: { id: { startsWith: 'PJ' } },
            });
            let nextNumber = 1;
            if (lastJob && /^PJ\d+$/.test(lastJob.id)) {
                nextNumber = parseInt(lastJob.id.replace('PJ', ''), 10) + 1;
            }
            const newId = `PJ${String(nextNumber).padStart(5, '0')}`;
            const processingJob = await prisma.processingJob.create({
                data: {
                    id: newId,
                    inputRawMaterialId,
                    quantityInput: baseQuantityInput,
                    startedAt: new Date(startedAt),
                    finishedAt: finishedAt ? new Date(finishedAt) : undefined,
                    status,
                },
            });
            res.status(201).json(processingJob);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create processing job', details: error });
        }
    }
    static async getProcessingJobs(req, res) {
        try {
            const processingJobs = await prisma.processingJob.findMany({
                include: {
                    inputRawMaterial: true,
                    byProducts: { include: { warehouse: true } },
                    finishedGoods: { include: { warehouse: true } },
                },
            });
            res.json(processingJobs);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch processing jobs', details: error });
        }
    }
    static async getProcessingJobById(req, res) {
        try {
            const { id } = req.params;
            const processingJob = await prisma.processingJob.findUnique({
                where: { id },
                include: { inputRawMaterial: true },
            });
            if (!processingJob) {
                res.status(404).json({ error: 'Processing job not found' });
                return;
            }
            res.json(processingJob);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch processing job', details: error });
        }
    }
    static async updateProcessingJob(req, res) {
        try {
            const { id } = req.params;
            const { quantityInput, startedAt, finishedAt, status, byProducts, // Array of byProducts to upsert
             } = req.body;
            const processingJob = await prisma.processingJob.update({
                where: { id },
                data: {
                    quantityInput,
                    startedAt: startedAt ? new Date(startedAt) : undefined,
                    finishedAt: finishedAt ? new Date(finishedAt) : undefined,
                    status,
                },
            });
            // Handle byProducts upsert if provided
            let totalByProductQty = 0;
            let finishedGoodWarehouseId = null;
            if (Array.isArray(byProducts)) {
                // Remove existing byProducts for this job
                await prisma.byProduct.deleteMany({ where: { processingJobId: id } });
                // Add new byProducts
                for (const bp of byProducts) {
                    totalByProductQty += bp.quantity || 0;
                    finishedGoodWarehouseId = bp.warehouseId; // Use the same warehouse as byProduct for finished good
                    await prisma.byProduct.create({
                        data: {
                            processingJobId: id,
                            skuCode: bp.skuCode,
                            quantity: bp.quantity,
                            warehouseId: bp.warehouseId,
                            tag: bp.tag,
                            reason: bp.reason,
                        },
                    });
                    if (bp.isReusable) {
                        await prisma.reusableStock.create({
                            data: {
                                processingJobId: id,
                                skuCode: bp.skuCode,
                                quantity: bp.quantity,
                                warehouseId: bp.warehouseId,
                                createdAt: new Date(),
                            },
                        });
                    }
                }
            }
            // If status is Finished/Completed, create FinishedGood
            if (status === "Finished" || status === "Completed") {
                // Get the processing job and input raw material info
                const job = await prisma.processingJob.findUnique({
                    where: { id },
                    include: { inputRawMaterial: true },
                });
                if (job) {
                    const finalQuantity = (job.quantityInput || 0) - totalByProductQty;
                    // Use the warehouseId from byProduct or set a default if needed
                    const warehouseId = finishedGoodWarehouseId || (byProducts?.[0]?.warehouseId);
                    // Create FinishedGood entry
                    await prisma.finishedGood.create({
                        data: {
                            skuCode: job.inputRawMaterial.skuCode,
                            name: job.inputRawMaterial.name,
                            category: job.inputRawMaterial.category,
                            unitOfMeasurement: job.inputRawMaterial.unitOfMeasurement,
                            quantity: finalQuantity,
                            warehouseId: warehouseId,
                            processingJobId: job.id,
                        },
                    });
                }
            }
            // Return updated job with byProducts
            const updatedJob = await prisma.processingJob.findUnique({
                where: { id },
                include: { byProducts: true },
            });
            res.json(updatedJob);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update processing job', details: error });
        }
    }
}
exports.ProcessingJobController = ProcessingJobController;
