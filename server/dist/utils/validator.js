"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReportSettings = exports.validatePreAuditChecklist = exports.validateReminder = exports.validateAuditDocument = exports.validateDepartment = exports.validateCorrectiveAction = exports.validateFinding = exports.validateAudit = void 0;
const joi_1 = __importDefault(require("joi"));
// Audit validation schema
const validateAudit = (audit) => {
    const schema = joi_1.default.object({
        name: joi_1.default.string().required(),
        auditType: joi_1.default.string().required().valid('INTERNAL', 'EXTERNAL', 'COMPLIANCE', 'PROCESS', 'QUALITY', 'SAFETY', 'SUPPLIER', 'SYSTEM'),
        status: joi_1.default.string().valid('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED'),
        startDate: joi_1.default.date().required(),
        endDate: joi_1.default.date().allow(null),
        // Handle different fields based on audit type
        auditorId: joi_1.default.string().when('auditType', {
            is: joi_1.default.valid('INTERNAL'),
            then: joi_1.default.string().optional(), // Optional for internal audits
            otherwise: joi_1.default.when('auditorName', {
                is: joi_1.default.exist(),
                then: joi_1.default.string().optional(), // Optional if auditorName exists (for external)
                otherwise: joi_1.default.string().required() // Required for other cases
            })
        }),
        // Fields for internal audits
        auditorUserId: joi_1.default.string().when('auditType', {
            is: 'INTERNAL',
            then: joi_1.default.when('auditorId', {
                is: joi_1.default.exist(),
                then: joi_1.default.string().optional(),
                otherwise: joi_1.default.string().required()
            }),
            otherwise: joi_1.default.string().optional()
        }),
        // Fields for external audits
        auditorName: joi_1.default.string().when('auditType', {
            is: 'EXTERNAL',
            then: joi_1.default.when('auditorId', {
                is: joi_1.default.exist(),
                then: joi_1.default.string().optional(),
                otherwise: joi_1.default.string().required()
            }),
            otherwise: joi_1.default.string().optional()
        }),
        auditorEmail: joi_1.default.string().when('auditType', {
            is: 'EXTERNAL',
            then: joi_1.default.when('auditorId', {
                is: joi_1.default.exist(),
                then: joi_1.default.string().optional(),
                otherwise: joi_1.default.string().required()
            }),
            otherwise: joi_1.default.string().optional()
        }),
        auditeeId: joi_1.default.string().allow(null, ''),
        firmName: joi_1.default.string().allow(null, ''),
        departmentId: joi_1.default.string().allow(null, ''),
        objectives: joi_1.default.string().allow(null, ''),
        scope: joi_1.default.string().allow(null, ''),
        summary: joi_1.default.string().allow(null, ''),
    });
    return schema.validate(audit);
};
exports.validateAudit = validateAudit;
// Finding validation schema
const validateFinding = (finding) => {
    const schema = joi_1.default.object({
        auditId: joi_1.default.string().required(),
        title: joi_1.default.string().required(),
        description: joi_1.default.string().required(),
        findingType: joi_1.default.string().required().valid('OBSERVATION', 'NON_CONFORMITY', 'MAJOR_NON_CONFORMITY', 'OPPORTUNITY_FOR_IMPROVEMENT'),
        status: joi_1.default.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED'),
        priority: joi_1.default.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
        dueDate: joi_1.default.date().allow(null),
        assignedToId: joi_1.default.string().allow(null),
        evidence: joi_1.default.string().allow(null, ''),
    });
    return schema.validate(finding);
};
exports.validateFinding = validateFinding;
// Corrective Action validation schema
const validateCorrectiveAction = (action) => {
    const schema = joi_1.default.object({
        auditId: joi_1.default.string().required(),
        findingId: joi_1.default.string().allow(null),
        title: joi_1.default.string().required(),
        description: joi_1.default.string().required(),
        actionType: joi_1.default.string().required().valid('CORRECTIVE', 'PREVENTIVE'),
        assignedToId: joi_1.default.string().required(),
        dueDate: joi_1.default.date().required(),
        status: joi_1.default.string().valid('OPEN', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED'),
        evidence: joi_1.default.string().allow(null, ''),
        verifiedById: joi_1.default.string().allow(null),
    });
    return schema.validate(action);
};
exports.validateCorrectiveAction = validateCorrectiveAction;
// Department validation schema
const validateDepartment = (department) => {
    const schema = joi_1.default.object({
        name: joi_1.default.string().required(),
        description: joi_1.default.string().allow(null, ''),
    });
    return schema.validate(department);
};
exports.validateDepartment = validateDepartment;
// Audit Document validation schema
const validateAuditDocument = (document) => {
    const schema = joi_1.default.object({
        auditId: joi_1.default.string().required(),
        title: joi_1.default.string().required(),
        description: joi_1.default.string().allow(null, ''),
        documentType: joi_1.default.string().required().valid('CHECKLIST', 'PROCEDURE', 'CERTIFICATE', 'EVIDENCE', 'REPORT', 'OTHER'),
        fileUrl: joi_1.default.string().required(),
        filePath: joi_1.default.string().allow(null, ''),
    });
    return schema.validate(document);
};
exports.validateAuditDocument = validateAuditDocument;
// Reminder validation schema
const validateReminder = (reminder) => {
    const schema = joi_1.default.object({
        auditId: joi_1.default.string().required(),
        title: joi_1.default.string().required(),
        message: joi_1.default.string().required(),
        dueDate: joi_1.default.date().required(),
        status: joi_1.default.string().valid('PENDING', 'SENT', 'DISMISSED'),
        recipientId: joi_1.default.string().required(),
    });
    return schema.validate(reminder);
};
exports.validateReminder = validateReminder;
const validatePreAuditChecklist = (data) => {
    const itemSchema = joi_1.default.object({
        description: joi_1.default.string().required(),
        isCompleted: joi_1.default.boolean().default(false),
        comments: joi_1.default.string().allow(null, ''),
        responsibleId: joi_1.default.string().required(),
        dueDate: joi_1.default.date().allow(null, ''),
    });
    const schema = joi_1.default.object({
        auditId: joi_1.default.string().required(),
        items: joi_1.default.array().items(itemSchema).min(1).required(),
    });
    return schema.validate(data);
};
exports.validatePreAuditChecklist = validatePreAuditChecklist;
// Add these validation schemas
// Report settings validation
const validateReportSettings = (settings) => {
    const schema = joi_1.default.object({
        includeEvidence: joi_1.default.boolean().default(true),
        includeActions: joi_1.default.boolean().default(true),
        includeSummary: joi_1.default.boolean().default(true),
    });
    return schema.validate(settings);
};
exports.validateReportSettings = validateReportSettings;
// Corrective action validation
