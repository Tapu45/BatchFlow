"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDraftBatch = exports.getLatestDraftForUser = exports.getDraftBatch = exports.saveDraftBatch = void 0;
const prisma_1 = require("../generated/prisma");
const uuid_1 = require("uuid");
const prisma = new prisma_1.PrismaClient();
function parseDateField(val) {
    if (!val || typeof val !== 'string' || val.trim() === '')
        return null;
    // Accept only valid date strings
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}
function hasMinimumRequiredFields(formData, parameterValues, newProductName) {
    // Check if ALL basic fields are filled
    const allBasicFieldsFilled = formData && ((formData.batchNumber ?? '').toString().trim() !== '' &&
        ((formData.productId ?? '').toString().trim() !== '' || newProductName.trim() !== '') &&
        (formData.dateOfProduction ?? '').toString().trim() !== '' &&
        (formData.bestBeforeDate ?? '').toString().trim() !== '' &&
        (formData.sampleAnalysisStarted ?? '').toString().trim() !== '' &&
        (formData.sampleAnalysisCompleted ?? '').toString().trim() !== '');
    // Check if there are parameter values with actual content
    const hasParameterValues = parameterValues && parameterValues.length > 0 &&
        parameterValues.some((pv) => pv.value && pv.value.trim() !== '');
    // Only save if ALL basic fields are filled AND at least one parameter is filled
    return allBasicFieldsFilled && hasParameterValues;
}
/**
 * Save or update a batch draft.
 * Only allows saving if ALL basic fields are filled AND at least one parameter is filled.
 */
const saveDraftBatch = async (req, res) => {
    try {
        // Get makerId from authenticated user
        const makerId = req.user?.id;
        if (!makerId) {
            res.status(401).json({ error: 'Unauthorized: No user found' });
            return;
        }
        const { id, formData = {}, parameterValues = [], newProductName = '', ...rest } = req.body;
        // Extract actual parameter values from the data structure
        const actualParameterValues = parameterValues?.values || parameterValues || [];
        // Check if this is a new draft (no existing ID) and validate minimum fields
        const providedId = typeof id === 'string' && id.trim() !== '' ? id : undefined;
        if (!providedId && !hasMinimumRequiredFields(formData, actualParameterValues, newProductName)) {
            // For new drafts, don't save if not all basic fields are filled AND at least one parameter
            res.status(400).json({ error: 'Cannot save draft: All basic fields must be filled and at least one parameter must be filled' });
            return;
        }
        // Prepare draft data, only including fields that are present
        const draftData = {
            ...formData,
            makerId,
            parameterValues: actualParameterValues && actualParameterValues.length > 0 ? parameterValues : undefined,
            newProductName: newProductName || undefined,
            status: 'DRAFT',
            updatedAt: new Date(),
            ...rest,
        };
        // Remove empty string fields and convert them to undefined (so Prisma will store null)
        Object.keys(draftData).forEach((key) => {
            if (draftData[key] === '')
                draftData[key] = undefined;
        });
        // Convert date fields to Date or null
        draftData.dateOfProduction = parseDateField(draftData.dateOfProduction);
        draftData.bestBeforeDate = parseDateField(draftData.bestBeforeDate);
        draftData.sampleAnalysisStarted = parseDateField(draftData.sampleAnalysisStarted);
        draftData.sampleAnalysisCompleted = parseDateField(draftData.sampleAnalysisCompleted);
        const idToUse = providedId ?? (0, uuid_1.v4)();
        let draft;
        if (providedId) {
            draft = await prisma.batchDraft.upsert({
                where: { id: providedId },
                update: { ...draftData },
                create: { ...draftData, id: providedId },
            });
        }
        else {
            draft = await prisma.batchDraft.create({
                data: { ...draftData, id: idToUse },
            });
        }
        res.status(200).json(draft);
    }
    catch (error) {
        console.error('Error saving draft batch:', error);
        res.status(500).json({ error: 'Failed to save draft' });
    }
};
exports.saveDraftBatch = saveDraftBatch;
/**
 * Get a batch draft by ID.
 */
const getDraftBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const draft = await prisma.batchDraft.findUnique({ where: { id } });
        if (!draft) {
            res.status(404).json({ error: 'Draft not found' });
            return;
        }
        res.status(200).json(draft);
    }
    catch (error) {
        console.error('Error loading draft batch:', error);
        res.status(500).json({ error: 'Failed to load draft' });
    }
};
exports.getDraftBatch = getDraftBatch;
const getLatestDraftForUser = async (req, res) => {
    try {
        const makerId = req.user?.id;
        if (!makerId) {
            res.status(401).json({ error: 'Unauthorized: No user found' });
            return;
        }
        const draft = await prisma.batchDraft.findFirst({
            where: { makerId },
            orderBy: { updatedAt: 'desc' },
        });
        if (!draft) {
            res.status(404).json({ error: 'No draft found' });
            return;
        }
        res.status(200).json(draft);
    }
    catch (error) {
        console.error('Error loading latest draft:', error);
        res.status(500).json({ error: 'Failed to load draft' });
    }
};
exports.getLatestDraftForUser = getLatestDraftForUser;
// Add this method at the end of the file
const deleteDraftBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const makerId = req.user?.id;
        if (!makerId) {
            res.status(401).json({ error: 'Unauthorized: No user found' });
            return;
        }
        // Verify the draft belongs to the user
        const draft = await prisma.batchDraft.findUnique({
            where: { id }
        });
        if (!draft) {
            res.status(404).json({ error: 'Draft not found' });
            return;
        }
        if (draft.makerId !== makerId) {
            res.status(403).json({ error: 'Forbidden: You can only delete your own drafts' });
            return;
        }
        await prisma.batchDraft.delete({
            where: { id }
        });
        res.status(200).json({ message: 'Draft deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting draft batch:', error);
        res.status(500).json({ error: 'Failed to delete draft' });
    }
};
exports.deleteDraftBatch = deleteDraftBatch;
