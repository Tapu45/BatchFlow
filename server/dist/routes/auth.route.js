"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = __importDefault(require("../controllers/auth.controller"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Authentication routes
router.post('/login', auth_controller_1.default.login); // Login route
router.post('/register', authMiddleware_1.authenticate, auth_controller_1.default.register); // Register route (admin only)
router.get('/me', authMiddleware_1.authenticate, auth_controller_1.default.getCurrentUser); // Get current user profile
router.put('/change-password', authMiddleware_1.authenticate, auth_controller_1.default.changePassword); // Change password
// User management routes
router.get('/users', authMiddleware_1.authenticate, auth_controller_1.default.getAllUsers); // Get all users
// Role management routes
router.post('/roles', authMiddleware_1.authenticate, auth_controller_1.default.createRole); // Create a new role
router.get('/roles', authMiddleware_1.authenticate, auth_controller_1.default.getRoles); // Get all roles
router.get('/roles/:id', authMiddleware_1.authenticate, auth_controller_1.default.getRoleById); // Get a specific role
router.put('/roles/:id', authMiddleware_1.authenticate, auth_controller_1.default.updateRole); // Update a role
router.delete('/roles/:id', authMiddleware_1.authenticate, auth_controller_1.default.deleteRole); // Delete a role
router.get('/permissions/:roleName', authMiddleware_1.authenticate, auth_controller_1.default.getPermissionsByRole);
// Permission management routes
router.get('/permissions', authMiddleware_1.authenticate, auth_controller_1.default.getAllPermissions); // Get all permissions
router.post('/sync-page-permissions', authMiddleware_1.authenticate, auth_controller_1.default.syncPagePermissions); // Sync page permissions
exports.default = router;
