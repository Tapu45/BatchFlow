"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cleaning_controller_1 = require("../controllers/rawmaterial/cleaning.controller");
const processing_controller_1 = require("../controllers/rawmaterial/processing.controller");
const product_controller_1 = require("../controllers/rawmaterial/product.controller");
const purchase_controller_1 = require("../controllers/rawmaterial/purchase.controller");
const stock_controller_1 = require("../controllers/rawmaterial/stock.controller");
const unfinished_controller_1 = require("../controllers/rawmaterial/unfinished.controller");
const vendor_controller_1 = require("../controllers/rawmaterial/vendor.controller");
const warehouse_controller_1 = require("../controllers/rawmaterial/warehouse.controller");
const log_controller_1 = require("../controllers/rawmaterial/log.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const time_controller_1 = require("../controllers/rawmaterial/time.controller");
const Dashboard_controller_1 = require("../controllers/rawmaterial/Dashboard.controller");
const quality_controller_1 = require("../controllers/rawmaterial/quality.controller");
const qualityMail_controller_1 = require("../controllers/rawmaterial/qualityMail.controller");
const qualityMailFiltered_controller_1 = require("../controllers/rawmaterial/qualityMailFiltered.controller");
const qualityExportFiltered_controller_1 = require("../controllers/rawmaterial/qualityExportFiltered.controller");
const sendPurchaseOrderMail_controller_1 = require("../controllers/rawmaterial/sendPurchaseOrderMail.controller");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes below
router.use(authMiddleware_1.authenticate);
// Cleaning Jobs
router.post('/cleaning', cleaning_controller_1.CleaningJobController.createCleaningJob);
router.get('/cleaning', cleaning_controller_1.CleaningJobController.getCleaningJobs);
router.get('/cleaning/:id', cleaning_controller_1.CleaningJobController.getCleaningJobById);
router.put('/cleaning/:id', cleaning_controller_1.CleaningJobController.updateCleaningJob);
// Processing Jobs
router.post('/processing', processing_controller_1.ProcessingJobController.createProcessingJob);
router.get('/processing', processing_controller_1.ProcessingJobController.getProcessingJobs);
router.get('/processing/:id', processing_controller_1.ProcessingJobController.getProcessingJobById);
router.put('/processing/:id', processing_controller_1.ProcessingJobController.updateProcessingJob);
// Raw Material Products
router.post('/product', product_controller_1.RawMaterialProductController.createRawMaterialProduct);
router.get('/product', product_controller_1.RawMaterialProductController.getRawMaterialProducts);
router.get('/product/:id', product_controller_1.RawMaterialProductController.getRawMaterialProductById);
router.put('/product/:id', product_controller_1.RawMaterialProductController.updateRawMaterialProduct);
router.delete('/product/:id', product_controller_1.RawMaterialProductController.deleteRawMaterialProduct);
// Purchase Orders
router.post('/purchase', purchase_controller_1.PurchaseOrderController.createPurchaseOrder);
router.get('/purchase', purchase_controller_1.PurchaseOrderController.getPurchaseOrders);
router.get('/purchase/send-mail', sendPurchaseOrderMail_controller_1.sendPurchaseOrderMail);
router.get('/purchase/received/raw-materials', purchase_controller_1.PurchaseOrderController.getReceivedRawMaterials);
router.get('/purchase/received/vendors', purchase_controller_1.PurchaseOrderController.getVendorsFromReceivedOrders);
router.put('/purchase/item/:itemId', purchase_controller_1.PurchaseOrderController.updatePurchaseOrderItem);
router.get('/purchase/:id', purchase_controller_1.PurchaseOrderController.getPurchaseOrderById);
router.put('/purchase/:id', purchase_controller_1.PurchaseOrderController.updatePurchaseOrder);
// Stock Entries
router.post('/stock', stock_controller_1.StockEntryController.createStockEntry);
router.get('/stock', stock_controller_1.StockEntryController.getStockEntries);
router.get('/stock/:id', stock_controller_1.StockEntryController.getStockEntryById);
router.put('/stock/:id', stock_controller_1.StockEntryController.updateStockEntry);
// Unfinished Stock
router.post('/unfinished', unfinished_controller_1.UnfinishedStockController.createUnfinishedStock);
router.get('/unfinished', unfinished_controller_1.UnfinishedStockController.getUnfinishedStocks);
router.get('/unfinished/:id', unfinished_controller_1.UnfinishedStockController.getUnfinishedStockById);
router.put('/unfinished/:id', unfinished_controller_1.UnfinishedStockController.updateUnfinishedStock);
// Vendors
router.post('/vendor', vendor_controller_1.VendorController.createVendor);
router.get('/vendor', vendor_controller_1.VendorController.getVendors);
router.get('/vendor/:id', vendor_controller_1.VendorController.getVendorById);
router.put('/vendor/:id', vendor_controller_1.VendorController.updateVendor);
router.patch('/vendor/:id/status', vendor_controller_1.VendorController.setVendorStatus);
// Warehouses
router.post('/warehouse', warehouse_controller_1.WarehouseController.createWarehouse);
router.get('/warehouse', warehouse_controller_1.WarehouseController.getWarehouses);
router.get('/warehouse/:id', warehouse_controller_1.WarehouseController.getWarehouseById);
router.put('/warehouse/:id', warehouse_controller_1.WarehouseController.updateWarehouse);
router.delete('/warehouse/:id', warehouse_controller_1.WarehouseController.deleteWarehouse);
router.get('/stock', stock_controller_1.StockEntryController.getCurrentStockDistribution);
router.get('/purchase-order-items', purchase_controller_1.PurchaseOrderController.getAllPurchaseOrderItems);
router.get('/transaction-logs', log_controller_1.TransactionLogController.getAllTransactionLogs);
router.get('/cleaned-materials', cleaning_controller_1.CleaningJobController.getCleanedMaterials);
router.get('/purchase', time_controller_1.getPurchaseOrdersByProduct);
router.get('/purchase/:id/timeline', time_controller_1.getPurchaseOrderTimeline);
router.get('/dashboard/total-stock', Dashboard_controller_1.DashboardController.getTotalRawMaterialStock);
router.get('/dashboard/pending-pos', Dashboard_controller_1.DashboardController.getPendingPOCount);
router.get('/dashboard/under-cleaning', Dashboard_controller_1.DashboardController.getStockUnderCleaning);
router.get('/dashboard/in-processing', Dashboard_controller_1.DashboardController.getStockInProcessing);
router.get('/dashboard/low-stock', Dashboard_controller_1.DashboardController.getLowStockAlerts);
router.get('/dashboard/waste-stock', Dashboard_controller_1.DashboardController.getWasteStock);
router.get('/dashboard/total-vendors', Dashboard_controller_1.DashboardController.getTotalVendors);
router.get('/dashboard/total-purchase-orders', Dashboard_controller_1.DashboardController.getTotalPurchaseOrders);
router.get('/dashboard/recent-transactions', Dashboard_controller_1.DashboardController.getRecentTransactions);
router.get('/dashboard/product-wise-waste', Dashboard_controller_1.DashboardController.getProductWiseWasteStock);
router.get('/dashboard/stock-distribution', Dashboard_controller_1.DashboardController.getStockDistributionByWarehouse);
router.get('/dashboard/product-wise-conversion', Dashboard_controller_1.DashboardController.getProductWiseConversionRatio);
// RM Quality Reports
router.post('/quality-report', quality_controller_1.RMQualityController.createQualityReport);
router.get('/quality-report', quality_controller_1.RMQualityController.getQualityReports);
router.get('/quality-report/export/all', quality_controller_1.RMQualityController.exportAllQualityReports);
router.get('/quality-report/mail/all', qualityMail_controller_1.RMQualityMailController.mailAllQualityReports);
router.post('/quality-report/mail/filtered', qualityMailFiltered_controller_1.RMQualityMailFilteredController.mailFilteredQualityReports);
router.post('/quality-report/export/filtered', qualityExportFiltered_controller_1.RMQualityExportFilteredController.exportFilteredQualityReports);
router.get('/quality-report/:id', quality_controller_1.RMQualityController.getQualityReportById);
router.put('/quality-report/:id', quality_controller_1.RMQualityController.updateQualityReport);
router.delete('/quality-report/:id', quality_controller_1.RMQualityController.deleteQualityReport);
router.get('/quality-report/:id/export', quality_controller_1.RMQualityController.exportQualityReport);
exports.default = router;
