import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { sendTransactionalEmail } from '../../service/brevomail';

const prisma = new PrismaClient();

export async function sendPurchaseOrderMail(req: Request, res: Response): Promise<void> {
    try {
        console.log('=== sendPurchaseOrderMail called ===');

        const clientEmail = process.env.CLIENT_EMAIL;
        console.log('CLIENT_EMAIL:', clientEmail);

        if (!clientEmail) {
            console.log('ERROR: CLIENT_EMAIL not configured');
            res.status(500).json({ error: 'CLIENT_EMAIL not configured in environment' });
            return;
        }

        // Get all purchase order items with purchase order and vendor details
        console.log('Fetching purchase order items...');
        const poItems = await prisma.purchaseOrderItem.findMany({
            include: {
                purchaseOrder: {
                    include: { vendor: true }
                },
                rawMaterial: true
            },
            orderBy: { purchaseOrder: { orderDate: 'desc' } }
        });

        console.log('Found purchase order items:', poItems.length);

        if (poItems.length === 0) {
            console.log('ERROR: No purchase orders found');
            res.status(404).json({ error: 'No purchase orders found' });
            return;
        }

        // Build table rows
        const tableRows = poItems.map((item, index) => {
            const bgColor = index % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
            return `
                <tr>
                    <td style="padding: 12px; border: 1px solid #ddd; background-color: ${bgColor}; font-weight: bold;">${item.purchaseOrder.poNumber}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; background-color: ${bgColor};">${item.purchaseOrder.vendor.name}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; background-color: ${bgColor};">${item.rawMaterial.name}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; background-color: ${bgColor}; text-align: center;">${new Date(item.purchaseOrder.orderDate).toLocaleDateString('en-IN')}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; background-color: ${bgColor}; text-align: center;">${item.quantityOrdered}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; background-color: ${bgColor}; text-align: center;">${item.quantityReceived}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; background-color: ${bgColor}; text-align: center;">₦${item.rate}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; background-color: ${bgColor}; text-align: center;">
                        <span style="background-color: ${item.status === 'Received' ? '#27ae60' : '#f39c12'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                            ${item.status}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h1 style="color: #2C3E50; border-bottom: 3px solid #3498db; padding-bottom: 15px; margin-bottom: 25px;">
                        Purchase Order Report
                    </h1>
                    
                    <p style="color: #666; margin-bottom: 20px;">Total Items: <strong>${poItems.length}</strong> | Generated: <strong>${new Date().toLocaleDateString('en-IN')}</strong></p>

                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                            <thead>
                                <tr>
                                    <th style="padding: 12px; border: 1px solid #ddd; background-color: #2C3E50; color: white; text-align: left;">PO Number</th>
                                    <th style="padding: 12px; border: 1px solid #ddd; background-color: #2C3E50; color: white; text-align: left;">Vendor</th>
                                    <th style="padding: 12px; border: 1px solid #ddd; background-color: #2C3E50; color: white; text-align: left;">Material</th>
                                    <th style="padding: 12px; border: 1px solid #ddd; background-color: #2C3E50; color: white; text-align: center;">Order Date</th>
                                    <th style="padding: 12px; border: 1px solid #ddd; background-color: #2C3E50; color: white; text-align: center;">Ordered</th>
                                    <th style="padding: 12px; border: 1px solid #ddd; background-color: #2C3E50; color: white; text-align: center;">Received</th>
                                    <th style="padding: 12px; border: 1px solid #ddd; background-color: #2C3E50; color: white; text-align: center;">Rate</th>
                                    <th style="padding: 12px; border: 1px solid #ddd; background-color: #2C3E50; color: white; text-align: center;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 13px; text-align: center;">
                        <p>This is an automated email from NexInventory System</p>
                    </div>
                </div>
            </div>
        `;

        // Send email
        console.log('Sending email to:', clientEmail);
        console.log('Email subject:', `Purchase Order Report - ${poItems.length} Items`);

        await sendTransactionalEmail({
            to: [{ email: clientEmail }],
            subject: `Purchase Order Report - ${poItems.length} Items`,
            htmlContent
        });

        console.log('Email sent successfully!');

        res.json({
            success: true,
            message: 'Purchase order report sent successfully',
            totalItems: poItems.length
        });
    } catch (err: any) {
        console.error('=== ERROR in sendPurchaseOrderMail ===');
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        console.error('Full error:', err);
        res.status(500).json({ error: 'Failed to send purchase order mail', details: err.message });
    }
}
