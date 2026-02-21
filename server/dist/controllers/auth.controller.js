"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const prisma_1 = require("../generated/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const prisma = new prisma_1.PrismaClient();
// Authentication Controller
class AuthController {
    // Login user
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({ message: 'Email and password are required' });
                return;
            }
            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email },
                include: { Role: true }
            });
            if (!user) {
                res.status(401).json({ message: 'Invalid credentials' });
                return;
            }
            // Compare passwords
            const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
            if (!isPasswordValid) {
                res.status(401).json({ message: 'Invalid credentials' });
                return;
            }
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: user.email,
                role: user.Role.name
            }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '365d' });
            // Log login activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId: user.id,
                    action: 'LOGIN',
                    details: `User logged in at ${new Date().toISOString()}`
                }
            });
            res.status(200).json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.Role.name
                }
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Register new user (admin only)
    async register(req, res) {
        try {
            const { email, name, password, roleId } = req.body;
            // Check if user with email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });
            if (existingUser) {
                res.status(400).json({ message: 'User with this email already exists' });
                return;
            }
            // Hash password
            const saltRounds = 10;
            const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
            // Create new user
            const newUser = await prisma.user.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    email,
                    name,
                    password: hashedPassword,
                    roleId,
                    updatedAt: new Date()
                },
                include: {
                    Role: true
                }
            });
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: Admin token required' });
                return;
            }
            // Log user creation activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId: req.user.id, // Admin's ID who created the user
                    action: 'CREATE_USER',
                    details: `Created user: ${email}`
                }
            });
            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.Role.name
                }
            });
        }
        catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Get current user profile
    // Get current user profile with all details
    async getCurrentUser(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: User not authenticated' });
                return;
            }
            const userId = req.user.id;
            // Fetch user with related data
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    Role: {
                        include: {
                            Permission: true
                        }
                    },
                    ActivityLog: {
                        orderBy: { createdAt: 'desc' },
                        take: 10 // Fetch the 10 most recent activities
                    },
                    Notification: {
                        where: { isRead: false },
                        orderBy: { createdAt: 'desc' }
                    },
                    Batch_Batch_makerIdToUser: {
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            Product: true
                        }
                    },
                    Batch_Batch_checkerIdToUser: {
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            Product: true
                        }
                    },
                    StandardsCreated: {
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            Category: true
                        }
                    }
                }
            });
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            // Structure the response data
            const userData = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: {
                    id: user.Role.id,
                    name: user.Role.name,
                    description: user.Role.description,
                    permissions: user.Role.Permission.map(p => ({
                        action: p.action,
                        resource: p.resource
                    }))
                },
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                recentActivity: user.ActivityLog.map(log => ({
                    id: log.id,
                    action: log.action,
                    details: log.details,
                    createdAt: log.createdAt,
                    batchId: log.batchId
                })),
                unreadNotifications: user.Notification.map(notification => ({
                    id: notification.id,
                    message: notification.message,
                    type: notification.type,
                    createdAt: notification.createdAt,
                    batchId: notification.batchId
                })),
                recentBatchesCreated: user.Batch_Batch_makerIdToUser.map(batch => ({
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    productName: batch.Product.name,
                    status: batch.status,
                    createdAt: batch.createdAt
                })),
                recentBatchesReviewed: user.Batch_Batch_checkerIdToUser.map(batch => ({
                    id: batch.id,
                    batchNumber: batch.batchNumber,
                    productName: batch.Product.name,
                    status: batch.status,
                    createdAt: batch.createdAt
                })),
                recentStandardsCreated: user.StandardsCreated.map(standard => ({
                    id: standard.id,
                    name: standard.name,
                    code: standard.code,
                    category: standard.Category.name,
                    status: standard.status
                }))
            };
            res.status(200).json({
                message: 'User details retrieved successfully',
                user: userData
            });
        }
        catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Change password
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.userId;
            // Find user
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            // Verify current password
            const isPasswordValid = await bcrypt_1.default.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                res.status(401).json({ message: 'Current password is incorrect' });
                return;
            }
            // Hash new password
            const saltRounds = 10;
            const hashedPassword = await bcrypt_1.default.hash(newPassword, saltRounds);
            // Update password
            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedPassword,
                    updatedAt: new Date()
                }
            });
            // Log password change activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'CHANGE_PASSWORD',
                    details: `Password changed at ${new Date().toISOString()}`
                }
            });
            res.status(200).json({ message: 'Password changed successfully' });
        }
        catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Get all users (admin only)
     */
    async getAllUsers(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: User not authenticated' });
                return;
            }
            // Only allow admins to access this endpoint
            if (req.user.role !== 'Admin') {
                res.status(403).json({ message: 'Forbidden: Admin access required' });
                return;
            }
            // Fetch all users with their roles
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                    Role: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            // Format the response
            const formattedUsers = users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.Role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }));
            res.status(200).json({
                message: 'Users retrieved successfully',
                users: formattedUsers
            });
        }
        catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Create a new role with permissions
     */
    async createRole(req, res) {
        try {
            const { name, description, permissions } = req.body;
            if (!name) {
                res.status(400).json({ message: 'Role name is required' });
                return;
            }
            // Check if role with this name already exists
            const existingRole = await prisma.role.findUnique({
                where: { name }
            });
            if (existingRole) {
                res.status(400).json({ message: 'Role with this name already exists' });
                return;
            }
            // Start a transaction
            const role = await prisma.$transaction(async (prisma) => {
                // Create the role
                const role = await prisma.role.create({
                    data: {
                        id: (0, uuid_1.v4)(),
                        name,
                        description: description || '',
                        updatedAt: new Date()
                    }
                });
                // Connect permissions if provided
                if (Array.isArray(permissions) && permissions.length > 0) {
                    // First verify all permissions exist
                    const permissionIds = permissions.map(p => p.id);
                    const existingPermissions = await prisma.permission.findMany({
                        where: { id: { in: permissionIds } }
                    });
                    if (existingPermissions.length !== permissionIds.length) {
                        throw new Error('One or more permissions do not exist');
                    }
                    // Connect permissions to role
                    await prisma.role.update({
                        where: { id: role.id },
                        data: {
                            Permission: {
                                connect: permissionIds.map(id => ({ id }))
                            }
                        }
                    });
                }
                // Get the updated role with permissions
                return prisma.role.findUnique({
                    where: { id: role.id },
                    include: {
                        Permission: {
                            select: {
                                id: true,
                                action: true,
                                resource: true
                            }
                        }
                    }
                });
            });
            // Log role creation
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId: req.user?.id || 'system',
                    action: 'CREATE_ROLE',
                    details: `Created role: ${name}`
                }
            });
            res.status(201).json({
                message: 'Role created successfully',
                role
            });
        }
        catch (error) {
            console.error('Create role error:', error);
            res.status(500).json({
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Update an existing role and its permissions
     */
    async updateRole(req, res) {
        try {
            const { id } = req.params;
            const { name, description, permissions } = req.body;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: User not authenticated' });
                return;
            }
            // Verify role exists
            const existingRole = await prisma.role.findUnique({
                where: { id }
            });
            if (!existingRole) {
                res.status(404).json({ message: 'Role not found' });
                return;
            }
            // Check for name conflicts if name is being changed
            if (name && name !== existingRole.name) {
                const nameConflict = await prisma.role.findUnique({
                    where: { name }
                });
                if (nameConflict) {
                    res.status(400).json({ message: 'Role with this name already exists' });
                    return;
                }
            }
            // Start a transaction for updating the role
            const updatedRole = await prisma.$transaction(async (prisma) => {
                // Update basic role details
                const role = await prisma.role.update({
                    where: { id },
                    data: {
                        name: name || existingRole.name,
                        description: description !== undefined ? description : existingRole.description,
                        updatedAt: new Date()
                    }
                });
                // Update permissions if provided
                if (Array.isArray(permissions)) {
                    // If permissions array is provided (even if empty), reset and set the new permissions
                    // First disconnect all existing permissions
                    await prisma.role.update({
                        where: { id },
                        data: {
                            Permission: {
                                set: [] // Disconnect all permissions
                            }
                        }
                    });
                    // Then connect new permissions if any
                    if (permissions.length > 0) {
                        const permissionIds = permissions.map(p => p.id);
                        await prisma.role.update({
                            where: { id },
                            data: {
                                Permission: {
                                    connect: permissionIds.map(id => ({ id }))
                                }
                            }
                        });
                    }
                }
                // Return updated role with its permissions
                return prisma.role.findUnique({
                    where: { id },
                    include: {
                        Permission: {
                            select: {
                                id: true,
                                action: true,
                                resource: true
                            }
                        }
                    }
                });
            });
            // Log role update
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId: req.user.id,
                    action: 'UPDATE_ROLE',
                    details: `Updated role: ${existingRole.name}`
                }
            });
            res.status(200).json({
                message: 'Role updated successfully',
                role: updatedRole
            });
        }
        catch (error) {
            console.error('Update role error:', error);
            res.status(500).json({
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Get all available permissions for role management
     */
    async getAllPermissions(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: User not authenticated' });
                return;
            }
            // Get all permissions from database
            const permissions = await prisma.permission.findMany({
                orderBy: [
                    { resource: 'asc' },
                    { action: 'asc' }
                ]
            });
            // Group permissions by resource for easier display in UI
            const groupedPermissions = permissions.reduce((acc, permission) => {
                const resource = permission.resource;
                if (!acc[resource]) {
                    acc[resource] = [];
                }
                acc[resource].push(permission);
                return acc;
            }, {});
            res.status(200).json({
                message: 'Permissions retrieved successfully',
                permissions,
                groupedPermissions
            });
        }
        catch (error) {
            console.error('Get permissions error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Get detailed information about a single role
     */
    async getRoleById(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: User not authenticated' });
                return;
            }
            // Get role with permissions
            const role = await prisma.role.findUnique({
                where: { id },
                include: {
                    Permission: {
                        select: {
                            id: true,
                            action: true,
                            resource: true
                        }
                    },
                    User: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            if (!role) {
                res.status(404).json({ message: 'Role not found' });
                return;
            }
            res.status(200).json({
                message: 'Role retrieved successfully',
                role
            });
        }
        catch (error) {
            console.error('Get role error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Delete a role (only if not assigned to any users)
     */
    async deleteRole(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: User not authenticated' });
                return;
            }
            // Check if role exists and get users count
            const role = await prisma.role.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: { User: true }
                    }
                }
            });
            if (!role) {
                res.status(404).json({ message: 'Role not found' });
                return;
            }
            // Don't allow deletion if users are assigned to this role
            if (role._count.User > 0) {
                res.status(400).json({
                    message: 'Cannot delete role that is assigned to users',
                    userCount: role._count.User
                });
                return;
            }
            // Delete the role
            await prisma.role.delete({
                where: { id }
            });
            // Log role deletion
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId: req.user.id,
                    action: 'DELETE_ROLE',
                    details: `Deleted role: ${role.name}`
                }
            });
            res.status(200).json({
                message: 'Role deleted successfully',
                roleId: id
            });
        }
        catch (error) {
            console.error('Delete role error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Get all roles
     */
    async getRoles(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: User not authenticated' });
                return;
            }
            // Get all roles with their permission count
            const roles = await prisma.role.findMany({
                include: {
                    _count: {
                        select: {
                            Permission: true,
                            User: true
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });
            const formattedRoles = roles.map(role => ({
                id: role.id,
                name: role.name,
                description: role.description,
                permissionCount: role._count.Permission,
                userCount: role._count.User,
                createdAt: role.createdAt,
                updatedAt: role.updatedAt
            }));
            res.status(200).json({
                message: 'Roles retrieved successfully',
                roles: formattedRoles
            });
        }
        catch (error) {
            console.error('Get roles error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Get permissions for a specific role
     */
    async getPermissionsByRole(req, res) {
        try {
            const { roleName } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: User not authenticated' });
                return;
            }
            // Find role by name
            const role = await prisma.role.findUnique({
                where: { name: roleName },
                include: {
                    Permission: {
                        select: {
                            id: true,
                            action: true,
                            resource: true
                        }
                    }
                }
            });
            if (!role) {
                res.status(404).json({ message: 'Role not found' });
                return;
            }
            // Extract permissions and organize them
            const permissions = role.Permission;
            // Create a map of permissions for easy access in frontend
            const permissionMap = {};
            permissions.forEach(permission => {
                permissionMap[permission.action] = true;
            });
            res.status(200).json({
                message: 'Permissions retrieved successfully',
                permissions,
                permissionMap
            });
        }
        catch (error) {
            console.error('Get permissions by role error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    /**
     * Register page permissions from frontend route registry
     */
    async syncPagePermissions(req, res) {
        try {
            const { routes } = req.body;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: User not authenticated' });
                return;
            }
            if (!Array.isArray(routes) || routes.length === 0) {
                res.status(400).json({ message: 'Routes array is required' });
                return;
            }
            const results = [];
            // Process each route
            for (const route of routes) {
                const { path, name, permissionKey } = route;
                const resource = route.resource || 'page';
                // Skip if missing required fields
                if (!permissionKey || !resource) {
                    results.push({
                        path,
                        status: 'skipped',
                        reason: 'Missing permissionKey or resource'
                    });
                    continue;
                }
                // Check if permission already exists
                const existingPermission = await prisma.permission.findUnique({
                    where: {
                        action_resource: {
                            action: permissionKey,
                            resource
                        }
                    }
                });
                if (existingPermission) {
                    results.push({
                        path,
                        status: 'exists',
                        permissionId: existingPermission.id
                    });
                }
                else {
                    // Create new permission
                    const newPermission = await prisma.permission.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            action: permissionKey,
                            resource,
                            updatedAt: new Date()
                        }
                    });
                    results.push({
                        path,
                        status: 'created',
                        permissionId: newPermission.id
                    });
                }
            }
            res.status(200).json({
                message: 'Page permissions synchronized successfully',
                results
            });
        }
        catch (error) {
            console.error('Sync permissions error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}
exports.AuthController = AuthController;
exports.default = new AuthController();
