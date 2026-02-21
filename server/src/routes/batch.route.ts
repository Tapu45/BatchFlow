import express from 'express';
import BatchController from '../controllers/Batch/batch.controller';
import { BatchMailController } from '../controllers/Batch/batchMail.controller';
import { BatchMailFilteredController } from '../controllers/Batch/batchMailFiltered.controller';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// Batch routes
router.post('/batches', authenticate, BatchController.createBatch);
router.get('/batches', authenticate, BatchController.getBatches);
//router.get('/batches/:id', authenticate, BatchController.getBatchById)
router.put('/batches/:id', authenticate, BatchController.updateBatch);
router.put('/batches/:id/submit', authenticate, BatchController.submitBatch);
router.put('/batches/:id/approve', authenticate, BatchController.approveBatch);
router.put('/batches/:id/reject', authenticate, BatchController.rejectBatch);
router.get('/batches/export', authenticate, BatchController.exportToExcel);
// Allow internal calls without auth for scheduled jobs
router.get('/batches/mail/all', (req, res, next) => {
    if (req.headers['x-internal-call'] === 'true') {
        return BatchMailController.mailAllBatches(req, res);
    }
    return authenticate(req, res, next);
}, BatchMailController.mailAllBatches);
router.post('/batches/mail/filtered', authenticate, BatchMailFilteredController.mailFilteredBatches);
router.get('/logs', authenticate, BatchController.getActivityLogs);
router.get('/batches-with-drafts', authenticate, BatchController.getBatchesWithDrafts);
router.get('/grn-numbers', authenticate, BatchController.getAvailableGRNNumbers);

// Add the Certificate of Analysis route
router.get('/batches/:id/certificate', authenticate, BatchController.generateCertificateOfAnalysis);
router.get('/parameters/product/:productId', BatchController.getParametersByProductId);

router.get('/verification/batches', authenticate, BatchController.getBatchesForVerification);
router.get('/verification/batches/:id/parameters', authenticate, BatchController.getBatchParametersForVerification);
router.put('/verification/batches/:batchId/parameters', authenticate, BatchController.updateParameterVerification);
router.put('/verification/batches/:batchId/complete', authenticate, BatchController.completeBatchVerification);

export default router;