"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchMailController = void 0;
const prisma_1 = require("../../generated/prisma");
const exceljs_1 = __importDefault(require("exceljs"));
const brevomail_1 = require("../../service/brevomail");
const prisma = new prisma_1.PrismaClient();
class BatchMailController {
    // Mail all batches with Excel attachment
    static async mailAllBatches(req, res) {
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
            const batches = await prisma.batch.findMany({
                include: {
                    Product: true,
                    User_Batch_makerIdToUser: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                    User_Batch_checkerIdToUser: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                    parameterValues: {
                        include: {
                            parameter: true,
                            unit: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            if (batches.length === 0) {
                res.status(404).json({
                    success: false,
                    error: 'No batches found to mail',
                });
                return;
            }
            // Create Excel workbook and worksheet
            const workbook = new exceljs_1.default.Workbook();
            const worksheet = workbook.addWorksheet('Batches Report');
            // Set column widths
            worksheet.columns = [
                { header: 'Batch Number', key: 'batchNumber', width: 18 },
                { header: 'Product', key: 'product', width: 20 },
                { header: 'Production Date', key: 'productionDate', width: 15 },
                { header: 'Best Before', key: 'bestBefore', width: 15 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Created By', key: 'createdBy', width: 18 },
                { header: 'Approved By', key: 'approvedBy', width: 18 },
                { header: 'Created At', key: 'createdAt', width: 18 },
            ];
            // Style for title
            const titleRow = worksheet.addRow({});
            titleRow.height = 30;
            worksheet.mergeCells('A1:H1');
            const titleCell = titleRow.getCell(1);
            titleCell.value = 'Batches Report';
            titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '7C3AED' }
            };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            // Add date row
            const dateRow = worksheet.addRow({});
            worksheet.mergeCells('A2:H2');
            const dateCell = dateRow.getCell(1);
            dateCell.value = `Generated on ${new Date().toLocaleDateString('en-IN')}`;
            dateCell.font = { italic: true, size: 11, color: { argb: '666666' } };
            dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
            // Add empty row
            worksheet.addRow({});
            // Add header row (Row 4)
            const headerRow = worksheet.addRow([
                'Batch Number',
                'Product',
                'Production Date',
                'Best Before',
                'Status',
                'Created By',
                'Approved By',
                'Created At',
            ]);
            headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '7C3AED' }
            };
            // Add border and center alignment to headers
            headerRow.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: '5B21B6' } },
                    left: { style: 'thin', color: { argb: '5B21B6' } },
                    bottom: { style: 'thin', color: { argb: '5B21B6' } },
                    right: { style: 'thin', color: { argb: '5B21B6' } }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            });
            // Add data rows
            batches.forEach((batch, index) => {
                const rowData = [
                    batch.batchNumber,
                    batch.Product?.name || '-',
                    batch.dateOfProduction ? new Date(batch.dateOfProduction).toLocaleDateString('en-IN') : '-',
                    batch.bestBeforeDate ? new Date(batch.bestBeforeDate).toLocaleDateString('en-IN') : '-',
                    batch.status,
                    batch.User_Batch_makerIdToUser?.name || '-',
                    batch.User_Batch_checkerIdToUser?.name || '-',
                    batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('en-IN') : '-',
                ];
                const row = worksheet.addRow(rowData);
                row.height = 18;
                // Alternate row colors
                const bgColor = index % 2 === 0 ? 'F5F3FF' : 'FFFFFF';
                const borderColor = '5B21B6';
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
                        cell.font = { bold: true, color: { argb: '5B21B6' } };
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                    else if (colNumber === 5) {
                        // Status column coloring
                        const status = batch.status;
                        if (status === 'APPROVED') {
                            cell.font = { color: { argb: '16A085' }, bold: true };
                        }
                        else if (status === 'REJECTED') {
                            cell.font = { color: { argb: 'C0392B' }, bold: true };
                        }
                        else if (status === 'SUBMITTED') {
                            cell.font = { color: { argb: 'F39C12' }, bold: true };
                        }
                        else {
                            cell.font = { color: { argb: '7F8C8D' } };
                        }
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                    else {
                        cell.font = { color: { argb: '2C3E50' } };
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                });
            });
            // Generate Excel file buffer for email attachment
            const excelBuffer = await workbook.xlsx.writeBuffer();
            const base64Excel = Buffer.from(excelBuffer).toString('base64');
            // Generate HTML table for email
            const tableRows = batches.map((batch, index) => {
                const bgColor = index % 2 === 0 ? '#F5F3FF' : '#FFFFFF';
                let statusColor = '#7F8C8D';
                if (batch.status === 'APPROVED')
                    statusColor = '#16A085';
                else if (batch.status === 'REJECTED')
                    statusColor = '#C0392B';
                else if (batch.status === 'SUBMITTED')
                    statusColor = '#F39C12';
                return `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor}; font-weight: bold; color: #5B21B6;">${batch.batchNumber}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${batch.Product?.name || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${batch.dateOfProduction ? new Date(batch.dateOfProduction).toLocaleDateString('en-IN') : '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${batch.bestBeforeDate ? new Date(batch.bestBeforeDate).toLocaleDateString('en-IN') : '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor}; color: ${statusColor}; font-weight: bold; text-align: center;">${batch.status}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${batch.User_Batch_makerIdToUser?.name || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${batch.User_Batch_checkerIdToUser?.name || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                    </tr>
                `;
            }).join('');
            const htmlTable = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #7C3AED;">Batches Report Export</h2>
                    <p>The Batches Report has been exported successfully.</p>
                    <p><strong>Export Details:</strong></p>
                    <ul>
                        <li>Total Batches: ${batches.length}</li>
                        <li>Export Date: ${new Date().toLocaleDateString('en-IN')}</li>
                    </ul>
                    <div style="overflow-x: auto; margin-top: 20px;">
                        <table style="border-collapse: collapse; width: 100%; max-width: 100%;">
                            <thead>
                                <tr>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #7C3AED; color: white;">Batch Number</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #7C3AED; color: white;">Product</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #7C3AED; color: white;">Production Date</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #7C3AED; color: white;">Best Before</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #7C3AED; color: white;">Status</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #7C3AED; color: white;">Created By</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #7C3AED; color: white;">Approved By</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #7C3AED; color: white;">Created At</th>
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
                subject: 'Batches Report Export',
                htmlContent: htmlTable,
                attachment: [
                    {
                        content: base64Excel,
                        name: `Batches_Report_${new Date().toISOString().split('T')[0]}.xlsx`
                    }
                ]
            });
            res.json({
                success: true,
                message: `Batches Report mailed successfully to ${recipientEmail}`,
                data: {
                    totalBatches: batches.length,
                    recipientEmail,
                    sentAt: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('Error mailing Batches Report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to mail Batches Report',
            });
        }
    }
}
exports.BatchMailController = BatchMailController;
