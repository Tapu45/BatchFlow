"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RMQualityMailController = void 0;
const prisma_1 = require("../../generated/prisma");
const exceljs_1 = __importDefault(require("exceljs"));
const brevomail_1 = require("../../service/brevomail");
const prisma = new prisma_1.PrismaClient();
class RMQualityMailController {
    // Mail all RM Quality Reports with Excel attachment
    static async mailAllQualityReports(req, res) {
        try {
            const { email } = req.query;
            const recipientEmail = email || process.env.CLIENT_EMAIL;
            if (!recipientEmail) {
                res.status(400).json({
                    success: false,
                    error: 'No recipient email provided and CLIENT_EMAIL not configured',
                });
                return;
            }
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
                    error: 'No quality reports found to mail',
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
                fgColor: { argb: '2C3E50' }
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
            // Generate Excel file buffer for email attachment
            const excelBuffer = await workbook.xlsx.writeBuffer();
            const base64Excel = Buffer.from(excelBuffer).toString('base64');
            // Generate HTML table for email
            const parameterHeaders = parametersList.map(param => `<th style="padding: 10px; border: 1px solid #ddd; background-color: #2C3E50; color: white;">${param} - Std</th>
                <th style="padding: 10px; border: 1px solid #ddd; background-color: #2C3E50; color: white;">${param} - Res</th>`).join('');
            const tableRows = reports.map((report, index) => {
                const bgColor = index % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
                const paramCells = parametersList.map(param => {
                    const paramData = report.parameters.find(p => p.parameter === param);
                    return `
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor}; color: #16A085; text-align: center;">${paramData?.standard || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor}; color: #C0392B; text-align: center;">${paramData?.result || '-'}</td>
                    `;
                }).join('');
                return `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor}; font-weight: bold;">${report.grn}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${report.rawMaterialName}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${report.variety}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${report.supplier}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${new Date(report.dateOfReport).toLocaleDateString('en-IN')}</td>
                        ${paramCells}
                    </tr>
                `;
            }).join('');
            const htmlTable = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #2C3E50;">RM Quality Reports Export</h2>
                    <p>The RM Quality Reports have been exported successfully.</p>
                    <p><strong>Export Details:</strong></p>
                    <ul>
                        <li>Total Reports: ${reports.length}</li>
                        <li>Export Date: ${new Date().toLocaleDateString('en-IN')}</li>
                    </ul>
                    <div style="overflow-x: auto; margin-top: 20px;">
                        <table style="border-collapse: collapse; width: 100%; max-width: 100%;">
                            <thead>
                                <tr>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #2C3E50; color: white;">GRN</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #2C3E50; color: white;">Raw Material</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #2C3E50; color: white;">Variety</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #2C3E50; color: white;">Supplier</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #2C3E50; color: white;">Date</th>
                                    ${parameterHeaders}
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                    <p style="margin-top: 20px; color: #666;"><em>Note: The complete Excel file is attached to this email.</em></p>
                </div>
            `;
            // Send email with attachment
            await (0, brevomail_1.sendTransactionalEmail)({
                to: [{ email: recipientEmail }],
                subject: 'RM Quality Reports Export',
                htmlContent: htmlTable,
                attachment: [
                    {
                        content: base64Excel,
                        name: `RM_Quality_Reports_${new Date().toISOString().split('T')[0]}.xlsx`
                    }
                ]
            });
            res.json({
                success: true,
                message: `RM Quality Reports mailed successfully to ${recipientEmail}`,
                data: {
                    totalReports: reports.length,
                    recipientEmail,
                    sentAt: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('Error mailing RM Quality Reports:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to mail RM Quality Reports',
            });
        }
    }
}
exports.RMQualityMailController = RMQualityMailController;
