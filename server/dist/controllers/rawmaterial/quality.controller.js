"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RMQualityController = void 0;
const prisma_1 = require("../../generated/prisma");
const exceljs_1 = __importDefault(require("exceljs"));
const prisma = new prisma_1.PrismaClient();
class RMQualityController {
    // Create RM Quality Report
    static async createQualityReport(req, res) {
        try {
            const { rawMaterialName, variety, supplier, grn, parameters } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            const qualityReport = await prisma.rMQualityReport.create({
                data: {
                    rawMaterialName,
                    variety,
                    supplier,
                    grn,
                    createdById: userId,
                    parameters: {
                        create: parameters.map((param) => ({
                            parameter: param.parameter,
                            standard: param.standard,
                            result: param.result,
                        })),
                    },
                },
                include: {
                    parameters: true,
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            res.status(201).json({
                success: true,
                data: qualityReport,
                message: 'RM Quality Report created successfully',
            });
        }
        catch (error) {
            console.error('Error creating RM Quality Report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create RM Quality Report',
            });
        }
    }
    // Get all RM Quality Reports
    static async getQualityReports(req, res) {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const where = search
                ? {
                    OR: [
                        { rawMaterialName: { contains: search, mode: prisma_1.Prisma.QueryMode.insensitive } },
                        { variety: { contains: search, mode: prisma_1.Prisma.QueryMode.insensitive } },
                        { supplier: { contains: search, mode: prisma_1.Prisma.QueryMode.insensitive } },
                        { grn: { contains: search, mode: prisma_1.Prisma.QueryMode.insensitive } },
                    ],
                }
                : {};
            const [reports, total] = await Promise.all([
                prisma.rMQualityReport.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    include: {
                        parameters: true,
                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.rMQualityReport.count({ where }),
            ]);
            res.json({
                success: true,
                data: reports,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            });
        }
        catch (error) {
            console.error('Error fetching RM Quality Reports:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch RM Quality Reports',
            });
        }
    }
    // Get single RM Quality Report
    static async getQualityReportById(req, res) {
        try {
            const { id } = req.params;
            const report = await prisma.rMQualityReport.findUnique({
                where: { id },
                include: {
                    parameters: true,
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            if (!report) {
                res.status(404).json({
                    success: false,
                    error: 'RM Quality Report not found',
                });
                return;
            }
            res.json({
                success: true,
                data: report,
            });
        }
        catch (error) {
            console.error('Error fetching RM Quality Report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch RM Quality Report',
            });
        }
    }
    // Update RM Quality Report
    static async updateQualityReport(req, res) {
        try {
            const { id } = req.params;
            const { rawMaterialName, variety, supplier, grn, parameters } = req.body;
            // First, delete existing parameters
            await prisma.rMQualityParameter.deleteMany({
                where: { reportId: id },
            });
            // Update report and create new parameters
            const updatedReport = await prisma.rMQualityReport.update({
                where: { id },
                data: {
                    rawMaterialName,
                    variety,
                    supplier,
                    grn,
                    parameters: {
                        create: parameters.map((param) => ({
                            parameter: param.parameter,
                            standard: param.standard,
                            result: param.result,
                        })),
                    },
                },
                include: {
                    parameters: true,
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            res.json({
                success: true,
                data: updatedReport,
                message: 'RM Quality Report updated successfully',
            });
        }
        catch (error) {
            console.error('Error updating RM Quality Report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update RM Quality Report',
            });
        }
    }
    // Delete RM Quality Report
    static async deleteQualityReport(req, res) {
        try {
            const { id } = req.params;
            await prisma.rMQualityReport.delete({
                where: { id },
            });
            res.json({
                success: true,
                message: 'RM Quality Report deleted successfully',
            });
        }
        catch (error) {
            console.error('Error deleting RM Quality Report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete RM Quality Report',
            });
        }
    }
    // Export RM Quality Report as excel
    static async exportQualityReport(req, res) {
        try {
            const { id } = req.params;
            const report = await prisma.rMQualityReport.findUnique({
                where: { id },
                include: {
                    parameters: true,
                    createdBy: {
                        select: {
                            name: true,
                        },
                    },
                },
            });
            if (!report) {
                res.status(404).json({
                    success: false,
                    error: 'RM Quality Report not found',
                });
                return;
            }
            // Format based on requested export type
            const exportType = req.query.format || 'excel';
            if (exportType === 'excel') {
                // Create Excel workbook and worksheet
                const workbook = new exceljs_1.default.Workbook();
                const worksheet = workbook.addWorksheet('RM Quality Report');
                // Set column widths
                worksheet.columns = [
                    { header: '', key: 'attribute', width: 20 },
                    { header: '', key: 'value', width: 30 }
                ];
                // Style for headers
                const headerStyle = {
                    font: { bold: true, size: 14, color: { argb: '4472C4' } },
                    fill: {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'EBF1DE' } // Light yellow like the image
                    }
                };
                // Add title
                const titleRow = worksheet.addRow(['RM Quality Report', '']);
                titleRow.font = { bold: true, size: 16 };
                titleRow.getCell(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'EBF1DE' } // Light yellow background
                };
                worksheet.mergeCells('A1:B1');
                titleRow.height = 30;
                titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
                // Add empty row
                worksheet.addRow([]);
                // Add basic information
                worksheet.addRow(['Raw Material', report.rawMaterialName]).font = { bold: true };
                worksheet.addRow(['Variety', report.variety]);
                worksheet.addRow(['Supplier', report.supplier]);
                worksheet.addRow(['GRN', report.grn]);
                worksheet.addRow(['Date of Receipt', new Date(report.dateOfReport).toLocaleDateString()]);
                worksheet.addRow(['Created By', report.createdBy?.name || '']);
                // Add empty row
                worksheet.addRow([]);
                // Add Certificate of Analysis header
                const certHeader = worksheet.addRow(['Certificate of Analysis', '']);
                certHeader.font = { bold: true, size: 14 };
                certHeader.getCell(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'EBF1DE' } // Light yellow
                };
                worksheet.mergeCells(`A${certHeader.number}:B${certHeader.number}`);
                // Add parameters table header
                const paramsHeaderRow = worksheet.addRow(['Parameter', 'Standard', 'Result']);
                paramsHeaderRow.font = { bold: true };
                worksheet.getColumn(3).width = 25; // Set width for Result column
                // Add border to parameter headers
                ['A', 'B', 'C'].forEach(col => {
                    worksheet.getCell(`${col}${paramsHeaderRow.number}`).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    worksheet.getCell(`${col}${paramsHeaderRow.number}`).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'EBF1DE' }
                    };
                });
                // Add parameters
                report.parameters.forEach(param => {
                    const paramRow = worksheet.addRow([param.parameter, param.standard, param.result]);
                    // Add borders to cells
                    ['A', 'B', 'C'].forEach(col => {
                        worksheet.getCell(`${col}${paramRow.number}`).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });
                // Set content type and attachment header
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=RM_Quality_Report_${report.id}.xlsx`);
                // Write to response stream
                await workbook.xlsx.write(res);
                res.end();
            }
            else {
                // Default: Return data for frontend PDF generation
                res.json({
                    success: true,
                    data: report,
                    message: 'Report data ready for export',
                });
            }
        }
        catch (error) {
            console.error('Error exporting RM Quality Report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export RM Quality Report',
            });
        }
    }
    // Export all RM Quality Reports as single Excel file
    static async exportAllQualityReports(req, res) {
        try {
            const reports = await prisma.rMQualityReport.findMany({
                include: {
                    parameters: true,
                    createdBy: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            if (reports.length === 0) {
                res.status(404).json({
                    success: false,
                    error: 'No quality reports found to export',
                });
                return;
            }
            // Get all unique parameters for table columns
            const allParameters = new Set();
            reports.forEach(report => {
                report.parameters.forEach(param => {
                    allParameters.add(param.parameter);
                });
            });
            const parametersList = Array.from(allParameters);
            // Create Excel workbook and worksheet
            const workbook = new exceljs_1.default.Workbook();
            const worksheet = workbook.addWorksheet('RM Quality Reports');
            // Set column widths
            worksheet.columns = [
                { header: 'GRN', key: 'grn', width: 15 },
                { header: 'Raw Material', key: 'rawMaterial', width: 18 },
                { header: 'Variety', key: 'variety', width: 15 },
                { header: 'Supplier', key: 'supplier', width: 18 },
                { header: 'Date', key: 'date', width: 15 },
                ...parametersList.flatMap(param => [
                    { header: `${param} - Std`, key: `${param}-std`, width: 14 },
                    { header: `${param} - Res`, key: `${param}-res`, width: 14 }
                ])
            ];
            // Style for title
            const titleRow = worksheet.addRow({});
            titleRow.height = 30;
            worksheet.mergeCells(`A1:${String.fromCharCode(64 + 5 + parametersList.length * 2)}1`);
            const titleCell = titleRow.getCell(1);
            titleCell.value = 'RM Quality Reports';
            titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2C3E50' } // Dark blue-gray
            };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            // Add date row
            const dateRow = worksheet.addRow({});
            worksheet.mergeCells(`A2:${String.fromCharCode(64 + 5 + parametersList.length * 2)}2`);
            const dateCell = dateRow.getCell(1);
            dateCell.value = `Generated on ${new Date().toLocaleDateString('en-IN')}`;
            dateCell.font = { italic: true, size: 11, color: { argb: '666666' } };
            dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
            // Add empty row
            worksheet.addRow({});
            // Add header row (Row 4)
            const headerRow = worksheet.addRow([
                'GRN',
                'Raw Material',
                'Variety',
                'Supplier',
                'Date',
                ...parametersList.flatMap(param => [`${param} - Standard`, `${param} - Result`])
            ]);
            headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2C3E50' } // Dark blue-gray header
            };
            // Add border and center alignment to headers
            headerRow.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: '34495E' } },
                    left: { style: 'thin', color: { argb: '34495E' } },
                    bottom: { style: 'thin', color: { argb: '34495E' } },
                    right: { style: 'thin', color: { argb: '34495E' } }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            });
            // Add data rows
            reports.forEach((report, index) => {
                const rowData = [
                    report.grn,
                    report.rawMaterialName,
                    report.variety,
                    report.supplier,
                    new Date(report.dateOfReport).toLocaleDateString('en-IN'),
                    ...parametersList.flatMap(param => {
                        const paramData = report.parameters.find(p => p.parameter === param);
                        return [
                            paramData?.standard || '-',
                            paramData?.result || '-'
                        ];
                    })
                ];
                const row = worksheet.addRow(rowData);
                row.height = 18;
                // Alternate row colors
                const bgColor = index % 2 === 0 ? 'F5F5F5' : 'FFFFFF';
                const borderColor = '34495E';
                row.eachCell((cell, colNumber) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: bgColor }
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: borderColor } },
                        left: { style: 'thin', color: { argb: borderColor } },
                        bottom: { style: 'thin', color: { argb: borderColor } },
                        right: { style: 'thin', color: { argb: borderColor } }
                    };
                    // Color coding for columns
                    if (colNumber === 1) {
                        // GRN column
                        cell.font = { bold: true, color: { argb: '2C3E50' } };
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                    else if (colNumber <= 5) {
                        // Info columns
                        cell.font = { color: { argb: '2C3E50' } };
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                    else if ((colNumber - 5) % 2 === 1) {
                        // Standard columns
                        cell.font = { color: { argb: '16A085' } }; // Green
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                    else {
                        // Result columns
                        cell.font = { color: { argb: 'C0392B' } }; // Red
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            });
            // Generate Excel file buffer
            const excelBuffer = await workbook.xlsx.writeBuffer();
            // Set content type and attachment header
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=RM_Quality_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
            // Write to response stream
            res.write(excelBuffer);
            res.end();
        }
        catch (error) {
            console.error('Error exporting all RM Quality Reports:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export RM Quality Reports',
            });
        }
    }
}
exports.RMQualityController = RMQualityController;
