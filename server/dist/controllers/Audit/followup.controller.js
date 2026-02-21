"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditsForCalendar = exports.closeAudit = exports.updateCorrectiveAction = exports.getCorrectiveActions = exports.createCorrectiveAction = void 0;
const prisma_1 = require("../../generated/prisma");
const validator_1 = require("../../utils/validator");
const errorHandler_1 = require("../../utils/handler/errorHandler");
const activityLogger_1 = require("../../utils/handler/activityLogger");
const supabase_1 = require("../../service/supabase");
const prisma = new prisma_1.PrismaClient();
// Create a corrective action for a finding
const createCorrectiveAction = async (req, res) => {
    try {
        const { error } = (0, validator_1.validateCorrectiveAction)(req.body);
        if (error) {
            res.status(400).json({ error: error.details[0].message });
            return;
        }
        const { auditId, findingId, title, description, actionType, assignedToId, dueDate } = req.body;
        // Check if audit exists
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
        });
        if (!audit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Check if finding exists if findingId is provided
        if (findingId) {
            const finding = await prisma.finding.findUnique({
                where: { id: findingId },
            });
            if (!finding) {
                res.status(404).json({ error: 'Finding not found' });
                return;
            }
        }
        // Create the corrective action
        const correctiveAction = await prisma.correctiveAction.create({
            data: {
                auditId,
                findingId,
                title,
                description,
                actionType,
                assignedToId,
                dueDate: new Date(dueDate),
                status: 'OPEN',
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                finding: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
        // Log activity
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'CORRECTIVE_ACTION_CREATED',
            details: `Created corrective action: ${correctiveAction.title} for audit: ${audit.name}`,
        });
        // Create notification for assigned user
        await prisma.auditNotification.create({
            data: {
                auditId,
                userId: assignedToId,
                title: `New Corrective Action Assigned: ${title}`,
                message: `You have been assigned a ${actionType.toLowerCase()} action in audit: ${audit.name}`,
                isRead: false,
                sentAt: new Date(),
            },
        });
        res.status(201).json({
            message: 'Corrective action created successfully',
            correctiveAction,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.createCorrectiveAction = createCorrectiveAction;
// Get all corrective actions for an audit
const getCorrectiveActions = async (req, res) => {
    try {
        const { auditId } = req.params;
        const { status, findingId } = req.query;
        // Check if audit exists
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
        });
        if (!audit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Build filters
        const filters = { auditId };
        if (status)
            filters.status = status;
        if (findingId)
            filters.findingId = findingId;
        const actions = await prisma.correctiveAction.findMany({
            where: filters,
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                verifiedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                finding: {
                    select: {
                        id: true,
                        title: true,
                        findingType: true,
                    },
                },
            },
            orderBy: {
                dueDate: 'asc',
            },
        });
        res.status(200).json({
            count: actions.length,
            actions,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getCorrectiveActions = getCorrectiveActions;
// Update a corrective action status
const updateCorrectiveAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, description, evidence } = req.body;
        // Check if corrective action exists
        const existingAction = await prisma.correctiveAction.findUnique({
            where: { id },
            include: {
                audit: true,
                finding: true,
            },
        });
        if (!existingAction) {
            res.status(404).json({ error: 'Corrective action not found' });
            return;
        }
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        // Handle file upload for evidence if available
        let evidenceUrl = evidence;
        if (req.file) {
            const fileBuffer = req.file.buffer;
            const fileName = req.file.originalname;
            const { url, error: uploadError } = await (0, supabase_1.uploadFileToSupabase)(fileBuffer, fileName, 'corrective-action-evidence', `audit-${existingAction.auditId}/action-${id}`);
            if (uploadError || !url) {
                res.status(500).json({
                    error: 'Failed to upload evidence file to storage',
                    details: uploadError?.message
                });
                return;
            }
            evidenceUrl = url;
        }
        // Determine if completion or verification is happening
        const isCompleting = status === 'COMPLETED' && existingAction.status !== 'COMPLETED';
        const isVerifying = status === 'VERIFIED' && existingAction.status !== 'VERIFIED';
        // Update the corrective action
        const updateData = {
            status,
            evidence: evidenceUrl,
        };
        // Add completion data if completing
        if (isCompleting) {
            updateData.completedAt = new Date();
        }
        // Add verification data if verifying
        if (isVerifying) {
            updateData.verifiedAt = new Date();
            updateData.verifiedById = req.user.id;
        }
        // If description is provided, update it
        if (description) {
            updateData.description = description;
        }
        const updatedAction = await prisma.correctiveAction.update({
            where: { id },
            data: updateData,
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                verifiedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                finding: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
        // Log activity
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: isVerifying ? 'CORRECTIVE_ACTION_VERIFIED' : 'CORRECTIVE_ACTION_UPDATED',
            details: `${isVerifying ? 'Verified' : isCompleting ? 'Completed' : 'Updated'} corrective action: ${updatedAction.title} for audit: ${existingAction.audit.name}`,
        });
        // If verified, update the finding status if all associated actions are verified
        if (isVerifying && existingAction.findingId) {
            const allActionsClosed = await prisma.correctiveAction.findMany({
                where: {
                    findingId: existingAction.findingId,
                    status: { not: 'VERIFIED' },
                },
            });
            if (allActionsClosed.length === 0) {
                await prisma.finding.update({
                    where: { id: existingAction.findingId },
                    data: {
                        status: 'CLOSED',
                        closedAt: new Date(),
                    },
                });
                // Log finding closure
                await (0, activityLogger_1.createActivityLog)({
                    userId: req.user.id,
                    action: 'FINDING_CLOSED',
                    details: `Closed finding: ${existingAction.finding.title} after all corrective actions were verified`,
                });
            }
        }
        // Check if all major findings are closed
        if (isVerifying) {
            const openMajorFindings = await prisma.finding.count({
                where: {
                    auditId: existingAction.auditId,
                    findingType: 'MAJOR_NON_CONFORMITY',
                    status: { not: 'CLOSED' },
                },
            });
            // If no open major findings, create notification for admin/auditor
            if (openMajorFindings === 0) {
                await prisma.auditNotification.create({
                    data: {
                        auditId: existingAction.auditId,
                        userId: existingAction.audit.auditorId, // Notify the auditor
                        title: `All Major Non-Conformities Closed`,
                        message: `All major non-conformities for audit: ${existingAction.audit.name} have been addressed and verified. The audit may be ready for closure.`,
                        isRead: false,
                        sentAt: new Date(),
                    },
                });
            }
        }
        res.status(200).json({
            message: `Corrective action ${isVerifying ? 'verified' : isCompleting ? 'completed' : 'updated'} successfully`,
            correctiveAction: updatedAction,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.updateCorrectiveAction = updateCorrectiveAction;
// Close an audit after all issues are resolved
const closeAudit = async (req, res) => {
    try {
        const { auditId } = req.params;
        const { closureSummary } = req.body;
        // Check if audit exists
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
        });
        if (!audit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Check if user is authorized
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        // Check if all major non-conformities are closed
        const openMajorFindings = await prisma.finding.findMany({
            where: {
                auditId,
                findingType: 'MAJOR_NON_CONFORMITY',
                status: { not: 'CLOSED' },
            },
        });
        if (openMajorFindings.length > 0) {
            res.status(400).json({
                error: 'Cannot close audit',
                details: `There are ${openMajorFindings.length} open major non-conformities that must be addressed before closing the audit.`,
                findings: openMajorFindings.map(f => ({ id: f.id, title: f.title })),
            });
            return;
        }
        // Get summary statistics
        const findingsCount = await prisma.finding.groupBy({
            by: ['findingType', 'status'],
            where: { auditId },
            _count: true,
        });
        const actionsCount = await prisma.correctiveAction.groupBy({
            by: ['status'],
            where: { auditId },
            _count: true,
        });
        // Update audit status to COMPLETED
        const closedAudit = await prisma.audit.update({
            where: { id: auditId },
            data: {
                status: 'COMPLETED',
                summary: closureSummary || audit.summary,
            },
        });
        // Log activity
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'AUDIT_CLOSED',
            details: `Closed audit: ${audit.name}`,
        });
        res.status(200).json({
            message: 'Audit closed successfully',
            audit: closedAudit,
            statistics: {
                findings: findingsCount,
                actions: actionsCount,
            },
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.closeAudit = closeAudit;
const getAuditsForCalendar = async (req, res) => {
    try {
        const { startDate, endDate, auditType, status, departmentId } = req.query;
        // Build filters
        const filters = {};
        // Date range filter
        if (startDate) {
            filters.startDate = {
                gte: new Date(startDate),
            };
        }
        if (endDate) {
            // For calendar views, we want to include audits that start before the end date
            filters.startDate = {
                ...(filters.startDate || {}),
                lte: new Date(endDate),
            };
        }
        // Optional filters
        if (auditType)
            filters.auditType = auditType;
        if (status)
            filters.status = status;
        if (departmentId)
            filters.departmentId = departmentId;
        const audits = await prisma.audit.findMany({
            where: filters,
            select: {
                id: true,
                name: true,
                auditType: true,
                status: true,
                startDate: true,
                endDate: true,
                auditor: {
                    select: {
                        id: true,
                        name: true,
                        isExternal: true,
                    }
                },
                auditee: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
            },
            orderBy: {
                startDate: 'asc',
            },
        });
        // Format the audits for calendar display
        const calendarEvents = audits.map(audit => ({
            id: audit.id,
            title: audit.name,
            start: audit.startDate,
            end: audit.endDate || new Date(audit.startDate.getTime() + (24 * 60 * 60 * 1000)), // Default to 1 day if no end date
            auditType: audit.auditType,
            status: audit.status,
            auditor: audit.auditor,
            auditee: audit.auditee,
            department: audit.department ? audit.department.name : null,
            color: getStatusColor(audit.status), // Helper function to assign colors based on status
            borderColor: audit.auditType === 'INTERNAL' ? '#2563eb' : '#dc2626', // Blue for internal, red for external
        }));
        res.status(200).json({
            count: calendarEvents.length,
            events: calendarEvents,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getAuditsForCalendar = getAuditsForCalendar;
const getStatusColor = (status) => {
    switch (status) {
        case 'PLANNED':
            return '#3b82f6'; // Blue
        case 'IN_PROGRESS':
            return '#f59e0b'; // Amber
        case 'COMPLETED':
            return '#10b981'; // Green
        case 'CANCELLED':
            return '#ef4444'; // Red
        case 'DELAYED':
            return '#8b5cf6'; // Purple
        default:
            return '#6b7280'; // Gray
    }
};
