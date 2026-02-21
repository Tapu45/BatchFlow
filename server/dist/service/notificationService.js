"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const prisma_1 = require("../generated/prisma");
const uuid_1 = require("uuid");
const prisma = new prisma_1.PrismaClient();
class NotificationService {
    /**
     * Create a notification for a user.
     * @param data - Notification data including userId, batchId, message, and type.
     */
    async createNotification(data) {
        try {
            await prisma.notification.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId: data.userId,
                    batchId: data.batchId,
                    message: data.message,
                    type: data.type,
                    createdAt: new Date(),
                },
            });
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw new Error('Failed to create notification');
        }
    }
    /**
     * Get notifications for a specific user.
     * @param userId - The ID of the user.
     */
    async getNotificationsForUser(userId) {
        try {
            return await prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            throw new Error('Failed to fetch notifications');
        }
    }
}
exports.NotificationService = NotificationService;
exports.default = new NotificationService();
