"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditReports = exports.generateAuditReport = void 0;
const prisma_1 = require("../../generated/prisma");
const errorHandler_1 = require("../../utils/handler/errorHandler");
const activityLogger_1 = require("../../utils/handler/activityLogger");
const validator_1 = require("../../utils/validator");
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supabase_1 = require("../../service/supabase");
const prisma = new prisma_1.PrismaClient();
// Generate an audit report
const generateAuditReport = async (req, res) => {
    try {
        const { auditId } = req.params;
        const { includeEvidence, includeActions, includeSummary } = req.body;
        // Validate report settings
        const { error } = (0, validator_1.validateReportSettings)(req.body);
        if (error) {
            res.status(400).json({ error: error.details[0].message });
            return;
        }
        // Check if audit exists
        const audit = await prisma.audit.findUnique({
            where: { id: auditId },
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
                        actions: true,
                    },
                    orderBy: {
                        findingType: 'desc', // Order by severity (MAJOR_NON_CONFORMITY first)
                    },
                },
                inspectionItems: {
                    include: {
                        inspectedBy: {
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
        // Group findings by type for the report
        const findingsByType = {
            MAJOR_NON_CONFORMITY: [],
            NON_CONFORMITY: [],
            OBSERVATION: [],
            OPPORTUNITY_FOR_IMPROVEMENT: [],
        };
        audit.findings.forEach(finding => {
            findingsByType[finding.findingType].push(finding);
        });
        // Group inspection items by area
        const inspectionsByArea = {};
        audit.inspectionItems.forEach(item => {
            if (!inspectionsByArea[item.areaName]) {
                inspectionsByArea[item.areaName] = [];
            }
            inspectionsByArea[item.areaName].push(item);
        });
        // Generate report filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFileName = `audit-report-${audit.id}-${timestamp}.pdf`;
        const reportPath = path_1.default.join(__dirname, '../../../../temp', reportFileName);
        // Ensure temp directory exists
        if (!fs_1.default.existsSync(path_1.default.join(__dirname, '../../../../temp'))) {
            fs_1.default.mkdirSync(path_1.default.join(__dirname, '../../../../temp'), { recursive: true });
        }
        // Create PDF document
        const doc = new pdfkit_1.default({ margin: 50 });
        const stream = fs_1.default.createWriteStream(reportPath);
        doc.pipe(stream);
        // Add header
        doc.fontSize(24).text('Audit Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text(audit.name, { align: 'center' });
        doc.moveDown();
        // Add audit details
        doc.fontSize(12).text(`Audit Type: ${audit.auditType}`);
        doc.text(`Status: ${audit.status}`);
        doc.text(`Start Date: ${audit.startDate.toDateString()}`);
        if (audit.endDate)
            doc.text(`End Date: ${audit.endDate.toDateString()}`);
        doc.text(`Auditor: ${audit.auditor.name}`);
        if (audit.auditee)
            doc.text(`Auditee: ${audit.auditee.name}`);
        if (audit.department)
            doc.text(`Department: ${audit.department.name}`);
        doc.moveDown();
        // Add objectives and scope
        if (audit.objectives) {
            doc.fontSize(14).text('Objectives:');
            doc.fontSize(12).text(audit.objectives);
            doc.moveDown();
        }
        if (audit.scope) {
            doc.fontSize(14).text('Scope:');
            doc.fontSize(12).text(audit.scope);
            doc.moveDown();
        }
        // Add summary if requested
        if (includeSummary && audit.summary) {
            doc.fontSize(14).text('Summary:');
            doc.fontSize(12).text(audit.summary);
            doc.moveDown();
        }
        // Add findings section
        doc.fontSize(16).text('Findings', { underline: true });
        doc.moveDown();
        // Major Non-Conformities
        if (findingsByType.MAJOR_NON_CONFORMITY.length > 0) {
            doc.fontSize(14).text('Major Non-Conformities', { underline: true });
            doc.moveDown();
            findingsByType.MAJOR_NON_CONFORMITY.forEach((finding, index) => {
                doc.fontSize(12).text(`${index + 1}. ${finding.title}`);
                doc.fontSize(10).text(finding.description);
                doc.text(`Status: ${finding.status}`);
                if (finding.dueDate)
                    doc.text(`Due Date: ${finding.dueDate.toDateString()}`);
                if (finding.assignedTo)
                    doc.text(`Assigned To: ${finding.assignedTo.name}`);
                // Add actions if requested
                if (includeActions && finding.actions.length > 0) {
                    doc.text('Corrective Actions:');
                    finding.actions.forEach((action, actionIndex) => {
                        doc.text(`  ${actionIndex + 1}. ${action.title} (${action.status})`);
                        if (action.dueDate)
                            doc.text(`     Due: ${new Date(action.dueDate).toDateString()}`);
                    });
                }
                doc.moveDown();
            });
        }
        // Non-Conformities
        if (findingsByType.NON_CONFORMITY.length > 0) {
            doc.fontSize(14).text('Non-Conformities', { underline: true });
            doc.moveDown();
            findingsByType.NON_CONFORMITY.forEach((finding, index) => {
                doc.fontSize(12).text(`${index + 1}. ${finding.title}`);
                doc.fontSize(10).text(finding.description);
                doc.text(`Status: ${finding.status}`);
                if (finding.dueDate)
                    doc.text(`Due Date: ${finding.dueDate.toDateString()}`);
                if (finding.assignedTo)
                    doc.text(`Assigned To: ${finding.assignedTo.name}`);
                // Add actions if requested
                if (includeActions && finding.actions.length > 0) {
                    doc.text('Corrective Actions:');
                    finding.actions.forEach((action, actionIndex) => {
                        doc.text(`  ${actionIndex + 1}. ${action.title} (${action.status})`);
                        if (action.dueDate)
                            doc.text(`     Due: ${new Date(action.dueDate).toDateString()}`);
                    });
                }
                doc.moveDown();
            });
        }
        // Observations
        if (findingsByType.OBSERVATION.length > 0) {
            doc.fontSize(14).text('Observations', { underline: true });
            doc.moveDown();
            findingsByType.OBSERVATION.forEach((finding, index) => {
                doc.fontSize(12).text(`${index + 1}. ${finding.title}`);
                doc.fontSize(10).text(finding.description);
                doc.moveDown();
            });
        }
        // Opportunities for Improvement
        if (findingsByType.OPPORTUNITY_FOR_IMPROVEMENT.length > 0) {
            doc.fontSize(14).text('Opportunities for Improvement', { underline: true });
            doc.moveDown();
            findingsByType.OPPORTUNITY_FOR_IMPROVEMENT.forEach((finding, index) => {
                doc.fontSize(12).text(`${index + 1}. ${finding.title}`);
                doc.fontSize(10).text(finding.description);
                doc.moveDown();
            });
        }
        // Add inspection areas
        doc.fontSize(16).text('Inspection Areas', { underline: true });
        doc.moveDown();
        Object.keys(inspectionsByArea).forEach(areaName => {
            const items = inspectionsByArea[areaName];
            const compliantCount = items.filter((item) => item.isCompliant).length;
            const complianceRate = Math.round((compliantCount / items.length) * 100);
            doc.fontSize(14).text(`${areaName} (${complianceRate}% Compliant)`, { underline: true });
            doc.moveDown();
            items.forEach((item, index) => {
                doc.fontSize(12).text(`${index + 1}. ${item.itemName} - ${item.isCompliant ? '✓ Compliant' : '✗ Non-Compliant'}`);
                if (item.description)
                    doc.fontSize(10).text(`Standard: ${item.description}`);
                if (item.standardReference)
                    doc.text(`Reference: ${item.standardReference}`);
                if (item.comments)
                    doc.text(`Comments: ${item.comments}`);
                doc.moveDown(0.5);
            });
            doc.moveDown();
        });
        // Add conclusion
        doc.fontSize(16).text('Conclusion', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(`This audit identified ${findingsByType.MAJOR_NON_CONFORMITY.length} major non-conformities, ${findingsByType.NON_CONFORMITY.length} non-conformities, and ${findingsByType.OPPORTUNITY_FOR_IMPROVEMENT.length} opportunities for improvement.`);
        doc.text(`Major non-conformities must be addressed within 30 days. Follow-up verification will be conducted after corrective actions are implemented.`);
        // Add signature
        doc.moveDown(2);
        doc.fontSize(12).text(`Report Generated: ${new Date().toDateString()}`);
        doc.text(`Generated By: ${req.user?.email || 'System'}`);
        // Finalize the PDF
        doc.end();
        // Wait for the PDF writing to complete
        stream.on('finish', async () => {
            try {
                // Upload the PDF to Supabase storage
                const fileBuffer = fs_1.default.readFileSync(reportPath);
                const { url, path: storagePath, error: uploadError } = await (0, supabase_1.uploadFileToSupabase)(fileBuffer, reportFileName, 'audit-reports', `audit-${auditId}`);
                if (uploadError || !url) {
                    res.status(500).json({
                        error: 'Failed to upload report to storage',
                        details: uploadError?.message
                    });
                    return;
                }
                // Create document record in database
                const report = await prisma.auditDocument.create({
                    data: {
                        auditId,
                        title: `Audit Report - ${new Date().toLocaleDateString()}`,
                        description: `Generated report for audit: ${audit.name}`,
                        documentType: 'REPORT',
                        fileUrl: url,
                        filePath: storagePath,
                        uploadedById: req.user?.id || '',
                    },
                    include: {
                        uploadedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                });
                // Log activity
                if (req.user?.id) {
                    await (0, activityLogger_1.createActivityLog)({
                        userId: req.user.id,
                        action: 'REPORT_GENERATED',
                        details: `Generated report for audit: ${audit.name}`,
                    });
                }
                // Remove the temporary file
                fs_1.default.unlinkSync(reportPath);
                res.status(201).json({
                    message: 'Audit report generated successfully',
                    report,
                });
                return;
            }
            catch (error) {
                // Handle errors during post-generation
                fs_1.default.unlinkSync(reportPath); // Clean up temp file
                (0, errorHandler_1.handleApiError)(error, res);
                return;
            }
        });
        stream.on('error', (error) => {
            (0, errorHandler_1.handleApiError)(error, res);
            return;
        });
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.generateAuditReport = generateAuditReport;
// Get all reports for an audit
const getAuditReports = async (req, res) => {
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
        // Get report documents
        const reports = await prisma.auditDocument.findMany({
            where: {
                auditId,
                documentType: 'REPORT',
            },
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.status(200).json({
            count: reports.length,
            reports,
        });
        return;
    }
    catch (error) {
        (0, errorHandler_1.handleApiError)(error, res);
        return;
    }
};
exports.getAuditReports = getAuditReports;
