import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
const prisma = new PrismaClient();

// 1. Get Purchase Orders for a Product
export const getPurchaseOrdersByProduct = async (req: Request, res: Response): Promise<void> => {
  const { rawMaterialId } = req.query;
  if (!rawMaterialId || typeof rawMaterialId !== 'string') {
    res.status(400).json({ error: 'rawMaterialId is required' });
    return;
  }

  try {
    // Find all PO items for this raw material, include their POs
    const poItems = await prisma.purchaseOrderItem.findMany({
      where: { rawMaterialId },
      include: {
        purchaseOrder: {
          include: { vendor: true }
        }
      }
    });

    // Group by PO
    const poMap: Record<string, any> = {};
    poItems.forEach((item: { purchaseOrder: any; quantityOrdered: any; quantityReceived: any; }) => {
      const po = item.purchaseOrder;
      if (!poMap[po.id]) {
        poMap[po.id] = {
          id: po.id,
          orderNumber: po.poNumber,
          orderDate: po.orderDate,
          vendor: { id: po.vendor.id, name: po.vendor.name },
          totalQuantity: 0,
          receivedQuantity: 0,
          status: po.status
        };
      }
      poMap[po.id].totalQuantity += item.quantityOrdered;
      poMap[po.id].receivedQuantity += item.quantityReceived;
    });
    
    res.json(Object.values(poMap));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

// 2. Get Timeline Details for a Purchase Order
export const getPurchaseOrderTimeline = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Purchase order id required' });
    return;
  }

  try {
    // Get PO, items, vendor
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          include: { rawMaterial: true }
        }
      }
    });
    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    // Build events for each item (assuming one raw material per PO for simplicity)
    const events: any[] = [];
    for (const item of po.items) {
      // Order placed
      events.push({
        type: 'ORDER_PLACED',
        date: po.orderDate,
        details: `Order placed for ${item.quantityOrdered} ${item.rawMaterial.unitOfMeasurement} ${item.rawMaterial.name}`
      });

      // Received (StockEntry IN)
      const stockIns = await prisma.stockEntry.findMany({
        where: {
          rawMaterialId: item.rawMaterialId,
          referenceId: item.id,
          entryType: 'IN'
        },
        include: { warehouse: true }
      });
      stockIns.forEach((se: { createdAt: any; quantity: any; warehouse: { name: any; }; }) => {
        events.push({
          type: 'RECEIVED',
          date: se.createdAt,
          details: `Received ${se.quantity} ${item.rawMaterial.unitOfMeasurement} at ${se.warehouse.name}`
        });
      });

      // Cleaning jobs
      const cleaningJobs = await prisma.cleaningJob.findMany({
        where: { rawMaterialId: item.rawMaterialId },
        include: {
          fromWarehouse: true,
          toWarehouse: true
        }
      });
      for (const job of cleaningJobs) {
        // Cleaning started
        events.push({
          type: 'CLEANING_STARTED',
          date: job.startedAt,
          details: `Cleaning started for ${job.quantity} ${item.rawMaterial.unitOfMeasurement} from ${job.fromWarehouse.name} to ${job.toWarehouse.name}`
        });
        // Cleaning finished
        if (job.finishedAt) {
          // Calculate wastage if you have it (e.g., from UnfinishedStock or CleaningLog)
          const wastageSum = await prisma.unfinishedStock.aggregate({
            where: { cleaningJobId: job.id },
            _sum: { quantity: true }
          });
          const wastage = wastageSum._sum.quantity ?? 0;

          events.push({
            type: 'CLEANED',
            date: job.finishedAt,
            details: `${job.quantity} ${item.rawMaterial.unitOfMeasurement} cleaned and found ${wastage} ${item.rawMaterial.unitOfMeasurement} wastage`
          });
        }
      }

      // Processing jobs
      const processingJobs = await prisma.processingJob.findMany({
        where: { inputRawMaterialId: item.rawMaterialId },
        include: {
          finishedGoods: {
            include: { warehouse: true }
          }
        }
      });
      for (const job of processingJobs) {
        // Processing started
        events.push({
          type: 'PROCESSING_STARTED',
          date: job.startedAt,
          details: `Processing started for ${job.quantityInput} ${item.rawMaterial.unitOfMeasurement}`
        });
        // Processing finished
        if (job.finishedAt) {
          const totalOutput = job.finishedGoods.reduce((sum, fg) => sum + fg.quantity, 0);

          // Calculate by-product if you have it (e.g., from ByProduct table)
          let byProduct = null;
          const byProductSum = await prisma.byProduct.aggregate({
            where: { processingJobId: job.id },
            _sum: { quantity: true }
          });
          if (byProductSum._sum.quantity) byProduct = byProductSum._sum.quantity;

          events.push({
            type: 'PROCESSED',
            date: job.finishedAt,
            details: `Processed ${job.quantityInput} ${item.rawMaterial.unitOfMeasurement} and found ${byProduct ?? 0} ${item.rawMaterial.unitOfMeasurement} by product`
          });
          // Finished goods
          job.finishedGoods.forEach(fg => {
            events.push({
              type: 'FINISHED_GOOD',
              date: fg.createdAt,
              details: `${fg.quantity} ${fg.unitOfMeasurement} ${fg.name} stored in ${fg.warehouse.name}`
            });
          });
        }
      }

      // Sort events by date
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      res.json({
        purchaseOrder: {
          id: po.id,
          orderNumber: po.poNumber,
          orderDate: po.orderDate,
          vendor: { id: po.vendor.id, name: po.vendor.name },
          items: po.items.map((item: { rawMaterial: { id: any; name: any; }; quantityOrdered: any; quantityReceived: any; }) => ({
            rawMaterial: { id: item.rawMaterial.id, name: item.rawMaterial.name },
            orderedQuantity: item.quantityOrdered,
            receivedQuantity: item.quantityReceived,
            warehouse: null // You can fetch warehouse if needed
          }))
        },
        events
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchase order timeline' });
  }
};