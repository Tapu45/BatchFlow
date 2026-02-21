"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const draft_controller_1 = require("../controllers/draft.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware"); // Assuming you have auth middleware
const draft_controller_2 = require("../controllers/draft.controller");
const router = express_1.default.Router();
// Protect routes with authentication
router.post('/batch', authMiddleware_1.authenticate, draft_controller_1.saveDraftBatch);
router.get('/batch/:id', authMiddleware_1.authenticate, draft_controller_1.getDraftBatch);
router.get('/batch-latest', authMiddleware_1.authenticate, draft_controller_2.getLatestDraftForUser);
router.delete('/batch/:id', authMiddleware_1.authenticate, draft_controller_1.deleteDraftBatch);
exports.default = router;
