"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RMQualityExportFilteredController = void 0;
const prisma_1 = require("../../generated/prisma");
const exceljs_1 = __importDefault(require("exceljs"));
const prisma = new prisma_1.PrismaClient();
class RMQualityExportFilteredController {
    // Export filtered RM Quality Reports as Excel
    static async exportFilteredQualityReports(req, res) {
        try {
            const { supplier, grn, fromDate, toDate } = req.body;
            // Build filter object
            const where = {};
            if (supplier)
                where.supplier = supplier;
            if (grn)
                where.grn = { contains: grn, mode: 'insensitive' };
            if (fromDate || toDate) {
                where.dateOfReport = {};
                if (fromDate)
                    where.dateOfReport.gte = new Date(fromDate);
                if (toDate)
                    where.dateOfReport.lte = new Date(toDate);
            }
            const reports = await prisma.rMQualityReport.findMany({
                where,
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
                    error: 'No quality reports found to export for the given filters',
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
            const worksheet = workbook.addWorksheet('Filtered RM Quality Reports');
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
            titleCell.value = 'Filtered RM Quality Reports';
            titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2C3E50' }
            };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            // Add date row
            const dateRow = worksheet.addRow({});
            worksheet.mergeCells(`A2:${String.fromCharCode(64 + 5 + parametersList.length * 2)}2`);
            const dateCell = dateRow.getCell(1);
            dateCell.value = `Generated on ${new Date().toLocaleDateString('en-IN')}`;
            dateCell.font = { italic: true, size: 11, color: { argb: '666666' } };
            dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
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
                fgColor: { argb: '2C3E50' }
            };
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
                    if (colNumber === 1) {
                        cell.font = { bold: true, color: { argb: '2C3E50' } };
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                    else if (colNumber <= 5) {
                        cell.font = { color: { argb: '2C3E50' } };
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                    else if ((colNumber - 5) % 2 === 1) {
                        cell.font = { color: { argb: '16A085' } };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                    else {
                        cell.font = { color: { argb: 'C0392B' } };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            });
            // Generate Excel file buffer
            const excelBuffer = await workbook.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Filtered_RM_Quality_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
            res.end(Buffer.from(excelBuffer));
        }
        catch (error) {
            console.error('Error exporting filtered RM Quality Reports:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to export filtered RM Quality Reports',
            });
        }
    }
}
exports.RMQualityExportFilteredController = RMQualityExportFilteredController;
