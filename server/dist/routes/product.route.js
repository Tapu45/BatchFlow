"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const product_controller_1 = __importDefault(require("../controllers/Batch/product.controller"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Product routes
router.post('/', authMiddleware_1.authenticate, product_controller_1.default.createProduct);
router.get('/', authMiddleware_1.authenticate, product_controller_1.default.getProducts); // Get all products with filtering
exports.default = router;
