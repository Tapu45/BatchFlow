"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchController = void 0;
const prisma_1 = require("../../generated/prisma");
const uuid_1 = require("uuid");
const notificationService_1 = require("../../service/notificationService");
const xlsx = __importStar(require("xlsx"));
const brevomail_1 = require("../../service/brevomail");
const prisma = new prisma_1.PrismaClient();
const notificationService = new notificationService_1.NotificationService();
class BatchController {
    async createBatch(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            const batchData = req.body;
            // Check if the product exists
            let product = await prisma.product.findUnique({
                where: { id: batchData.productId },
            });
            // If the product doesn't exist, create a new one
            if (!product) {
                if (!batchData.productName) {
                    res.status(400).json({ message: 'Product name is required for new products' });
                    return;
                }
                product = await prisma.product.create({
                    data: {
                        id: (0, uuid_1.v4)(),
                        name: batchData.productName,
                        code: batchData.productCode || null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
                // Assign the newly created product ID to the batch data
                batchData.productId = product.id;
            }
            // Validate standards if provided
            if (batchData.standardIds && batchData.standardIds.length > 0) {
                const standards = await prisma.standard.findMany({
                    where: {
                        id: { in: batchData.standardIds },
                        status: prisma_1.StandardStatus.ACTIVE,
                    },
                });
                if (standards.length !== batchData.standardIds.length) {
                    res.status(400).json({ message: 'One or more selected standards are invalid or inactive' });
                    return;
                }
            }
            // Validate methodologies if provided
            if (batchData.methodologyIds && batchData.methodologyIds.length > 0) {
                const methodologies = await prisma.methodology.findMany({
                    where: { id: { in: batchData.methodologyIds } },
                });
                if (methodologies.length !== batchData.methodologyIds.length) {
                    res.status(400).json({ message: 'One or more selected methodologies are invalid' });
                    return;
                }
            }
            // Validate units if provided
            if (batchData.unitIds && batchData.unitIds.length > 0) {
                const units = await prisma.unitOfMeasurement.findMany({
                    where: { id: { in: batchData.unitIds } },
                });
                if (units.length !== batchData.unitIds.length) {
                    res.status(400).json({ message: 'One or more selected units of measurement are invalid' });
                    return;
                }
            }
            // Check if batch number already exists
            const existingBatch = await prisma.batch.findUnique({
                where: { batchNumber: batchData.batchNumber },
            });
            if (existingBatch) {
                res.status(400).json({ message: 'Batch number already exists' });
                return;
            }
            // Generate unique ID for batch
            const batchId = (0, uuid_1.v4)();
            // Start a transaction to ensure all related data is created
            const batch = await prisma.$transaction(async (prisma) => {
                // Create batch
                const batch = await prisma.batch.create({
                    data: {
                        id: batchId,
                        batchNumber: batchData.batchNumber,
                        batchCode: batchData.batchCode || null,
                        grnNumber: batchData.grnNumber || null,
                        productId: batchData.productId,
                        dateOfProduction: new Date(batchData.dateOfProduction),
                        bestBeforeDate: new Date(batchData.bestBeforeDate),
                        sampleAnalysisStarted: batchData.sampleAnalysisStarted ? new Date(batchData.sampleAnalysisStarted) : null,
                        sampleAnalysisCompleted: batchData.sampleAnalysisCompleted ? new Date(batchData.sampleAnalysisCompleted) : null,
                        sampleAnalysisStatus: batchData.sampleAnalysisStatus || prisma_1.SampleAnalysisStatus.PENDING,
                        makerId: userId,
                        status: prisma_1.BatchStatus.SUBMITTED,
                        standards: batchData.standardIds && batchData.standardIds.length > 0
                            ? { connect: batchData.standardIds.map((id) => ({ id })) }
                            : undefined,
                        methodologies: batchData.methodologyIds && batchData.methodologyIds.length > 0
                            ? { connect: batchData.methodologyIds.map((id) => ({ id })) }
                            : undefined,
                        unitOfMeasurements: batchData.unitIds && batchData.unitIds.length > 0
                            ? { connect: batchData.unitIds.map((id) => ({ id })) }
                            : undefined,
                        updatedAt: new Date(),
                    },
                });
                // Create parameter values
                if (batchData.parameterValues && batchData.parameterValues.length > 0) {
                    for (const paramValue of batchData.parameterValues) {
                        await prisma.batchParameterValue.create({
                            data: {
                                id: (0, uuid_1.v4)(),
                                batchId: batchId,
                                parameterId: paramValue.parameterId,
                                value: paramValue.value,
                                standardValue: paramValue.standardValue, // ADD THIS
                                remark: paramValue.remark || null,
                                unitId: paramValue.unitId,
                                methodologyId: paramValue.methodologyId,
                                updatedAt: new Date(),
                            },
                        });
                    }
                }
                // Log activity
                await prisma.activityLog.create({
                    data: {
                        id: (0, uuid_1.v4)(),
                        userId,
                        batchId,
                        action: 'CREATE_BATCH',
                        details: `Created batch ${batchData.batchNumber}`,
                    },
                });
                return batch;
            });
            res.status(201).json({
                message: 'Batch created successfully',
                batch,
            });
        }
        catch (error) {
            console.error('Create batch error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getBatches(req, res) {
        try {
            const filters = req.query;
            // Build where conditions
            const whereConditions = {};
            if (filters.status) {
                whereConditions.status = filters.status;
            }
            if (filters.productId) {
                whereConditions.productId = filters.productId;
            }
            if (filters.batchNumber) {
                whereConditions.batchNumber = {
                    contains: filters.batchNumber,
                    mode: 'insensitive'
                };
            }
            if (filters.dateFrom || filters.dateTo) {
                whereConditions.dateOfProduction = {};
                if (filters.dateFrom) {
                    whereConditions.dateOfProduction.gte = new Date(filters.dateFrom);
                }
                if (filters.dateTo) {
                    whereConditions.dateOfProduction.lte = new Date(filters.dateTo);
                }
            }
            // Get batches with pagination
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const batches = await prisma.batch.findMany({
                where: whereConditions,
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    Product: true,
                    parameterValues: {
                        include: {
                            parameter: {
                                include: {
                                    category: true
                                }
                            },
                            unit: true,
                            methodology: true
                        }
                    },
                    User_Batch_makerIdToUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    User_Batch_checkerIdToUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    standards: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            Category: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    },
                    methodologies: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    unitOfMeasurements: {
                        select: {
                            id: true,
                            name: true,
                            symbol: true
                        }
                    },
                    ActivityLog: {
                        take: 5,
                        orderBy: {
                            createdAt: 'desc'
                        },
                        include: {
                            User: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                }
            });
            // Get total count for pagination
            const totalCount = await prisma.batch.count({
                where: whereConditions
            });
            // Format the response data - group parameter values by category
            const formattedBatches = batches.map(batch => {
                // Group parameter values by category
                const parametersByCategory = {};
                batch.parameterValues.forEach(pv => {
                    const categoryName = pv.parameter.category.name;
                    if (!parametersByCategory[categoryName]) {
                        parametersByCategory[categoryName] = [];
                    }
                    parametersByCategory[categoryName].push({
                        id: pv.id,
                        parameter: pv.parameter,
                        value: pv.value,
                        unit: pv.unit,
                        methodology: pv.methodology,
                        verificationResult: pv.verificationResult,
                        verificationRemark: pv.verificationRemark,
                        remark: pv.remark || null,
                        standardValue: pv.parameter.standardValue || pv.standardValue || null
                    });
                });
                return {
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    productId: batch.productId,
                    productName: batch.Product.name,
                    dateOfProduction: batch.dateOfProduction,
                    bestBeforeDate: batch.bestBeforeDate,
                    sampleAnalysisStatus: batch.sampleAnalysisStatus,
                    status: batch.status,
                    maker: batch.User_Batch_makerIdToUser,
                    checker: batch.User_Batch_checkerIdToUser,
                    standards: batch.standards,
                    parameterValuesByCategory: parametersByCategory,
                    methodologies: batch.methodologies,
                    units: batch.unitOfMeasurements,
                    recentActivities: batch.ActivityLog,
                    createdAt: batch.createdAt,
                    updatedAt: batch.updatedAt
                };
            });
            res.status(200).json({
                batches: formattedBatches,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            });
        }
        catch (error) {
            console.error('Get batches error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async updateBatch(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const updateData = req.body;
            // Get current batch status
            const currentBatch = await prisma.batch.findUnique({
                where: { id },
                include: {
                    parameterValues: true
                }
            });
            if (!currentBatch) {
                res.status(404).json({ message: 'Batch not found' });
                return;
            }
            // Verify batch is in DRAFT status and user is the maker
            if (currentBatch.status !== prisma_1.BatchStatus.DRAFT) {
                res.status(400).json({ message: 'Only batches in DRAFT status can be updated' });
                return;
            }
            if (currentBatch.makerId !== userId) {
                res.status(403).json({ message: 'Only the batch maker can update this batch' });
                return;
            }
            // Start transaction for the update
            await prisma.$transaction(async (prisma) => {
                // Update batch main data
                await prisma.batch.update({
                    where: { id },
                    data: {
                        batchNumber: updateData.batchNumber,
                        productId: updateData.productId,
                        dateOfProduction: updateData.dateOfProduction ? new Date(updateData.dateOfProduction) : undefined,
                        bestBeforeDate: updateData.bestBeforeDate ? new Date(updateData.bestBeforeDate) : undefined,
                        sampleAnalysisStarted: updateData.sampleAnalysisStarted ? new Date(updateData.sampleAnalysisStarted) : undefined,
                        sampleAnalysisCompleted: updateData.sampleAnalysisCompleted ? new Date(updateData.sampleAnalysisCompleted) : undefined,
                        sampleAnalysisStatus: updateData.sampleAnalysisStatus,
                        updatedAt: new Date()
                    }
                });
                // Update parameter values if provided
                if (updateData.parameterValues && updateData.parameterValues.length > 0) {
                    // Get existing parameter values for comparison
                    const existingParamValues = new Map(currentBatch.parameterValues.map(pv => [pv.parameterId, pv]));
                    // Process each parameter value
                    for (const paramValue of updateData.parameterValues) {
                        const existingValue = existingParamValues.get(paramValue.parameterId);
                        if (existingValue) {
                            // Update existing parameter value
                            await prisma.batchParameterValue.update({
                                where: { id: existingValue.id },
                                data: {
                                    value: paramValue.value,
                                    standardValue: paramValue.standardValue,
                                    remark: paramValue.remark || null, // ADD THIS
                                    unitId: paramValue.unitId,
                                    methodologyId: paramValue.methodologyId,
                                    updatedAt: new Date()
                                }
                            });
                            // Remove from map to track which ones were updated
                            existingParamValues.delete(paramValue.parameterId);
                        }
                        else {
                            // Create new parameter value
                            await prisma.batchParameterValue.create({
                                data: {
                                    id: (0, uuid_1.v4)(),
                                    batchId: id,
                                    parameterId: paramValue.parameterId,
                                    value: paramValue.value,
                                    standardValue: paramValue.standardValue, // ADD THIS
                                    unitId: paramValue.unitId,
                                    methodologyId: paramValue.methodologyId,
                                    updatedAt: new Date()
                                }
                            });
                        }
                    }
                    // Delete parameter values that were not in the update
                    if (updateData.deleteOtherParameters) {
                        for (const [, paramValue] of existingParamValues.entries()) {
                            await prisma.batchParameterValue.delete({
                                where: { id: paramValue.id }
                            });
                        }
                    }
                }
                // Update standards if provided
                if (updateData.standardIds) {
                    await prisma.batch.update({
                        where: { id },
                        data: {
                            standards: {
                                set: updateData.standardIds.map((id) => ({ id }))
                            }
                        }
                    });
                }
                // Update methodologies if provided
                if (updateData.methodologyIds) {
                    await prisma.batch.update({
                        where: { id },
                        data: {
                            methodologies: {
                                set: updateData.methodologyIds.map((id) => ({ id }))
                            }
                        }
                    });
                }
                // Update units if provided
                if (updateData.unitIds) {
                    await prisma.batch.update({
                        where: { id },
                        data: {
                            unitOfMeasurements: {
                                set: updateData.unitIds.map((id) => ({ id }))
                            }
                        }
                    });
                }
                // Log update activity
                await prisma.activityLog.create({
                    data: {
                        id: (0, uuid_1.v4)(),
                        userId,
                        batchId: id,
                        action: 'UPDATE_BATCH',
                        details: `Updated batch ${currentBatch.batchNumber}`,
                    }
                });
            });
            res.status(200).json({ message: 'Batch updated successfully' });
        }
        catch (error) {
            console.error('Update batch error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async submitBatch(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.userId;
            // Get current batch status
            const currentBatch = await prisma.batch.findUnique({
                where: { id },
                include: {
                    Product: true
                }
            });
            if (!currentBatch) {
                res.status(404).json({ message: 'Batch not found' });
                return;
            }
            // Verify batch is in DRAFT status and user is the maker
            if (currentBatch.status !== prisma_1.BatchStatus.DRAFT) {
                res.status(400).json({ message: 'Only batches in DRAFT status can be submitted' });
                return;
            }
            if (currentBatch.makerId !== userId) {
                res.status(403).json({ message: 'Only the batch maker can submit this batch' });
                return;
            }
            // Update batch status to SUBMITTED
            await prisma.batch.update({
                where: { id },
                data: {
                    status: prisma_1.BatchStatus.SUBMITTED,
                    updatedAt: new Date()
                }
            });
            // Log submission activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    batchId: id,
                    action: 'SUBMIT_BATCH',
                    details: `Submitted batch ${currentBatch.batchNumber} for review`,
                }
            });
            // Find checkers (users with 'CHECKER' role) to notify
            const checkers = await prisma.user.findMany({
                where: {
                    Role: {
                        name: 'CHECKER'
                    }
                }
            });
            // Create notifications for all checkers
            for (const checker of checkers) {
                await notificationService.createNotification({
                    userId: checker.id,
                    batchId: id,
                    message: `New batch ${currentBatch.batchNumber} (${currentBatch.Product.name}) submitted for review`,
                    type: 'BATCH_SUBMITTED'
                });
            }
            res.status(200).json({ message: 'Batch submitted for review successfully' });
        }
        catch (error) {
            console.error('Submit batch error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async approveBatch(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const { id } = req.params;
            const userId = req.user.id;
            // Get current batch status
            const currentBatch = await prisma.batch.findUnique({
                where: { id },
                include: {
                    Product: true,
                    User_Batch_makerIdToUser: true
                }
            });
            if (!currentBatch) {
                res.status(404).json({ message: 'Batch not found' });
                return;
            }
            // Verify batch is in SUBMITTED status
            if (currentBatch.status !== prisma_1.BatchStatus.SUBMITTED) {
                res.status(400).json({ message: 'Only batches in SUBMITTED status can be approved' });
                return;
            }
            // Update batch status to APPROVED and set checker ID
            await prisma.batch.update({
                where: { id },
                data: {
                    status: prisma_1.BatchStatus.APPROVED,
                    checkerId: userId,
                    updatedAt: new Date()
                }
            });
            // Log approval activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    batchId: id,
                    action: 'APPROVE_BATCH',
                    details: `Approved batch ${currentBatch.batchNumber}`,
                }
            });
            // Notify the maker
            await notificationService.createNotification({
                userId: currentBatch.makerId,
                batchId: id,
                message: `Your batch ${currentBatch.batchNumber} (${currentBatch.Product.name}) has been approved`,
                type: 'BATCH_APPROVED'
            });
            res.status(200).json({ message: 'Batch approved successfully' });
        }
        catch (error) {
            console.error('Approve batch error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async rejectBatch(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const { id } = req.params;
            const userId = req.user.id;
            const { rejectionRemarks } = req.body;
            if (!rejectionRemarks) {
                res.status(400).json({ message: 'Rejection remarks are required' });
                return;
            }
            // Get current batch status
            const currentBatch = await prisma.batch.findUnique({
                where: { id },
                include: {
                    Product: true,
                    User_Batch_makerIdToUser: true
                }
            });
            if (!currentBatch) {
                res.status(404).json({ message: 'Batch not found' });
                return;
            }
            // Verify batch is in SUBMITTED status
            if (currentBatch.status !== prisma_1.BatchStatus.SUBMITTED) {
                res.status(400).json({ message: 'Only batches in SUBMITTED status can be rejected' });
                return;
            }
            // Update batch status to REJECTED, set checker ID and add rejection remarks
            await prisma.batch.update({
                where: { id },
                data: {
                    status: prisma_1.BatchStatus.REJECTED,
                    checkerId: userId,
                    rejectionRemarks,
                    updatedAt: new Date()
                }
            });
            // Log rejection activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    batchId: id,
                    action: 'REJECT_BATCH',
                    details: `Rejected batch ${currentBatch.batchNumber}: ${rejectionRemarks}`,
                }
            });
            // Notify the maker
            await notificationService.createNotification({
                userId: currentBatch.makerId,
                batchId: id,
                message: `Your batch ${currentBatch.batchNumber} (${currentBatch.Product.name}) has been rejected: ${rejectionRemarks}`,
                type: 'BATCH_REJECTED'
            });
            res.status(200).json({ message: 'Batch rejected successfully' });
        }
        catch (error) {
            console.error('Reject batch error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async exportToExcel(req, res) {
        try {
            const batches = await prisma.batch.findMany({
                include: {
                    Product: true,
                    User_Batch_makerIdToUser: true,
                    User_Batch_checkerIdToUser: true
                }
            });
            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.json_to_sheet(batches);
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Batches');
            const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            // Send email with attachment via Brevo
            const clientEmail = process.env.CLIENT_EMAIL;
            if (clientEmail) {
                const base64Attachment = buffer.toString('base64');
                const currentDate = new Date().toISOString().split('T')[0];
                await (0, brevomail_1.sendTransactionalEmail)({
                    to: [{ email: clientEmail }],
                    subject: `Batch Export Report - ${currentDate}`,
                    htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Batch Export Report</h2>
              <p>Dear User,</p>
              <p>Please find attached the batch export report generated on <strong>${new Date().toLocaleString()}</strong>.</p>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Total Batches:</strong> ${batches.length}</p>
                <p><strong>File Format:</strong> Excel (.xlsx)</p>
              </div>
              <p>The Excel file contains detailed information about all batches including product details, makers, checkers, and status.</p>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated email from TGAF BatchFlow System.</p>
            </div>
          `,
                    sender: {
                        name: 'TGAF BatchFlow',
                        email: process.env.EMAIL_USER || 'training@tgaf.com'
                    }
                });
                console.log(`Batch export email sent to ${clientEmail}`);
            }
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=batches.xlsx');
            //implement email here
            res.send(buffer);
        }
        catch (error) {
            console.error('Export batches error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getActivityLogs(req, res) {
        try {
            const { startDate, endDate, userName } = req.query;
            // Build where conditions for filtering
            const whereConditions = {};
            // Filter by date range
            if (startDate && endDate && startDate === endDate) {
                // If startDate and endDate are the same, filter for that exact date
                const date = new Date(startDate);
                whereConditions.createdAt = {
                    gte: date,
                    lt: new Date(date.getTime() + 24 * 60 * 60 * 1000), // Add 1 day to include the entire day
                };
            }
            else {
                if (startDate) {
                    whereConditions.createdAt = whereConditions.createdAt || {};
                    whereConditions.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    whereConditions.createdAt = whereConditions.createdAt || {};
                    whereConditions.createdAt.lte = new Date(endDate);
                }
            }
            // Filter by user name
            if (userName) {
                whereConditions.User = {
                    name: {
                        contains: userName,
                        mode: "insensitive", // Case-insensitive search
                    },
                };
            }
            // Fetch activity logs with filters
            const activityLogs = await prisma.activityLog.findMany({
                where: whereConditions,
                orderBy: {
                    createdAt: "desc", // Sort by most recent activity
                },
                include: {
                    User: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    Batch: {
                        select: {
                            id: true,
                            batchNumber: true,
                        },
                    },
                },
            });
            // Return the activity logs
            res.status(200).json({ activityLogs });
        }
        catch (error) {
            console.error("Get activity logs error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
    async generateCertificateOfAnalysis(req, res) {
        try {
            const { id } = req.params;
            // Get batch with all necessary data
            const batch = await prisma.batch.findUnique({
                where: { id },
                include: {
                    Product: true,
                    parameterValues: {
                        include: {
                            parameter: {
                                include: {
                                    category: true,
                                    standards: {
                                        where: {
                                            status: 'ACTIVE'
                                        },
                                        include: {
                                            unit: true,
                                            methodology: true
                                        },
                                        orderBy: {
                                            updatedAt: 'desc'
                                        },
                                        take: 1 // Get most recent standard definition
                                    }
                                }
                            },
                            unit: true,
                            methodology: true
                        }
                    },
                    User_Batch_makerIdToUser: {
                        select: {
                            name: true
                        }
                    },
                    User_Batch_checkerIdToUser: {
                        select: {
                            name: true
                        }
                    }
                }
            });
            if (!batch) {
                res.status(404).json({ message: 'Batch not found' });
                return;
            }
            // Organize parameter values by category
            const parametersByCategory = {};
            batch.parameterValues.forEach(paramValue => {
                // Get category name
                const categoryName = paramValue.parameter.category.name;
                // Initialize category array if it doesn't exist
                if (!parametersByCategory[categoryName]) {
                    parametersByCategory[categoryName] = [];
                }
                // Get the standard definition for this parameter (if any)
                const standardDef = paramValue.parameter.standards.length > 0
                    ? paramValue.parameter.standards[0]
                    : null;
                // Determine compliance status
                let complianceStatus = 'NOT_APPLICABLE';
                if (standardDef) {
                    const standardValue = standardDef.standardValue;
                    const actualValue = paramValue.value;
                    // Handle different comparison types based on data format
                    if (standardValue.includes('-') && paramValue.parameter.dataType !== 'TEXT') {
                        // Range comparison (e.g., "2.5-3.5")
                        const [minStr, maxStr] = standardValue.split('-');
                        const min = parseFloat(minStr);
                        const max = parseFloat(maxStr);
                        const actual = parseFloat(actualValue);
                        complianceStatus = !isNaN(actual) && actual >= min && actual <= max ? 'COMPLIANT' : 'NON_COMPLIANT';
                    }
                    else if ((standardValue.includes('≤') || standardValue.includes('<=')) &&
                        paramValue.parameter.dataType !== 'TEXT') {
                        // Less than or equal comparison
                        const maxValue = parseFloat(standardValue.replace(/≤|<=/, '').trim());
                        const actual = parseFloat(actualValue);
                        complianceStatus = !isNaN(actual) && actual <= maxValue ? 'COMPLIANT' : 'NON_COMPLIANT';
                    }
                    else if ((standardValue.includes('≥') || standardValue.includes('>=')) &&
                        paramValue.parameter.dataType !== 'TEXT') {
                        // Greater than or equal comparison
                        const minValue = parseFloat(standardValue.replace(/≥|>=/, '').trim());
                        const actual = parseFloat(actualValue);
                        complianceStatus = !isNaN(actual) && actual >= minValue ? 'COMPLIANT' : 'NON_COMPLIANT';
                    }
                    else if (standardValue.toLowerCase().includes('max:') &&
                        paramValue.parameter.dataType !== 'TEXT') {
                        // Max value comparison
                        const maxValue = parseFloat(standardValue.replace(/max:/i, '').trim());
                        const actual = parseFloat(actualValue);
                        complianceStatus = !isNaN(actual) && actual <= maxValue ? 'COMPLIANT' : 'NON_COMPLIANT';
                    }
                    else if (standardValue.toLowerCase().includes('min:') &&
                        paramValue.parameter.dataType !== 'TEXT') {
                        // Min value comparison
                        const minValue = parseFloat(standardValue.replace(/min:/i, '').trim());
                        const actual = parseFloat(actualValue);
                        complianceStatus = !isNaN(actual) && actual >= minValue ? 'COMPLIANT' : 'NON_COMPLIANT';
                    }
                    else if (['FLOAT', 'INTEGER', 'PERCENTAGE'].includes(paramValue.parameter.dataType)) {
                        // Direct numeric comparison
                        const standard = parseFloat(standardValue);
                        const actual = parseFloat(actualValue);
                        // Use a small epsilon for floating point comparison
                        const epsilon = 0.0001;
                        complianceStatus = !isNaN(actual) && Math.abs(actual - standard) < epsilon ? 'COMPLIANT' : 'NON_COMPLIANT';
                    }
                    else {
                        // Text/string comparison
                        complianceStatus = standardValue === actualValue ? 'COMPLIANT' : 'NON_COMPLIANT';
                    }
                }
                // Add to category with comparison results
                parametersByCategory[categoryName].push({
                    parameterName: paramValue.parameter.name,
                    standardValue: standardDef?.standardValue || 'Not defined',
                    standardUnit: standardDef?.unit?.symbol || '',
                    actualValue: paramValue.value,
                    actualUnit: paramValue.unit?.symbol || '',
                    testMethodology: paramValue.methodology?.name || standardDef?.methodology?.name || '',
                    complianceStatus
                });
            });
            // Create certificate data structure
            const certificate = {
                certificateNumber: `COA/${batch.batchNumber}/${new Date().getFullYear()}`,
                issuedTo: "Customer Name", // Replace with actual customer info if available
                issuedDate: new Date(),
                product: {
                    name: batch.Product.name,
                    batchNumber: batch.batchNumber,
                    dateOfProduction: batch.dateOfProduction,
                    bestBeforeDate: batch.bestBeforeDate
                },
                sampleAnalysis: {
                    started: batch.sampleAnalysisStarted,
                    completed: batch.sampleAnalysisCompleted
                },
                parameters: parametersByCategory,
                approvedBy: batch.User_Batch_checkerIdToUser?.name || 'Pending Approval',
                testedBy: batch.User_Batch_makerIdToUser?.name || 'Unknown',
                // Calculate overall compliance
                complianceSummary: {
                    totalParameters: batch.parameterValues.length,
                    compliantParameters: batch.parameterValues.filter(pv => pv.parameter.standards.length > 0 &&
                        // Calculate compliance here again or store in an array above
                        true // Placeholder
                    ).length,
                    nonCompliantParameters: batch.parameterValues.filter(pv => pv.parameter.standards.length > 0 &&
                        // Calculate non-compliance here or store in an array above
                        false // Placeholder
                    ).length,
                    parametersWithoutStandards: batch.parameterValues.filter(pv => pv.parameter.standards.length === 0).length
                }
            };
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId: req.user?.id || '',
                    batchId: id,
                    action: 'GENERATE_CERTIFICATE',
                    details: `Generated Certificate of Analysis for batch ${batch.batchNumber}`,
                }
            });
            res.status(200).json({
                message: 'Certificate of Analysis generated successfully',
                certificate
            });
        }
        catch (error) {
            console.error('Generate Certificate error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getParametersByProductId(req, res) {
        try {
            const { productId } = req.params;
            if (!productId) {
                res.status(400).json({ message: 'Product ID is required' });
                return;
            }
            // Check if product exists
            const product = await prisma.product.findUnique({
                where: { id: productId }
            });
            if (!product) {
                res.status(404).json({ message: 'Product not found' });
                return;
            }
            // Get parameters specifically linked to this product through ProductParameter
            const productParameters = await prisma.productParameter.findMany({
                where: { productId },
                include: {
                    parameter: {
                        include: {
                            category: true,
                            unit: true,
                            standards: {
                                where: {
                                    status: 'ACTIVE'
                                },
                                include: {
                                    unit: true,
                                    methodology: true
                                },
                                orderBy: {
                                    updatedAt: 'desc'
                                },
                                take: 1
                            }
                        }
                    }
                },
                orderBy: {
                    parameter: {
                        category: {
                            name: 'asc'
                        }
                    }
                }
            });
            // Group parameters by category and include standard value/unit
            const parametersByCategory = {};
            productParameters.forEach(pp => {
                const categoryName = pp.parameter.category.name;
                if (!parametersByCategory[categoryName]) {
                    parametersByCategory[categoryName] = [];
                }
                const standardDef = pp.parameter.standards.length > 0
                    ? pp.parameter.standards[0]
                    : null;
                const parameterWithContext = {
                    ...pp.parameter,
                    isRequired: pp.isRequired,
                    linkedAt: pp.createdAt,
                    standardValue: pp.parameter.standardValue || null,
                    standardUnit: standardDef?.unit?.symbol || null // ADD THIS
                };
                parametersByCategory[categoryName].push(parameterWithContext);
            });
            // Sort categories for consistent output
            const sortedCategories = {};
            Object.keys(parametersByCategory)
                .sort()
                .forEach(key => {
                sortedCategories[key] = parametersByCategory[key];
            });
            res.status(200).json({
                product: product.name,
                productCode: product.code,
                parametersByCategory: sortedCategories,
                totalParameters: productParameters.length,
                categoriesCount: Object.keys(sortedCategories).length
            });
        }
        catch (error) {
            console.error('Get product parameters error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getBatchesForVerification(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            // Include SUBMITTED, APPROVED, and REJECTED batches for verification view
            const batches = await prisma.batch.findMany({
                where: {
                    status: {
                        in: [prisma_1.BatchStatus.SUBMITTED, prisma_1.BatchStatus.APPROVED, prisma_1.BatchStatus.REJECTED]
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    Product: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    User_Batch_makerIdToUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    User_Batch_checkerIdToUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    parameterValues: {
                        include: {
                            parameter: {
                                include: {
                                    category: true
                                }
                            }
                        }
                    }
                }
            });
            // Format response with parameter count by category
            const formattedBatches = batches.map(batch => {
                const parametersByCategory = {};
                batch.parameterValues.forEach(pv => {
                    const categoryName = pv.parameter.category.name;
                    parametersByCategory[categoryName] = (parametersByCategory[categoryName] || 0) + 1;
                });
                return {
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    product: batch.Product,
                    maker: batch.User_Batch_makerIdToUser,
                    checker: batch.User_Batch_checkerIdToUser,
                    dateOfProduction: batch.dateOfProduction,
                    bestBeforeDate: batch.bestBeforeDate,
                    sampleAnalysisStarted: batch.sampleAnalysisStarted,
                    sampleAnalysisCompleted: batch.sampleAnalysisCompleted,
                    sampleAnalysisStatus: batch.sampleAnalysisStatus,
                    status: batch.status, // Include the batch status
                    rejectionRemarks: batch.rejectionRemarks, // Include rejection remarks
                    totalParameters: batch.parameterValues.length,
                    parametersByCategory,
                    createdAt: batch.createdAt,
                    updatedAt: batch.updatedAt
                };
            });
            res.status(200).json({
                batches: formattedBatches,
                totalCount: formattedBatches.length
            });
        }
        catch (error) {
            console.error('Get batches for verification error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getBatchParametersForVerification(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            // Get batch with all parameter values
            const batch = await prisma.batch.findUnique({
                where: { id },
                include: {
                    Product: true,
                    User_Batch_makerIdToUser: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    User_Batch_checkerIdToUser: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    parameterValues: {
                        include: {
                            parameter: {
                                include: {
                                    category: true,
                                    standards: {
                                        where: {
                                            status: 'ACTIVE'
                                        },
                                        include: {
                                            unit: true,
                                            methodology: true
                                        },
                                        orderBy: {
                                            updatedAt: 'desc'
                                        },
                                        take: 1
                                    }
                                }
                            },
                            unit: true,
                            methodology: true
                        }
                    }
                }
            });
            if (!batch) {
                res.status(404).json({ message: 'Batch not found' });
                return;
            }
            // Allow viewing parameters for SUBMITTED, APPROVED, and REJECTED batches
            if (!['SUBMITTED', 'APPROVED', 'REJECTED'].includes(batch.status)) {
                res.status(400).json({ message: 'Batch is not available for verification' });
                return;
            }
            // Group parameters by category
            const parametersByCategory = {};
            batch.parameterValues.forEach(pv => {
                const categoryName = pv.parameter.category.name;
                if (!parametersByCategory[categoryName]) {
                    parametersByCategory[categoryName] = [];
                }
                // Get standard definition if available
                const standardDef = pv.parameter.standards.length > 0
                    ? pv.parameter.standards[0]
                    : null;
                parametersByCategory[categoryName].push({
                    id: pv.id,
                    parameterId: pv.parameterId,
                    parameterName: pv.parameter.name,
                    parameterDescription: pv.parameter.description,
                    dataType: pv.parameter.dataType,
                    currentValue: pv.value,
                    currentUnit: pv.unit,
                    currentMethodology: pv.methodology,
                    standardDefinition: standardDef ? {
                        standardValue: standardDef.standardValue,
                        unit: standardDef.unit,
                        methodology: standardDef.methodology
                    } : null,
                    // Include verification data if available (for already verified batches)
                    verificationResult: pv.verificationResult || null,
                    verificationRemark: pv.verificationRemark || null
                });
            });
            // Sort categories alphabetically
            const sortedCategories = {};
            Object.keys(parametersByCategory)
                .sort()
                .forEach(key => {
                sortedCategories[key] = parametersByCategory[key];
            });
            res.status(200).json({
                batch: {
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    product: batch.Product,
                    maker: batch.User_Batch_makerIdToUser,
                    checker: batch.User_Batch_checkerIdToUser,
                    dateOfProduction: batch.dateOfProduction,
                    bestBeforeDate: batch.bestBeforeDate,
                    sampleAnalysisStarted: batch.sampleAnalysisStarted,
                    sampleAnalysisCompleted: batch.sampleAnalysisCompleted,
                    sampleAnalysisStatus: batch.sampleAnalysisStatus,
                    status: batch.status, // Include batch status
                    rejectionRemarks: batch.rejectionRemarks // Include rejection remarks
                },
                parametersByCategory: sortedCategories,
                totalParameters: batch.parameterValues.length,
                categoriesCount: Object.keys(sortedCategories).length
            });
        }
        catch (error) {
            console.error('Get batch parameters for verification error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async updateParameterVerification(req, res) {
        try {
            const { batchId } = req.params;
            const { parameterVerifications } = req.body;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            // Validate input
            if (!parameterVerifications || !Array.isArray(parameterVerifications)) {
                res.status(400).json({ message: 'Parameter verifications array is required' });
                return;
            }
            // Get batch and verify it's in correct status
            const batch = await prisma.batch.findUnique({
                where: { id: batchId },
                include: {
                    parameterValues: true
                }
            });
            if (!batch) {
                res.status(404).json({ message: 'Batch not found' });
                return;
            }
            if (batch.status !== prisma_1.BatchStatus.SUBMITTED) {
                res.status(400).json({ message: 'Batch is not available for verification' });
                return;
            }
            // Create new table for parameter verification results
            // Since this is a new feature, we need to add verification fields to BatchParameterValue
            // or create a new verification table
            await prisma.$transaction(async (prisma) => {
                // Update each parameter verification
                for (const verification of parameterVerifications) {
                    const { parameterValueId, verificationResult, verificationRemark } = verification;
                    if (!parameterValueId || !verificationResult) {
                        throw new Error('Parameter value ID and verification result are required');
                    }
                    // For now, we'll add verification fields to BatchParameterValue
                    // You might want to create a separate ParameterVerification table
                    await prisma.batchParameterValue.update({
                        where: { id: parameterValueId },
                        data: {
                            // Add these fields to your schema:
                            verificationResult: verificationResult,
                            verificationRemark: verificationRemark || null,
                            verifiedById: userId,
                            verifiedAt: new Date(),
                            updatedAt: new Date()
                        }
                    });
                }
                // Log verification activity
                await prisma.activityLog.create({
                    data: {
                        id: (0, uuid_1.v4)(),
                        userId,
                        batchId,
                        action: 'VERIFY_PARAMETERS',
                        details: `Verified ${parameterVerifications.length} parameters for batch ${batch.batchNumber}`,
                    }
                });
            });
            res.status(200).json({
                message: 'Parameter verification updated successfully',
                verifiedCount: parameterVerifications.length
            });
        }
        catch (error) {
            console.error('Update parameter verification error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async completeBatchVerification(req, res) {
        try {
            const { batchId } = req.params;
            const { action, remarks } = req.body; // action: 'APPROVE' | 'REJECT'
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            if (!action || !['APPROVE', 'REJECT'].includes(action)) {
                res.status(400).json({ message: 'Valid action (APPROVE/REJECT) is required' });
                return;
            }
            if (action === 'REJECT' && !remarks) {
                res.status(400).json({ message: 'Remarks are required for rejection' });
                return;
            }
            // Get batch
            const batch = await prisma.batch.findUnique({
                where: { id: batchId },
                include: {
                    Product: true,
                    User_Batch_makerIdToUser: true
                }
            });
            if (!batch) {
                res.status(404).json({ message: 'Batch not found' });
                return;
            }
            if (batch.status !== prisma_1.BatchStatus.SUBMITTED) {
                res.status(400).json({ message: 'Batch is not available for verification' });
                return;
            }
            // Update batch status
            const newStatus = action === 'APPROVE' ? prisma_1.BatchStatus.APPROVED : prisma_1.BatchStatus.REJECTED;
            await prisma.batch.update({
                where: { id: batchId },
                data: {
                    status: newStatus,
                    checkerId: userId,
                    rejectionRemarks: action === 'REJECT' ? remarks : null,
                    updatedAt: new Date()
                }
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    batchId,
                    action: action === 'APPROVE' ? 'APPROVE_BATCH' : 'REJECT_BATCH',
                    details: action === 'APPROVE'
                        ? `Approved batch ${batch.batchNumber} after verification`
                        : `Rejected batch ${batch.batchNumber}: ${remarks}`,
                }
            });
            // Notify maker
            await notificationService.createNotification({
                userId: batch.makerId,
                batchId,
                message: action === 'APPROVE'
                    ? `Your batch ${batch.batchNumber} (${batch.Product.name}) has been approved after verification`
                    : `Your batch ${batch.batchNumber} (${batch.Product.name}) has been rejected: ${remarks}`,
                type: action === 'APPROVE' ? 'BATCH_APPROVED' : 'BATCH_REJECTED'
            });
            res.status(200).json({
                message: `Batch ${action.toLowerCase()}d successfully`
            });
        }
        catch (error) {
            console.error('Complete batch verification error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getBatchesWithDrafts(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            const filters = req.query;
            // Build where conditions for batches
            const whereConditions = {};
            if (filters.status && filters.status !== 'DRAFT') {
                whereConditions.status = filters.status;
            }
            if (filters.productId) {
                whereConditions.productId = filters.productId;
            }
            if (filters.batchNumber) {
                whereConditions.batchNumber = {
                    contains: filters.batchNumber,
                    mode: 'insensitive'
                };
            }
            if (filters.dateFrom || filters.dateTo) {
                whereConditions.dateOfProduction = {};
                if (filters.dateFrom) {
                    whereConditions.dateOfProduction.gte = new Date(filters.dateFrom);
                }
                if (filters.dateTo) {
                    whereConditions.dateOfProduction.lte = new Date(filters.dateTo);
                }
            }
            // Get batches with pagination
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            // Fetch both batches and drafts
            const [batches, drafts] = await Promise.all([
                prisma.batch.findMany({
                    where: whereConditions,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        Product: true,
                        parameterValues: {
                            include: {
                                parameter: {
                                    include: {
                                        category: true
                                    }
                                },
                                unit: true,
                                methodology: true
                            }
                        },
                        User_Batch_makerIdToUser: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        User_Batch_checkerIdToUser: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        standards: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                Category: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        },
                        methodologies: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        unitOfMeasurements: {
                            select: {
                                id: true,
                                name: true,
                                symbol: true
                            }
                        },
                        ActivityLog: {
                            take: 5,
                            orderBy: {
                                createdAt: 'desc'
                            },
                            include: {
                                User: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }),
                // Fetch drafts for the current user with maker information
                prisma.batchDraft.findMany({
                    where: {
                        makerId: userId,
                        ...(filters.batchNumber && {
                            batchNumber: {
                                contains: filters.batchNumber,
                                mode: 'insensitive'
                            }
                        })
                    },
                    orderBy: {
                        updatedAt: 'desc'
                    },
                    include: {
                        maker: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                })
            ]);
            // Get product information for drafts that have productId
            const draftProductIds = drafts
                .filter(draft => draft.productId) // This filters out null/undefined values
                .map(draft => draft.productId)
                .filter((id) => id !== null); // Type guard to ensure string[]
            const draftProducts = draftProductIds.length > 0
                ? await prisma.product.findMany({
                    where: {
                        id: {
                            in: draftProductIds
                        }
                    },
                    select: {
                        id: true,
                        name: true
                    }
                })
                : [];
            // Create a map for quick product lookup
            const productMap = new Map(draftProducts.map(p => [p.id, p.name]));
            // Get total count for pagination
            const totalCount = await prisma.batch.count({
                where: whereConditions
            });
            // Format the response data - group parameter values by category
            const formattedBatches = batches.map(batch => {
                // Group parameter values by category
                const parametersByCategory = {};
                batch.parameterValues.forEach(pv => {
                    const categoryName = pv.parameter.category.name;
                    if (!parametersByCategory[categoryName]) {
                        parametersByCategory[categoryName] = [];
                    }
                    parametersByCategory[categoryName].push({
                        id: pv.id,
                        parameter: pv.parameter,
                        value: pv.value,
                        unit: pv.unit,
                        methodology: pv.methodology,
                        verificationResult: pv.verificationResult,
                        verificationRemark: pv.verificationRemark
                    });
                });
                return {
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    productId: batch.productId,
                    productName: batch.Product.name,
                    dateOfProduction: batch.dateOfProduction,
                    bestBeforeDate: batch.bestBeforeDate,
                    sampleAnalysisStatus: batch.sampleAnalysisStatus,
                    status: batch.status,
                    maker: batch.User_Batch_makerIdToUser,
                    checker: batch.User_Batch_checkerIdToUser,
                    standards: batch.standards,
                    parameterValuesByCategory: parametersByCategory,
                    methodologies: batch.methodologies,
                    units: batch.unitOfMeasurements,
                    recentActivities: batch.ActivityLog,
                    createdAt: batch.createdAt,
                    updatedAt: batch.updatedAt,
                    isDraft: false
                };
            });
            // Format drafts with proper product and maker information
            const formattedDrafts = drafts.map(draft => {
                // Get product name - either from the product relation or newProductName
                let productName = 'Unknown Product';
                if (draft.productId) {
                    productName = productMap.get(draft.productId) || draft.newProductName || 'Unknown Product';
                }
                else if (draft.newProductName) {
                    productName = draft.newProductName;
                }
                return {
                    id: draft.id,
                    batchNumber: draft.batchNumber || 'Draft (No Batch Number)',
                    productId: draft.productId,
                    productName: productName,
                    dateOfProduction: draft.dateOfProduction,
                    bestBeforeDate: draft.bestBeforeDate,
                    sampleAnalysisStatus: draft.sampleAnalysisStatus,
                    status: 'DRAFT',
                    maker: draft.maker, // Now includes maker information
                    checker: null,
                    standards: [],
                    parameterValuesByCategory: {},
                    methodologies: [],
                    units: [],
                    recentActivities: [],
                    createdAt: draft.createdAt,
                    updatedAt: draft.updatedAt,
                    isDraft: true,
                    draftData: {
                        formData: {
                            batchNumber: draft.batchNumber,
                            productId: draft.productId,
                            dateOfProduction: draft.dateOfProduction,
                            bestBeforeDate: draft.bestBeforeDate,
                            sampleAnalysisStarted: draft.sampleAnalysisStarted,
                            sampleAnalysisCompleted: draft.sampleAnalysisCompleted,
                            sampleAnalysisStatus: draft.sampleAnalysisStatus,
                        },
                        parameterValues: draft.parameterValues,
                        newProductName: draft.newProductName
                    }
                };
            });
            // Combine and sort by updated date
            const allItems = [...formattedBatches, ...formattedDrafts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            res.status(200).json({
                batches: allItems,
                drafts: formattedDrafts,
                pagination: {
                    page,
                    limit,
                    totalCount: totalCount + drafts.length,
                    totalPages: Math.ceil((totalCount + drafts.length) / limit)
                }
            });
        }
        catch (error) {
            console.error('Get batches with drafts error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getAvailableGRNNumbers(req, res) {
        try {
            const grnNumbers = await prisma.rMQualityReport.findMany({
                select: {
                    grn: true,
                    rawMaterialName: true,
                    supplier: true,
                },
                distinct: ['grn'],
                orderBy: { createdAt: 'desc' },
            });
            res.status(200).json({
                success: true,
                data: grnNumbers,
            });
        }
        catch (error) {
            console.error('Get GRN numbers error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}
exports.BatchController = BatchController;
exports.default = new BatchController();
