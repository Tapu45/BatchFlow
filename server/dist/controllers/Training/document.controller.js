"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSessionDocument = exports.getSessionDocuments = exports.uploadSessionDocument = exports.updateDocumentMetadata = exports.batchDeleteDocuments = exports.getAllDocuments = exports.getTrainingDocuments = exports.getDocumentById = exports.deleteTrainingDocument = exports.uploadTrainingDocuments = exports.handleFileUpload = void 0;
const prisma_1 = require("../../generated/prisma");
const supabase_1 = require("../../service/supabase");
const multer_1 = __importDefault(require("multer"));
const prisma = new prisma_1.PrismaClient();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    }
});
exports.handleFileUpload = upload.single('file');
const uploadTrainingDocuments = async (req, res) => {
    try {
        const { trainingId } = req.params;
        const { title, description, documentType, sessionId } = req.body;
        // Validate required fields
        if (!title || !documentType) {
            res.status(400).json({ message: 'Missing required document fields' });
            return;
        }
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }
        // Check if file was uploaded
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        // If a sessionId is provided, verify that it belongs to the specified training
        if (sessionId) {
            const session = await prisma.trainingSession.findFirst({
                where: {
                    id: sessionId,
                    trainingId: trainingId
                }
            });
            if (!session) {
                res.status(400).json({ message: 'Invalid session ID or session does not belong to this training' });
                return;
            }
        }
        // Determine folder path based on whether this is a general training document or session-specific
        const folderPath = sessionId
            ? `training-${trainingId}/session-${sessionId}`
            : `training-${trainingId}`;
        // Upload file to Supabase
        const result = await (0, supabase_1.uploadFileToSupabase)(req.file.buffer, req.file.originalname, 'training-documents', folderPath);
        if (result.error) {
            res.status(500).json({ message: 'Failed to upload file to storage', error: result.error.message });
            return;
        }
        // Store document information in database
        const document = await prisma.trainingDocument.create({
            data: {
                trainingId,
                sessionId, // This will be null if no sessionId was provided
                title,
                description,
                documentType: documentType,
                fileUrl: result.url,
                filePath: result.path,
                uploadedById: req.user.id
            }
        });
        res.status(201).json({
            message: 'Training document uploaded successfully',
            data: document
        });
        return;
    }
    catch (error) {
        console.error('Error uploading training document:', error);
        res.status(500).json({
            message: 'Failed to upload training document',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.uploadTrainingDocuments = uploadTrainingDocuments;
const deleteTrainingDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        // Check if document exists and get its details
        const document = await prisma.trainingDocument.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                trainingId: true,
                filePath: true,
                uploadedById: true,
                title: true
            }
        });
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        // Authorization check: only admin or the user who uploaded can delete
        if (!req.user || (req.user.id !== document.uploadedById && req.user.role !== 'ADMIN')) {
            res.status(403).json({ message: 'You are not authorized to delete this document' });
            return;
        }
        // Delete file from Supabase storage
        if (document.filePath) {
            const deleteResult = await (0, supabase_1.deleteFileFromSupabase)(document.filePath);
            if (!deleteResult.success) {
                console.warn(`Failed to delete file from storage: ${deleteResult.error ? deleteResult.error.message : 'Unknown error'}`);
                // Continue with database deletion even if storage deletion fails
            }
        }
        // Delete document record from database
        await prisma.trainingDocument.delete({
            where: { id: documentId }
        });
        res.status(200).json({
            message: 'Training document deleted successfully',
            data: { id: documentId, title: document.title }
        });
        return;
    }
    catch (error) {
        console.error('Error deleting training document:', error);
        res.status(500).json({
            message: 'Failed to delete training document',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.deleteTrainingDocument = deleteTrainingDocument;
const getDocumentById = async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await prisma.trainingDocument.findUnique({
            where: { id: documentId },
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        res.status(200).json({
            message: 'Document retrieved successfully',
            data: document
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving document:', error);
        res.status(500).json({
            message: 'Failed to retrieve document',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getDocumentById = getDocumentById;
const getTrainingDocuments = async (req, res) => {
    try {
        const { trainingId } = req.params;
        const { documentType } = req.query;
        // Check if training exists
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            select: { id: true }
        });
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        // Build filter conditions
        const where = { trainingId };
        if (documentType) {
            where.documentType = documentType;
        }
        const documents = await prisma.trainingDocument.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.status(200).json({
            message: 'Training documents retrieved successfully',
            data: documents
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving training documents:', error);
        res.status(500).json({
            message: 'Failed to retrieve training documents',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getTrainingDocuments = getTrainingDocuments;
const getAllDocuments = async (req, res) => {
    try {
        const { page = '1', limit = '20', documentType, search, trainingId, uploadedById, sort = 'createdAt', order = 'desc' } = req.query;
        // Convert pagination params to numbers
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build filter conditions
        const where = {};
        if (documentType) {
            where.documentType = documentType;
        }
        if (trainingId) {
            where.trainingId = trainingId;
        }
        if (uploadedById) {
            where.uploadedById = uploadedById;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        // Determine sort order
        const orderBy = {};
        orderBy[sort] = order;
        // Get total count for pagination
        const totalCount = await prisma.trainingDocument.count({ where });
        // Get documents with pagination and filtering
        const documents = await prisma.trainingDocument.findMany({
            where,
            orderBy,
            skip,
            take: limitNum,
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                training: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });
        res.status(200).json({
            message: 'Documents retrieved successfully',
            data: documents,
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving documents:', error);
        res.status(500).json({
            message: 'Failed to retrieve documents',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getAllDocuments = getAllDocuments;
const batchDeleteDocuments = async (req, res) => {
    try {
        const { documentIds } = req.body;
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            res.status(400).json({ message: 'No document IDs provided' });
            return;
        }
        // Check if user has admin privileges
        if (!req.user || req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Only administrators can perform batch document deletion' });
            return;
        }
        // Get file paths for all documents to be deleted
        const documents = await prisma.trainingDocument.findMany({
            where: { id: { in: documentIds } },
            select: { id: true, filePath: true }
        });
        // Delete files from Supabase storage
        const storageResults = await Promise.all(documents
            .filter(doc => doc.filePath)
            .map(doc => (0, supabase_1.deleteFileFromSupabase)(doc.filePath)));
        // Log any storage deletion failures
        storageResults.forEach((result, index) => {
            if (!result.success) {
                console.warn(`Failed to delete file ${index} from storage: ${result.error ? result.error.message : 'Unknown error'}`);
            }
        });
        // Delete documents from database regardless of storage deletion results
        const deleteResult = await prisma.trainingDocument.deleteMany({
            where: { id: { in: documentIds } }
        });
        res.status(200).json({
            message: 'Documents deleted successfully',
            data: {
                deletedCount: deleteResult.count,
                storageDeletedCount: storageResults.filter(r => r.success).length
            }
        });
        return;
    }
    catch (error) {
        console.error('Error deleting documents:', error);
        res.status(500).json({
            message: 'Failed to delete documents',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.batchDeleteDocuments = batchDeleteDocuments;
const updateDocumentMetadata = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { title, description, documentType } = req.body;
        const document = await prisma.trainingDocument.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                uploadedById: true
            }
        });
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        if (!req.user || (req.user.id !== document.uploadedById && req.user.role !== 'ADMIN')) {
            res.status(403).json({ message: 'You are not authorized to update this document' });
            return;
        }
        const updatedDocument = await prisma.trainingDocument.update({
            where: { id: documentId },
            data: {
                title,
                description,
                documentType
            }
        });
        res.status(200).json({
            message: 'Document metadata updated successfully',
            data: updatedDocument
        });
        return;
    }
    catch (error) {
        console.error('Error updating document metadata:', error);
        res.status(500).json({
            message: 'Failed to update document metadata',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.updateDocumentMetadata = updateDocumentMetadata;
const uploadSessionDocument = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { title, description, documentType = 'COURSE_MATERIAL' } = req.body;
        // Validate required fields
        if (!title) {
            res.status(400).json({ message: 'Missing required document fields' });
            return;
        }
        // Authentication check
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }
        // Check if file was uploaded
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        // Check if session exists
        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
            select: { id: true, trainingId: true }
        });
        if (!session) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        // Upload file to Supabase
        const result = await (0, supabase_1.uploadFileToSupabase)(req.file.buffer, req.file.originalname, 'training-documents', `session-${sessionId}`);
        if (result.error) {
            res.status(500).json({ message: 'Failed to upload file to storage', error: result.error.message });
            return;
        }
        // Store document information in database
        const document = await prisma.trainingDocument.create({
            data: {
                title,
                description,
                documentType: documentType,
                fileUrl: result.url,
                filePath: result.path,
                uploadedById: req.user.id,
                trainingId: session.trainingId,
                sessionId: sessionId // Add this field to the schema
            }
        });
        res.status(201).json({
            message: 'Session document uploaded successfully',
            data: document
        });
        return;
    }
    catch (error) {
        console.error('Error uploading session document:', error);
        res.status(500).json({
            message: 'Failed to upload session document',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.uploadSessionDocument = uploadSessionDocument;
/**
 * Get all documents for a specific training session
 */
const getSessionDocuments = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { documentType } = req.query;
        // Check if session exists
        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
            select: { id: true }
        });
        if (!session) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        // Build filter conditions
        const where = { sessionId };
        if (documentType) {
            where.documentType = documentType;
        }
        const documents = await prisma.trainingDocument.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.status(200).json({
            message: 'Session documents retrieved successfully',
            data: documents
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving session documents:', error);
        res.status(500).json({
            message: 'Failed to retrieve session documents',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getSessionDocuments = getSessionDocuments;
/**
 * Delete a session document
 */
const deleteSessionDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        // Check if document exists and get its details
        const document = await prisma.trainingDocument.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                sessionId: true,
                filePath: true,
                uploadedById: true,
                title: true
            }
        });
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }
        if (!document.sessionId) {
            res.status(400).json({ message: 'This is not a session document' });
            return;
        }
        // Authorization check: only admin or the user who uploaded can delete
        if (!req.user || (req.user.id !== document.uploadedById && req.user.role !== 'ADMIN')) {
            res.status(403).json({ message: 'You are not authorized to delete this document' });
            return;
        }
        // Delete file from Supabase storage
        if (document.filePath) {
            const deleteResult = await (0, supabase_1.deleteFileFromSupabase)(document.filePath);
            if (!deleteResult.success) {
                console.warn(`Failed to delete file from storage: ${deleteResult.error ? deleteResult.error.message : 'Unknown error'}`);
                // Continue with database deletion even if storage deletion fails
            }
        }
        // Delete document record from database
        await prisma.trainingDocument.delete({
            where: { id: documentId }
        });
        res.status(200).json({
            message: 'Session document deleted successfully',
            data: { id: documentId, title: document.title }
        });
        return;
    }
    catch (error) {
        console.error('Error deleting session document:', error);
        res.status(500).json({
            message: 'Failed to delete session document',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.deleteSessionDocument = deleteSessionDocument;
