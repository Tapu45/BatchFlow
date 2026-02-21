"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInspectionItem = exports.updateInspectionItem = exports.completeExecutionPhase = exports.getInspectionChecklists = exports.createInspectionChecklist = exports.updateFinding = exports.getFindingById = exports.getAuditFindings = exports.createFinding = exports.startExecutionPhase = void 0;
const prisma_1 = require("../../generated/prisma");
const validator_1 = require("../../utils/validator");
const errorHandler_1 = require("../../utils/handler/errorHandler");
const activityLogger_1 = require("../../utils/handler/activityLogger");
const supabase_1 = require("../../service/supabase");
const prisma = new prisma_1.PrismaClient();
// Start the execution phase of an audit
const startExecutionPhase = async (req, res) => {
    try {
        const { auditId } = req.params;
        // Check if audit exists
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
        });
        if (!audit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Update audit status to in progress
        const updatedAudit = await prisma.audit.update({
            where: { id: auditId },
            data: {
                status: 'IN_PROGRESS',
            },
        });
        // Log activity
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'EXECUTION_PHASE_STARTED',
            details: `Started execution phase for audit: ${audit.name}`,
        });
        res.status(200).json({
            message: 'Audit execution phase started successfully',
            audit: updatedAudit,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.startExecutionPhase = startExecutionPhase;
// Create a finding during audit execution
const createFinding = async (req, res) => {
    try {
        const { error } = (0, validator_1.validateFinding)(req.body);
        if (error) {
            res.status(400).json({ error: error.details[0].message });
            return;
        }
        const { auditId, title, description, findingType, status, priority, dueDate, assignedToId, evidence } = req.body;
        // Check if audit exists
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
        });
        if (!audit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Handle file upload for evidence if available
        let evidenceUrl = evidence;
        if (req.file) {
            const fileBuffer = req.file.buffer;
            const fileName = req.file.originalname;
            const { url, error: uploadError } = await (0, supabase_1.uploadFileToSupabase)(fileBuffer, fileName, 'audit-evidences', `audit-${auditId}/finding-evidence`);
            if (uploadError || !url) {
                res.status(500).json({
                    error: 'Failed to upload evidence file to storage',
                    details: uploadError?.message
                });
                return;
            }
            evidenceUrl = url;
        }
        // Create the finding
        const finding = await prisma.finding.create({
            data: {
                auditId,
                title,
                description,
                findingType,
                status: status || 'OPEN',
                priority: priority || 'MEDIUM',
                dueDate: dueDate ? new Date(dueDate) : undefined,
                assignedToId,
                evidence: evidenceUrl,
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
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
            action: 'FINDING_CREATED',
            details: `Created finding: ${finding.title} (${finding.findingType}) for audit: ${audit.name}`,
        });
        // If a user is assigned, create a notification
        if (assignedToId) {
            await prisma.auditNotification.create({
                data: {
                    auditId,
                    userId: assignedToId,
                    title: `New Finding Assigned: ${finding.title}`,
                    message: `You have been assigned to address a ${findingType.toLowerCase()} finding in audit: ${audit.name}`,
                    isRead: false,
                    sentAt: new Date(),
                },
            });
        }
        res.status(201).json({
            message: 'Finding created successfully',
            finding,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.createFinding = createFinding;
// Get all findings for an audit
const getAuditFindings = async (req, res) => {
    try {
        const { auditId } = req.params;
        const { type, status } = req.query;
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
        if (type)
            filters.findingType = type;
        if (status)
            filters.status = status;
        const findings = await prisma.finding.findMany({
            where: filters,
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                actions: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.status(200).json({
            count: findings.length,
            findings,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getAuditFindings = getAuditFindings;
// Get a single finding by ID
const getFindingById = async (req, res) => {
    try {
        const { id } = req.params;
        const finding = await prisma.finding.findUnique({
            where: { id },
            include: {
                audit: {
                    select: {
                        id: true,
                        name: true,
                        auditType: true,
                    },
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
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
                    },
                },
            },
        });
        if (!finding) {
            res.status(404).json({ error: 'Finding not found' });
            return;
        }
        res.status(200).json(finding);
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getFindingById = getFindingById;
// Update a finding
const updateFinding = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, findingType, status, priority, dueDate, assignedToId, evidence, } = req.body;
        // Check if finding exists
        const existingFinding = await prisma.finding.findUnique({
            where: { id },
            include: { audit: true },
        });
        if (!existingFinding) {
            res.status(404).json({ error: 'Finding not found' });
            return;
        }
        // Handle file upload for new evidence if available
        let evidenceUrl = evidence;
        if (req.file) {
            const fileBuffer = req.file.buffer;
            const fileName = req.file.originalname;
            const { url, error: uploadError } = await (0, supabase_1.uploadFileToSupabase)(fileBuffer, fileName, 'audit-evidences', `audit-${existingFinding.auditId}/finding-evidence`);
            if (uploadError || !url) {
                res.status(500).json({
                    error: 'Failed to upload evidence file to storage',
                    details: uploadError?.message
                });
                return;
            }
            evidenceUrl = url;
        }
        // Check if status is being changed to CLOSED
        const isClosed = status === 'CLOSED' && existingFinding.status !== 'CLOSED';
        // Update the finding
        const updatedFinding = await prisma.finding.update({
            where: { id },
            data: {
                title,
                description,
                findingType,
                status,
                priority,
                dueDate: dueDate ? new Date(dueDate) : null,
                assignedToId,
                evidence: evidenceUrl,
                // If status is changing to CLOSED, set closedAt date
                closedAt: isClosed ? new Date() : existingFinding.closedAt,
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
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
            action: 'FINDING_UPDATED',
            details: `Updated finding: ${updatedFinding.title} for audit: ${existingFinding.audit.name}`,
        });
        // If assignee changed, notify new assignee
        if (assignedToId && assignedToId !== existingFinding.assignedToId) {
            await prisma.auditNotification.create({
                data: {
                    auditId: existingFinding.auditId,
                    userId: assignedToId,
                    title: `Finding Assigned: ${updatedFinding.title}`,
                    message: `You have been assigned to address a ${updatedFinding.findingType.toLowerCase()} finding in audit: ${existingFinding.audit.name}`,
                    isRead: false,
                    sentAt: new Date(),
                },
            });
        }
        res.status(200).json({
            message: 'Finding updated successfully',
            finding: updatedFinding,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.updateFinding = updateFinding;
// Create an inspection area checklist
const createInspectionChecklist = async (req, res) => {
    try {
        const { auditId } = req.params;
        const { areaName, items } = req.body;
        // Check if audit exists
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
        });
        if (!audit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        // Create inspection checklist items in a transaction
        const checklistItems = await prisma.$transaction(items.map((item) => prisma.auditInspectionItem.create({
            data: {
                auditId,
                areaName,
                itemName: item.itemName,
                description: item.description,
                standardReference: item.standardReference || null,
                // ✅ Inspection results - set defaults until actually inspected
                isCompliant: null, // Not inspected yet
                comments: null, // No comments yet
                evidence: null, // No evidence yet  
                inspectedById: null, // Not inspected by anyone yet       // Not inspected yet
            },
        })));
        // Log activity
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'INSPECTION_CHECKLIST_CREATED',
            details: `Created inspection checklist for ${areaName} with ${items.length} items in audit: ${audit.name}`,
        });
        res.status(201).json({
            message: 'Inspection checklist created successfully',
            areaName,
            items: checklistItems,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.createInspectionChecklist = createInspectionChecklist;
const getInspectionChecklists = async (req, res) => {
    try {
        const { auditId } = req.params;
        // Check if audit exists
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
        });
        if (!audit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Group items by area
        const items = await prisma.auditInspectionItem.findMany({
            where: { auditId },
            include: {
                inspectedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                { areaName: 'asc' },
                { createdAt: 'asc' },
            ],
        });
        // Group items by area
        const areas = {};
        items.forEach(item => {
            if (!areas[item.areaName]) {
                areas[item.areaName] = [];
            }
            areas[item.areaName].push(item);
        });
        // Convert to array of areas
        const checklists = Object.keys(areas).map(areaName => ({
            areaName,
            items: areas[areaName],
            totalItems: areas[areaName].length,
            compliantItems: areas[areaName].filter(item => item.isCompliant).length,
        }));
        res.status(200).json({
            count: checklists.length,
            checklists,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getInspectionChecklists = getInspectionChecklists;
// Complete the execution phase
const completeExecutionPhase = async (req, res) => {
    try {
        const { auditId } = req.params;
        const { summary } = req.body;
        // Check if audit exists
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
        });
        if (!audit) {
            res.status(404).json({ error: 'Audit not found' });
            return;
        }
        // Get findings summary
        const findingsCount = await prisma.finding.groupBy({
            by: ['findingType'],
            where: { auditId },
            _count: true,
        });
        // Update audit with completion info
        const updatedAudit = await prisma.audit.update({
            where: { id: auditId },
            data: {
                status: 'COMPLETED',
                summary,
            },
        });
        // Log activity
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'EXECUTION_PHASE_COMPLETED',
            details: `Completed execution phase for audit: ${audit.name}`,
        });
        res.status(200).json({
            message: 'Audit execution phase completed successfully',
            audit: updatedAudit,
            findingsSummary: findingsCount,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.completeExecutionPhase = completeExecutionPhase;
const updateInspectionItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { isCompliant, comments, evidence } = req.body;
        // Check if inspection item exists
        const existingItem = await prisma.auditInspectionItem.findUnique({
            where: { id: itemId },
            include: { audit: true },
        });
        if (!existingItem) {
            res.status(404).json({ error: 'Inspection item not found' });
            return;
        }
        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        // Handle evidence file upload if provided
        let evidenceUrl = evidence;
        if (req.file) {
            const fileBuffer = req.file.buffer;
            const fileName = req.file.originalname;
            const { url, error: uploadError } = await (0, supabase_1.uploadFileToSupabase)(fileBuffer, fileName, 'audit-evidences', `audit-${existingItem.auditId}/inspection-evidence`);
            if (uploadError || !url) {
                res.status(500).json({
                    error: 'Failed to upload evidence file to storage',
                    details: uploadError?.message
                });
                return;
            }
            evidenceUrl = url;
        }
        let isCompliantBoolean = null;
        if (isCompliant === 'true' || isCompliant === true) {
            isCompliantBoolean = true;
        }
        else if (isCompliant === 'false' || isCompliant === false) {
            isCompliantBoolean = false;
        }
        // Update the inspection item
        const updatedItem = await prisma.auditInspectionItem.update({
            where: { id: itemId },
            data: {
                isCompliant: isCompliantBoolean,
                comments,
                evidence: evidenceUrl,
                inspectedById: req.user.id,
                updatedAt: new Date(),
            },
            include: {
                inspectedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        // Log activity
        await (0, activityLogger_1.createActivityLog)({
            userId: req.user.id,
            action: 'INSPECTION_ITEM_UPDATED',
            details: `Marked "${updatedItem.itemName}" as ${isCompliant ? 'compliant' : 'non-compliant'} in area: ${updatedItem.areaName} for audit: ${existingItem.audit.name}`,
        });
        res.status(200).json({
            message: 'Inspection item updated successfully',
            item: updatedItem,
            // Suggest creating finding if non-compliant
            suggestFinding: !isCompliant,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.updateInspectionItem = updateInspectionItem;
const getInspectionItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const item = await prisma.auditInspectionItem.findUnique({
            where: { id: itemId },
            include: {
                audit: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
                inspectedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!item) {
            res.status(404).json({ error: 'Inspection item not found' });
            return;
        }
        res.status(200).json(item);
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getInspectionItem = getInspectionItem;
