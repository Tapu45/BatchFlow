"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const prisma_1 = require("../../generated/prisma");
const date_fns_1 = require("date-fns");
const prisma = new prisma_1.PrismaClient();
class DashboardController {
    /**
     * Get overview statistics for dashboard
     */
    async getOverviewStats(req, res) {
        try {
            // Get counts of various entities
            const [totalBatches, pendingBatches, approvedBatches, rejectedBatches, totalProducts, totalStandards, totalUsers, recentActivities] = await Promise.all([
                prisma.batch.count(),
                prisma.batch.count({ where: { status: 'SUBMITTED' } }),
                prisma.batch.count({ where: { status: 'APPROVED' } }),
                prisma.batch.count({ where: { status: 'REJECTED' } }),
                prisma.product.count(),
                prisma.standard.count(),
                prisma.user.count(),
                prisma.activityLog.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        User: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        Batch: {
                            select: {
                                id: true,
                                batchNumber: true,
                                status: true
                            }
                        }
                    }
                })
            ]);
            const stats = {
                batches: {
                    total: totalBatches,
                    pending: pendingBatches,
                    approved: approvedBatches,
                    rejected: rejectedBatches
                },
                products: totalProducts,
                standards: totalStandards,
                users: totalUsers,
                recentActivities
            };
            res.status(200).json({ stats });
        }
        catch (error) {
            console.error('Error fetching overview stats:', error);
            res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
        }
    }
    /**
     * Get batch trend data for charts
     */
    async getBatchTrends(req, res) {
        try {
            const { period = 'weekly' } = req.query;
            const today = new Date();
            let startDate;
            let format_string;
            // Determine date range based on period
            if (period === 'weekly') {
                startDate = (0, date_fns_1.subDays)(today, 7);
                format_string = 'yyyy-MM-dd';
            }
            else if (period === 'monthly') {
                startDate = (0, date_fns_1.subDays)(today, 30);
                format_string = 'yyyy-MM-dd';
            }
            else {
                startDate = (0, date_fns_1.subDays)(today, 90); // quarterly
                format_string = 'yyyy-MM';
            }
            // Get all batches in date range
            const batches = await prisma.batch.findMany({
                where: {
                    createdAt: {
                        gte: startDate,
                    },
                },
                select: {
                    id: true,
                    status: true,
                    createdAt: true,
                },
            });
            // Group by date and status
            const trends = {};
            batches.forEach(batch => {
                const dateKey = (0, date_fns_1.format)(batch.createdAt, format_string);
                if (!trends[dateKey]) {
                    trends[dateKey] = { approved: 0, rejected: 0, submitted: 0, draft: 0 };
                }
                if (batch.status === 'APPROVED')
                    trends[dateKey].approved += 1;
                else if (batch.status === 'REJECTED')
                    trends[dateKey].rejected += 1;
                else if (batch.status === 'SUBMITTED')
                    trends[dateKey].submitted += 1;
                else if (batch.status === 'DRAFT')
                    trends[dateKey].draft += 1;
            });
            // Convert to array format for charts
            const trendData = Object.entries(trends).map(([date, counts]) => ({
                date,
                ...counts
            }));
            // Sort by date
            trendData.sort((a, b) => {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
            res.status(200).json({
                period,
                trends: trendData
            });
        }
        catch (error) {
            console.error('Error fetching batch trends:', error);
            res.status(500).json({ message: 'Failed to fetch batch trend data' });
        }
    }
    /**
     * Get product performance data
     */
    async getProductPerformance(req, res) {
        try {
            // Get all products with their batches
            const products = await prisma.product.findMany({
                select: {
                    id: true,
                    name: true,
                    code: true,
                    _count: {
                        select: {
                            Batch: true
                        }
                    },
                    Batch: {
                        select: {
                            id: true,
                            status: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: {
                    Batch: {
                        _count: 'desc'
                    }
                },
                take: 10
            });
            // Calculate statistics for each product
            const productStats = products.map(product => {
                const totalBatches = product.Batch.length;
                const approvedBatches = product.Batch.filter(b => b.status === 'APPROVED').length;
                const rejectedBatches = product.Batch.filter(b => b.status === 'REJECTED').length;
                const pendingBatches = product.Batch.filter(b => b.status === 'SUBMITTED').length;
                // Calculate approval rate
                const approvalRate = totalBatches > 0 ? (approvedBatches / totalBatches) * 100 : 0;
                // Find latest activity
                const latestBatch = product.Batch.reduce((latest, current) => {
                    return latest.createdAt > current.createdAt ? latest : current;
                }, { createdAt: new Date(0) });
                return {
                    id: product.id,
                    name: product.name,
                    code: product.code,
                    totalBatches,
                    approvedBatches,
                    rejectedBatches,
                    pendingBatches,
                    approvalRate: Math.round(approvalRate * 10) / 10, // Round to 1 decimal place
                    lastActivity: latestBatch.createdAt
                };
            });
            // Sort by most active products (total batch count)
            productStats.sort((a, b) => b.totalBatches - a.totalBatches);
            res.status(200).json({ products: productStats });
        }
        catch (error) {
            console.error('Error fetching product performance:', error);
            res.status(500).json({ message: 'Failed to fetch product performance data' });
        }
    }
    /**
     * Get user activity statistics
     */
    async getUserActivity(req, res) {
        try {
            // Get user activity counts
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    Role: {
                        select: {
                            name: true
                        }
                    },
                    _count: {
                        select: {
                            ActivityLog: true,
                            Batch_Batch_makerIdToUser: true,
                            Batch_Batch_checkerIdToUser: true
                        }
                    }
                },
                orderBy: {
                    ActivityLog: {
                        _count: 'desc'
                    }
                },
                take: 10
            });
            // Format user data
            const userData = users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.Role.name,
                totalActivities: user._count.ActivityLog,
                batchesCreated: user._count.Batch_Batch_makerIdToUser,
                batchesReviewed: user._count.Batch_Batch_checkerIdToUser,
            }));
            res.status(200).json({ users: userData });
        }
        catch (error) {
            console.error('Error fetching user activity:', error);
            res.status(500).json({ message: 'Failed to fetch user activity data' });
        }
    }
    /**
    * Get quality metrics
    */
    async getQualityMetrics(req, res) {
        try {
            // Get all approved batches with their parameter values
            const batches = await prisma.batch.findMany({
                where: {
                    status: 'APPROVED',
                    parameterValues: {
                        some: {} // Ensure there are some parameter values
                    }
                },
                include: {
                    Product: {
                        select: {
                            name: true
                        }
                    },
                    parameterValues: {
                        include: {
                            parameter: {
                                include: {
                                    category: true
                                }
                            },
                            unit: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 50 // Get recent 50 batches for metrics
            });
            // Define the parameters we want to track
            const MOISTURE_PARAM_NAME = "Moisture";
            const ASH_PARAM_NAME = "Total Ash";
            const WATER_ACTIVITY_PARAM_NAME = "Water Activity";
            // Group by product and calculate averages
            const productMetrics = {};
            batches.forEach(batch => {
                const { Product, parameterValues } = batch;
                const productName = Product.name;
                if (!productMetrics[productName]) {
                    productMetrics[productName] = {
                        productName,
                        totalBatches: 0,
                        avgMoisture: 0,
                        avgWaterActivity: 0,
                        avgTotalAsh: 0,
                        moistureCount: 0,
                        waterActivityCount: 0,
                        ashCount: 0
                    };
                }
                // Increment batch count
                productMetrics[productName].totalBatches++;
                // Process parameter values
                parameterValues.forEach(pv => {
                    const paramName = pv.parameter.name;
                    const value = parseFloat(pv.value);
                    if (!isNaN(value)) {
                        if (paramName.toLowerCase().includes(MOISTURE_PARAM_NAME.toLowerCase())) {
                            productMetrics[productName].avgMoisture += value;
                            productMetrics[productName].moistureCount++;
                        }
                        else if (paramName.toLowerCase().includes(ASH_PARAM_NAME.toLowerCase())) {
                            productMetrics[productName].avgTotalAsh += value;
                            productMetrics[productName].ashCount++;
                        }
                        else if (paramName.toLowerCase().includes(WATER_ACTIVITY_PARAM_NAME.toLowerCase())) {
                            productMetrics[productName].avgWaterActivity += value;
                            productMetrics[productName].waterActivityCount++;
                        }
                    }
                });
            });
            // Calculate averages
            Object.keys(productMetrics).forEach(product => {
                const metric = productMetrics[product];
                if (metric.moistureCount > 0) {
                    metric.avgMoisture = +(metric.avgMoisture / metric.moistureCount).toFixed(2);
                }
                if (metric.waterActivityCount > 0) {
                    metric.avgWaterActivity = +(metric.avgWaterActivity / metric.waterActivityCount).toFixed(4);
                }
                if (metric.ashCount > 0) {
                    metric.avgTotalAsh = +(metric.avgTotalAsh / metric.ashCount).toFixed(2);
                }
            });
            // Convert to array and clean up internal counting fields
            const metrics = Object.values(productMetrics).map(m => ({
                productName: m.productName,
                totalBatches: m.totalBatches,
                avgMoisture: m.avgMoisture,
                avgWaterActivity: m.avgWaterActivity,
                avgTotalAsh: m.avgTotalAsh
            }));
            res.status(200).json({ qualityMetrics: metrics });
        }
        catch (error) {
            console.error('Error fetching quality metrics:', error);
            res.status(500).json({ message: 'Failed to fetch quality metrics' });
        }
    }
    /**
     * Get monthly batch summary
     */
    async getMonthlyBatchSummary(req, res) {
        try {
            // Get parameters
            const { month, year } = req.query;
            let targetMonth;
            // If month and year are provided, use them
            if (month && year) {
                targetMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
            }
            else {
                // Default to current month
                targetMonth = new Date();
                targetMonth.setDate(1);
            }
            // Calculate start and end of month
            const startDate = (0, date_fns_1.startOfMonth)(targetMonth);
            const endDate = (0, date_fns_1.endOfMonth)(targetMonth);
            // Get batches for the month
            const batches = await prisma.batch.findMany({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                include: {
                    Product: true,
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
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            // Calculate summary statistics
            const summary = {
                month: (0, date_fns_1.format)(targetMonth, 'MMMM yyyy'),
                totalBatches: batches.length,
                approved: batches.filter(b => b.status === 'APPROVED').length,
                rejected: batches.filter(b => b.status === 'REJECTED').length,
                pending: batches.filter(b => b.status === 'SUBMITTED').length,
                draft: batches.filter(b => b.status === 'DRAFT').length,
                productDistribution: {},
                timeToApproval: 0,
                batches: batches.map(batch => ({
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    productName: batch.Product.name,
                    status: batch.status,
                    createdAt: batch.createdAt,
                    createdBy: batch.User_Batch_makerIdToUser.name,
                    reviewedBy: batch.User_Batch_checkerIdToUser?.name || null
                }))
            };
            // Calculate product distribution
            batches.forEach(batch => {
                const productName = batch.Product.name;
                if (!summary.productDistribution[productName]) {
                    summary.productDistribution[productName] = 0;
                }
                summary.productDistribution[productName]++;
            });
            // Calculate average time to approval (for approved batches)
            const approvedBatches = batches.filter(b => b.status === 'APPROVED' && b.sampleAnalysisStarted && b.sampleAnalysisCompleted);
            if (approvedBatches.length > 0) {
                const totalTime = approvedBatches.reduce((sum, batch) => {
                    // Calculate difference in hours between analysis start and completion
                    if (batch.sampleAnalysisStarted && batch.sampleAnalysisCompleted) {
                        const diffHours = (batch.sampleAnalysisCompleted.getTime() -
                            batch.sampleAnalysisStarted.getTime()) / (1000 * 60 * 60);
                        return sum + diffHours;
                    }
                    return sum;
                }, 0);
                summary.timeToApproval = +(totalTime / approvedBatches.length).toFixed(1); // Average in hours
            }
            res.status(200).json({ summary });
        }
        catch (error) {
            console.error('Error fetching monthly summary:', error);
            res.status(500).json({ message: 'Failed to fetch monthly batch summary' });
        }
    }
    /**
     * Get standard usage metrics
     */
    async getStandardUsageMetrics(req, res) {
        try {
            // Get standards with their usage in batches
            const standards = await prisma.standard.findMany({
                select: {
                    id: true,
                    name: true,
                    code: true,
                    status: true,
                    Category: {
                        select: {
                            name: true
                        }
                    },
                    _count: {
                        select: {
                            batches: true // Count how many batches use this standard
                        }
                    }
                },
                orderBy: {
                    batches: {
                        _count: 'desc' // Order by most used
                    }
                },
                take: 10 // Top 10 most used
            });
            // Format standards data
            const standardsData = standards.map(std => ({
                id: std.id,
                name: std.name,
                code: std.code,
                category: std.Category.name,
                status: std.status,
                usageCount: std._count.batches
            }));
            res.status(200).json({ standards: standardsData });
        }
        catch (error) {
            console.error('Error fetching standard usage metrics:', error);
            res.status(500).json({ message: 'Failed to fetch standard usage data' });
        }
    }
}
exports.DashboardController = DashboardController;
exports.default = new DashboardController();
