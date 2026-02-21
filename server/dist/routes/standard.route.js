"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const standard_controller_1 = __importDefault(require("../controllers/Batch/standard.controller"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const checkPermisssion_1 = require("../middlewares/checkPermisssion");
const router = express_1.default.Router();
// Standard routes
//router.post('/standards', authenticate,  StandardController.createStandard);
//router.get('/standards', authenticate, StandardController.getStandards);
//router.get('/standards/:id', authenticate, StandardController.getStandardById);
//router.put('/standards/:id', authenticate, checkPermission('UPDATE_STANDARD'), StandardController.updateStandard);
//router.delete('/standards/:id', authenticate, checkPermission('DELETE_STANDARD'), StandardController.deleteStandard);
// Standard category routes
router.post('/standards/categories', authMiddleware_1.authenticate, standard_controller_1.default.createStandardCategory);
router.get('/categoriess', authMiddleware_1.authenticate, standard_controller_1.default.getStandardCategories);
router.put('/categories/:id', authMiddleware_1.authenticate, standard_controller_1.default.updateStandardCategory);
router.delete('/categories/:id', authMiddleware_1.authenticate, standard_controller_1.default.deleteStandardCategory);
router.post('/parameter', authMiddleware_1.authenticate, standard_controller_1.default.createStandardParameter);
router.get('/parameters', authMiddleware_1.authenticate, standard_controller_1.default.getStandardParameters);
router.put('/parameters/:id', authMiddleware_1.authenticate, standard_controller_1.default.updateStandardParameter);
router.delete('/parameters/:id', authMiddleware_1.authenticate, standard_controller_1.default.deleteStandardParameter);
// Unit of measurement routes
router.post('/units', authMiddleware_1.authenticate, standard_controller_1.default.createUnit);
router.get('/unit', authMiddleware_1.authenticate, standard_controller_1.default.getUnits);
router.put('/units/:id', authMiddleware_1.authenticate, (0, checkPermisssion_1.checkPermission)('UPDATE_UNIT'), standard_controller_1.default.updateUnit);
router.delete('/units/:id', authMiddleware_1.authenticate, (0, checkPermisssion_1.checkPermission)('DELETE_UNIT'), standard_controller_1.default.deleteUnit);
// Methodology routes
router.post('/methodologies', authMiddleware_1.authenticate, standard_controller_1.default.createMethodology);
router.get('/methodologies', authMiddleware_1.authenticate, standard_controller_1.default.getMethodologies);
router.get('/methodologies/:id', authMiddleware_1.authenticate, standard_controller_1.default.getMethodologyById);
router.put('/methodologies/:id', authMiddleware_1.authenticate, (0, checkPermisssion_1.checkPermission)('UPDATE_METHODOLOGY'), standard_controller_1.default.updateMethodology);
router.delete('/methodologies/:id', authMiddleware_1.authenticate, (0, checkPermisssion_1.checkPermission)('DELETE_METHODOLOGY'), standard_controller_1.default.deleteMethodology);
exports.default = router;
