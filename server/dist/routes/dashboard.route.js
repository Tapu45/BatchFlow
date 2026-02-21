"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// In your routes file
const express_1 = require("express");
const dashboard_controller_1 = __importDefault(require("../controllers/Batch/dashboard.controller"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const dashboard_controller_2 = require("../controllers/Training/dashboard.controller");
const router = (0, express_1.Router)();
// Apply authentication middleware to all dashboard routes
router.use(authMiddleware_1.authenticate);
// Dashboard endpoints
router.get('/overview', dashboard_controller_1.default.getOverviewStats);
router.get('/batch-trends', dashboard_controller_1.default.getBatchTrends);
router.get('/product-performance', dashboard_controller_1.default.getProductPerformance);
router.get('/user-activity', dashboard_controller_1.default.getUserActivity);
router.get('/quality-metrics', dashboard_controller_1.default.getQualityMetrics);
router.get('/monthly-summary', dashboard_controller_1.default.getMonthlyBatchSummary);
router.get('/standard-usage', dashboard_controller_1.default.getStandardUsageMetrics);
router.get('/summaryy', dashboard_controller_2.getTrainingSummaryStats);
router.get('/monthly', dashboard_controller_2.getMonthlyTrainingStats);
router.get('/attendance', dashboard_controller_2.getAttendanceStats);
router.get('/feedback', dashboard_controller_2.getFeedbackStats);
router.get('/trainers', dashboard_controller_2.getTrainerStats);
router.get('/engagement', dashboard_controller_2.getParticipantEngagementStats);
router.get('/', dashboard_controller_2.getDashboardStats);
exports.default = router;
