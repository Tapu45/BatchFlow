"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
/**
 * Middleware to check if the user has the required permission.
 * @param requiredPermission - The permission required to access the route.
 */
const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized: No user information found' });
                return;
            }
            const userId = req.user.id;
            // Fetch the user's role and permissions
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    Role: {
                        include: {
                            Permission: true, // Assuming Role has a relation to Permission
                        },
                    },
                },
            });
            if (!user || !user.Role) {
                res.status(403).json({ message: 'Forbidden: User role not found' });
                return;
            }
            // Check if the user's role has the required permission
            const hasPermission = user.Role.Permission.some((permission) => permission.action === requiredPermission);
            if (!hasPermission) {
                res.status(403).json({ message: `Forbidden: Missing permission '${requiredPermission}'` });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
};
exports.checkPermission = checkPermission;
