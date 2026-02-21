"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const createController = __importStar(require("../controllers/Audit/create.controller"));
const preparationController = __importStar(require("../controllers/Audit/preparation.controller"));
const executionController = __importStar(require("../controllers/Audit/execution.controller"));
const reportController = __importStar(require("../controllers/Audit/report.controller"));
const followupController = __importStar(require("../controllers/Audit/followup.controller"));
const dashboard_controller_1 = require("../controllers/Audit/dashboard.controller");
const router = express_1.default.Router();
// Set up multer for file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB file size limit
    }
});
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticate);
// ===== Dashboard Routes =====
router.get('/dashboard/overview', dashboard_controller_1.AuditDashboardController.getAuditOverview);
router.get('/dashboard/status-distribution', dashboard_controller_1.AuditDashboardController.getAuditStatusDistribution);
router.get('/dashboard/findings-distribution', dashboard_controller_1.AuditDashboardController.getFindingsDistribution);
router.get('/dashboard/recent-audits', dashboard_controller_1.AuditDashboardController.getRecentAudits);
router.get('/dashboard/upcoming-audits', dashboard_controller_1.AuditDashboardController.getUpcomingAudits);
router.get('/dashboard/overdue-actions', dashboard_controller_1.AuditDashboardController.getOverdueActions);
router.get('/dashboard/trends', dashboard_controller_1.AuditDashboardController.getAuditTrends);
router.get('/dashboard/department-stats', dashboard_controller_1.AuditDashboardController.getDepartmentAuditStats);
router.get('/dashboard/auditor-performance', dashboard_controller_1.AuditDashboardController.getAuditorPerformance);
router.get('/dashboard/critical-findings', dashboard_controller_1.AuditDashboardController.getCriticalFindings);
router.get('/dashboard/all', dashboard_controller_1.AuditDashboardController.getDashboardData);
// ===== Audit Base Routes =====
// Create and manage audits
router.post('/', createController.createAudit);
router.get('/', createController.getAudits);
router.get('/statistics', createController.getAuditStatistics);
router.get('/departments', createController.getAllDepartments);
router.post('/departments', createController.createDepartment);
router.get('/:id', createController.getAuditById);
router.put('/:id', createController.updateAudit);
router.delete('/:id', createController.deleteAudit);
router.patch('/:id/status', createController.changeAuditStatus);
router.delete('/:auditId/documents/:documentId', preparationController.deleteAuditDocument);
// ===== Preparation Phase Routes =====
// Notifications
router.post('/:auditId/notifications', preparationController.sendAuditNotifications);
// Document management with file upload middleware
router.post('/:auditId/documents', upload.single('file'), preparationController.uploadAuditDocument);
router.get('/:auditId/documents', preparationController.getAuditDocuments);
// Checklist management
router.post('/:auditId/checklist', preparationController.createPreAuditChecklist);
router.get('/:auditId/checklist', preparationController.getPreAuditChecklist);
router.patch('/checklist/:id', preparationController.updateChecklistItem);
// Previous audit actions
router.get('/:auditId/previous-actions', preparationController.getPreviousAuditActions);
// ===== Execution Phase Routes =====
router.post('/:auditId/execution/start', executionController.startExecutionPhase);
router.post('/:auditId/findings', upload.single('evidence'), executionController.createFinding);
router.get('/:auditId/findings', executionController.getAuditFindings);
router.get('/findings/:id', executionController.getFindingById);
router.put('/findings/:id', upload.single('evidence'), executionController.updateFinding);
router.post('/:auditId/inspection-checklist', executionController.createInspectionChecklist);
router.get('/:auditId/inspection-checklists', executionController.getInspectionChecklists);
router.post('/:auditId/execution/complete', executionController.completeExecutionPhase);
router.get('/inspection-items/:itemId', executionController.getInspectionItem);
router.put('/inspection-items/:itemId', upload.single('evidence'), executionController.updateInspectionItem);
// ===== Follow-up Phase Routes =====
router.post('/:auditId/report', reportController.generateAuditReport);
router.get('/:auditId/reports', reportController.getAuditReports);
// ===== Follow-up Phase Routes =====
router.post('/:auditId/corrective-actions', followupController.createCorrectiveAction);
router.get('/:auditId/corrective-actions', followupController.getCorrectiveActions);
router.put('/corrective-actions/:id', upload.single('evidence'), followupController.updateCorrectiveAction);
router.post('/:auditId/close', followupController.closeAudit);
router.get('/calendar/events', followupController.getAuditsForCalendar);
exports.default = router;
