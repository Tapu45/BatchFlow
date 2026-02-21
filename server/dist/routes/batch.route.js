"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const batch_controller_1 = __importDefault(require("../controllers/Batch/batch.controller"));
const batchMail_controller_1 = require("../controllers/Batch/batchMail.controller");
const batchMailFiltered_controller_1 = require("../controllers/Batch/batchMailFiltered.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Batch routes
router.post('/batches', authMiddleware_1.authenticate, batch_controller_1.default.createBatch);
router.get('/batches', authMiddleware_1.authenticate, batch_controller_1.default.getBatches);
//router.get('/batches/:id', authenticate, BatchController.getBatchById)
router.put('/batches/:id', authMiddleware_1.authenticate, batch_controller_1.default.updateBatch);
router.put('/batches/:id/submit', authMiddleware_1.authenticate, batch_controller_1.default.submitBatch);
router.put('/batches/:id/approve', authMiddleware_1.authenticate, batch_controller_1.default.approveBatch);
router.put('/batches/:id/reject', authMiddleware_1.authenticate, batch_controller_1.default.rejectBatch);
router.get('/batches/export', authMiddleware_1.authenticate, batch_controller_1.default.exportToExcel);
// Allow internal calls without auth for scheduled jobs
router.get('/batches/mail/all', (req, res, next) => {
    if (req.headers['x-internal-call'] === 'true') {
        return batchMail_controller_1.BatchMailController.mailAllBatches(req, res);
    }
    return (0, authMiddleware_1.authenticate)(req, res, next);
}, batchMail_controller_1.BatchMailController.mailAllBatches);
router.post('/batches/mail/filtered', authMiddleware_1.authenticate, batchMailFiltered_controller_1.BatchMailFilteredController.mailFilteredBatches);
router.get('/logs', authMiddleware_1.authenticate, batch_controller_1.default.getActivityLogs);
router.get('/batches-with-drafts', authMiddleware_1.authenticate, batch_controller_1.default.getBatchesWithDrafts);
router.get('/grn-numbers', authMiddleware_1.authenticate, batch_controller_1.default.getAvailableGRNNumbers);
// Add the Certificate of Analysis route
router.get('/batches/:id/certificate', authMiddleware_1.authenticate, batch_controller_1.default.generateCertificateOfAnalysis);
router.get('/parameters/product/:productId', batch_controller_1.default.getParametersByProductId);
router.get('/verification/batches', authMiddleware_1.authenticate, batch_controller_1.default.getBatchesForVerification);
router.get('/verification/batches/:id/parameters', authMiddleware_1.authenticate, batch_controller_1.default.getBatchParametersForVerification);
router.put('/verification/batches/:batchId/parameters', authMiddleware_1.authenticate, batch_controller_1.default.updateParameterVerification);
router.put('/verification/batches/:batchId/complete', authMiddleware_1.authenticate, batch_controller_1.default.completeBatchVerification);
exports.default = router;
