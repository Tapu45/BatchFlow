"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDepartment = exports.getAllDepartments = exports.getAuditStatistics = exports.changeAuditStatus = exports.deleteAudit = exports.updateAudit = exports.getAuditById = exports.getAudits = exports.createAudit = void 0;
const prisma_1 = require("../../generated/prisma");
const validator_1 = require("../../utils/validator");
const errorHandler_1 = require("../../utils/handler/errorHandler");
const activityLogger_1 = require("../../utils/handler/activityLogger");
const auditnotification_1 = require("../../service/auditnotification");
const prisma = new prisma_1.PrismaClient();
// Create a new audit
const createAudit = async (req, res) => {
    try {
        const { error } = (0, validator_1.validateAudit)(req.body);
        if (error) {
            res.status(400).json({ error: error.details[0].message });
            return;
        }
        const { name, auditType, startDate, endDate, auditorId, auditorName, auditorEmail, auditorUserId, auditeeId, firmName, departmentId, objectives, scope } = req.body;
        let finalAuditorId;
        let auditResult;
        // First, handle the auditor creation/lookup outside the transaction
        if (auditorId) {
            const existingAuditor = await prisma.auditor.findUnique({
                where: { id: auditorId }
            });
            if (!existingAuditor) {
                throw new Error("Specified auditor not found");
            }
            finalAuditorId = auditorId;
        }
        else if (auditType === 'INTERNAL' && auditorUserId) {
            let internalAuditor = await prisma.auditor.findFirst({
                where: { userId: auditorUserId }
            });
            if (!internalAuditor) {
                const user = await prisma.user.findUnique({
                    where: { id: auditorUserId },
                    select: { id: true, name: true, email: true }
                });
                if (!user) {
                    throw new Error("User not found for internal auditor");
                }
                internalAuditor = await prisma.auditor.create({
                    data: {
                        name: user.name,
                        email: user.email,
                        userId: user.id,
                        isExternal: false
                    }
                });
            }
            finalAuditorId = internalAuditor.id;
        }
        else if (auditType === 'EXTERNAL' && auditorName && auditorEmail) {
            const externalAuditor = await prisma.auditor.create({
                data: {
                    name: auditorName,
                    email: auditorEmail,
                    isExternal: true,
                    firmName: firmName || "External Firm"
                }
            });
            finalAuditorId = externalAuditor.id;
        }
        else {
            throw new Error(`${auditType} audit requires valid auditor information`);
        }
        // Now create the audit with a separate operation
        auditResult = await prisma.audit.create({
            data: {
                name,
                auditType,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : undefined,
                auditorId: finalAuditorId,
                auditeeId,
                firmName,
                departmentId,
                objectives,
                scope,
                createdById: req.user?.id || "",
            },
            include: {
                auditor: true,
                auditee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                department: true,
            },
        });
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'AUDIT_CREATED',
            details: `Created ${auditResult.auditType.toLowerCase()} audit: ${auditResult.name}`,
        });
        const recipients = [];
        // Add auditor to recipients if they have an email
        if (auditResult.auditor && auditResult.auditor.email) {
            recipients.push(auditResult.auditor.email);
        }
        // Add auditee to recipients if available
        if (auditResult.auditee && auditResult.auditee.email) {
            recipients.push(auditResult.auditee.email);
        }
        // Add the creator's email
        const creator = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { email: true }
        });
        if (creator?.email) {
            recipients.push(creator.email);
        }
        // Send the notification if we have recipients
        if (recipients.length > 0) {
            try {
                await (0, auditnotification_1.sendAuditNotification)({
                    type: auditnotification_1.NotificationType.AUDIT_CREATED,
                    audit: auditResult,
                    recipients,
                    message: `
            <p>An audit has been created and requires your attention.</p>
            <p><strong>Objectives:</strong></p>
            <p>${auditResult.objectives || 'No objectives specified.'}</p>
            <p><strong>Scope:</strong></p>
            <p>${auditResult.scope || 'No scope specified.'}</p>
          `
                });
            }
            catch (notificationError) {
                // Log notification error but don't fail the whole request
                console.error('Failed to send notification:', notificationError);
            }
        }
        res.status(201).json({
            message: 'Audit created successfully',
            audit: auditResult,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.createAudit = createAudit;
// Get all audits with filters
const getAudits = async (req, res) => {
    try {
        const { status, auditType, startDate, endDate, auditorId, departmentId } = req.query;
        // Build filters
        const filters = {};
        if (status)
            filters.status = status;
        if (auditType)
            filters.auditType = auditType;
        if (auditorId)
            filters.auditorId = auditorId;
        if (departmentId)
            filters.departmentId = departmentId;
        if (startDate) {
            filters.startDate = {
                gte: new Date(startDate),
            };
        }
        if (endDate) {
            filters.endDate = {
                lte: new Date(endDate),
            };
        }
        const audits = await prisma.audit.findMany({
            where: filters,
            include: {
                auditor: true,
                auditee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                department: true,
                _count: {
                    select: {
                        findings: true,
                        actions: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.status(200).json({
            count: audits.length,
            audits,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getAudits = getAudits;
// Get a single audit by ID
const getAuditById = async (req, res) => {
    try {
        const { id } = req.params;
        const audit = await prisma.audit.findUnique({
            where: { id },
            include: {
                auditor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                auditee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                department: true,
                findings: {
                    include: {
                        assignedTo: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                actions: {
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
                    },
                },
                documents: {
                    include: {
                        uploadedBy: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        if (!audit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        res.status(200).json(audit);
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getAuditById = getAuditById;
// Update an audit
const updateAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, auditType, status, startDate, endDate, auditorId, auditeeId, firmName, departmentId, objectives, scope, summary } = req.body;
        // Check if audit exists
        const existingAudit = await prisma.audit.findUnique({
            where: { id },
        });
        if (!existingAudit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Update audit
        const updatedAudit = await prisma.audit.update({
            where: { id },
            data: {
                name,
                auditType,
                status,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                auditorId,
                auditeeId,
                firmName,
                departmentId,
                objectives,
                scope,
                summary,
            },
            include: {
                auditor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                auditee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                department: true,
            },
        });
        // Create activity log
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'AUDIT_UPDATED',
            details: `Updated audit: ${updatedAudit.name}`,
        });
        res.status(200).json({
            message: 'Audit updated successfully',
            audit: updatedAudit,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.updateAudit = updateAudit;
// Delete an audit
const deleteAudit = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if audit exists
        const existingAudit = await prisma.audit.findUnique({
            where: { id },
        });
        if (!existingAudit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Delete audit
        await prisma.audit.delete({
            where: { id },
        });
        // Create activity log
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'AUDIT_DELETED',
            details: `Deleted audit: ${existingAudit.name}`,
        });
        res.status(200).json({
            message: 'Audit deleted successfully',
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.deleteAudit = deleteAudit;
// Change audit status
const changeAuditStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // Check if audit exists
        const existingAudit = await prisma.audit.findUnique({
            where: { id },
            include: {
                auditor: true,
                auditee: true,
            }
        });
        if (!existingAudit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Update audit status
        const updatedAudit = await prisma.audit.update({
            where: { id },
            data: { status },
            include: {
                auditor: true,
                auditee: true,
            }
        });
        // Create activity log
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'AUDIT_STATUS_CHANGED',
            details: `Changed audit status to ${status} for audit: ${existingAudit.name}`,
        });
        // Send notification about status change
        const recipients = [];
        // Add auditor to recipients if they have an email
        if (updatedAudit.auditor && updatedAudit.auditor.email) {
            recipients.push(updatedAudit.auditor.email);
        }
        // Add auditee to recipients if available
        if (updatedAudit.auditee && updatedAudit.auditee.email) {
            recipients.push(updatedAudit.auditee.email);
        }
        // Add the creator's email
        const creator = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { email: true }
        });
        if (creator?.email) {
            recipients.push(creator.email);
        }
        if (recipients.length > 0) {
            await (0, auditnotification_1.sendAuditNotification)({
                type: auditnotification_1.NotificationType.AUDIT_STATUS_CHANGED,
                audit: updatedAudit,
                recipients,
                newStatus: status,
                message: `The status of the audit "${updatedAudit.name}" has been changed to ${status}.`
            });
        }
        res.status(200).json({
            message: 'Audit status updated successfully',
            audit: updatedAudit,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.changeAuditStatus = changeAuditStatus;
// Get audit statistics
const getAuditStatistics = async (req, res) => {
    try {
        // Count audits by status
        const auditsByStatus = await prisma.audit.groupBy({
            by: ['status'],
            _count: {
                _all: true,
            },
        });
        // Count audits by type
        const auditsByType = await prisma.audit.groupBy({
            by: ['auditType'],
            _count: {
                _all: true,
            },
        });
        // Get findings statistics
        const findingsByStatus = await prisma.finding.groupBy({
            by: ['status'],
            _count: {
                _all: true,
            },
        });
        // Get actions statistics
        const actionsByStatus = await prisma.correctiveAction.groupBy({
            by: ['status'],
            _count: {
                _all: true,
            },
        });
        // Get upcoming audits
        const upcomingAudits = await prisma.audit.findMany({
            where: {
                startDate: {
                    gte: new Date(),
                },
                status: 'PLANNED',
            },
            orderBy: {
                startDate: 'asc',
            },
            take: 5,
            include: {
                auditor: {
                    select: {
                        name: true,
                    },
                },
                department: true,
            },
        });
        res.status(200).json({
            auditsByStatus,
            auditsByType,
            findingsByStatus,
            actionsByStatus,
            upcomingAudits,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getAuditStatistics = getAuditStatistics;
const getAllDepartments = async (req, res) => {
    try {
        // Fetch all departments
        const departments = await prisma.department.findMany({
            orderBy: {
                name: 'asc', // Order alphabetically by name
            },
        });
        res.status(200).json(departments);
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getAllDepartments = getAllDepartments;
// Create department (for future use)
const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;
        // Validate required fields
        if (!name) {
            res.status(400).json({ error: 'Department name is required' });
            return;
        }
        // Check if department already exists
        const existingDepartment = await prisma.department.findUnique({
            where: { name },
        });
        if (existingDepartment) {
            res.status(409).json({ error: 'Department with this name already exists' });
            return;
        }
        // Create new department
        const department = await prisma.department.create({
            data: {
                name,
                description,
            },
        });
        res.status(201).json({
            message: 'Department created successfully',
            department,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.createDepartment = createDepartment;
