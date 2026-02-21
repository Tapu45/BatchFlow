"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrainingFeedbackForms = exports.getSessionFeedbackForms = exports.uploadFeedbackForm = exports.updateSessionStatus = exports.getSessionAttendance = exports.recordAttendance = exports.deleteTrainingSession = exports.updateTrainingSession = exports.getSessionById = exports.getTrainingSessions = exports.addTrainingSession = exports.uploadFeedbackFormFile = void 0;
const prisma_1 = require("../../generated/prisma");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const supabase_1 = require("../../service/supabase");
const prisma = new prisma_1.PrismaClient();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept PDF, DOC, DOCX, etc.
        const filetypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(file.originalname.toLowerCase().split('.').pop() || '');
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG files are allowed!'));
    }
});
exports.uploadFeedbackFormFile = upload.single('feedbackForm');
/**
 * Add a new training session to an existing training
 */
const addTrainingSession = async (req, res) => {
    try {
        const { trainingId } = req.params;
        const { title, description, startTime, endTime, venue, status = 'SCHEDULED' // Default status
         } = req.body;
        // Validate required fields
        if (!title || !startTime || !endTime || !venue) {
            res.status(400).json({ message: 'Missing required session fields' });
            return;
        }
        // Check if training exists
        const training = await prisma.training.findUnique({
            where: { id: trainingId }
        });
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        const session = await prisma.trainingSession.create({
            data: {
                trainingId,
                title,
                description,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                venue,
                status: status
            }
        });
        // Notify participants about the new session
        // This could be implemented separately for better handling
        res.status(201).json({
            message: 'Training session added successfully',
            data: session
        });
        return;
    }
    catch (error) {
        console.error('Error adding training session:', error);
        res.status(500).json({
            message: 'Failed to add training session',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.addTrainingSession = addTrainingSession;
/**
 * Get all sessions for a specific training
 */
const getTrainingSessions = async (req, res) => {
    try {
        const { trainingId } = req.params;
        // Check if training exists
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            select: { id: true }
        });
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        const sessions = await prisma.trainingSession.findMany({
            where: { trainingId },
            orderBy: { startTime: 'asc' }
        });
        res.status(200).json({
            message: 'Training sessions retrieved successfully',
            data: sessions
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving training sessions:', error);
        res.status(500).json({
            message: 'Failed to retrieve training sessions',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getTrainingSessions = getTrainingSessions;
/**
 * Get session details by ID
 */
const getSessionById = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
            include: {
                training: {
                    select: {
                        title: true,
                        trainerId: true,
                        trainer: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });
        if (!session) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        res.status(200).json({
            message: 'Training session retrieved successfully',
            data: session
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving training session:', error);
        res.status(500).json({
            message: 'Failed to retrieve training session',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getSessionById = getSessionById;
/**
 * Update an existing training session
 */
const updateTrainingSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { title, description, startTime, endTime, venue } = req.body;
        // Check if session exists
        const sessionExists = await prisma.trainingSession.findUnique({
            where: { id: sessionId }
        });
        if (!sessionExists) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        // Create update data with only the provided fields
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (startTime !== undefined)
            updateData.startTime = new Date(startTime);
        if (endTime !== undefined)
            updateData.endTime = new Date(endTime);
        if (venue !== undefined)
            updateData.venue = venue;
        // Update the session
        const updatedSession = await prisma.trainingSession.update({
            where: { id: sessionId },
            data: updateData
        });
        res.status(200).json({
            message: 'Training session updated successfully',
            data: updatedSession
        });
        return;
    }
    catch (error) {
        console.error('Error updating training session:', error);
        res.status(500).json({
            message: 'Failed to update training session',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.updateTrainingSession = updateTrainingSession;
/**
 * Delete a training session
 */
const deleteTrainingSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        // Check if session exists
        const sessionExists = await prisma.trainingSession.findUnique({
            where: { id: sessionId }
        });
        if (!sessionExists) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        // Delete any attendance records for this session
        await prisma.attendance.deleteMany({
            where: { sessionId }
        });
        // Delete the session
        await prisma.trainingSession.delete({
            where: { id: sessionId }
        });
        res.status(200).json({
            message: 'Training session deleted successfully'
        });
        return;
    }
    catch (error) {
        console.error('Error deleting training session:', error);
        res.status(500).json({
            message: 'Failed to delete training session',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.deleteTrainingSession = deleteTrainingSession;
/**
 * Record attendance for a training session with feedback form upload
 */
const recordAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { attendanceRecords } = req.body;
        if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
            res.status(400).json({ message: 'Invalid attendance records' });
            return;
        }
        // Get the session to verify it exists and get the trainingId
        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
            include: {
                training: {
                    select: {
                        status: true
                    }
                }
            }
        });
        if (!session) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        // Check if session is in the past (completed)
        const currentTime = new Date();
        if (session.endTime > currentTime) {
            res.status(400).json({
                message: 'Cannot record attendance for sessions that are not yet completed',
                sessionEndTime: session.endTime,
                currentTime: currentTime
            });
            return;
        }
        // Process attendance records
        const results = await Promise.all(attendanceRecords.map(async (record) => {
            const { userId, status, remarks, signatureUrl, feedbackFormUrl } = record;
            if (!userId || !status) {
                throw new Error(`Invalid attendance record: userId and status are required`);
            }
            // Find the participant by userId (which is participantId in the new schema)
            const participant = await prisma.participant.findUnique({
                where: { id: userId }
            });
            if (!participant) {
                throw new Error(`Participant with ID ${userId} not found`);
            }
            // Check if an attendance record already exists
            const existing = await prisma.attendance.findUnique({
                where: {
                    sessionId_participantId: {
                        sessionId,
                        participantId: userId
                    }
                }
            });
            const attendanceData = {
                status: status,
                remarks,
                signatureUrl,
                updatedAt: new Date()
            };
            // If feedback form is provided, first upload it to training documents
            let feedbackDocument = null;
            if (feedbackFormUrl) {
                // Find the system user (creator of the training or admin) to use as uploader
                const training = await prisma.training.findUnique({
                    where: { id: session.trainingId },
                    select: { createdById: true }
                });
                if (training) {
                    feedbackDocument = await prisma.trainingDocument.create({
                        data: {
                            trainingId: session.trainingId,
                            title: `Feedback form - Session: ${session.title}`,
                            description: `Feedback form submitted by participant for session on ${session.startTime.toLocaleDateString()}`,
                            fileUrl: feedbackFormUrl,
                            documentType: 'FEEDBACK_FORM',
                            uploadedById: training.createdById // Use training creator as uploader instead of participant
                        }
                    });
                }
            }
            if (existing) {
                // Update existing record
                return prisma.attendance.update({
                    where: {
                        sessionId_participantId: {
                            sessionId,
                            participantId: userId
                        }
                    },
                    data: attendanceData,
                    include: {
                        participant: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                });
            }
            else {
                // Create new record
                return prisma.attendance.create({
                    data: {
                        trainingId: session.trainingId,
                        sessionId,
                        participantId: userId,
                        ...attendanceData
                    },
                    include: {
                        participant: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                });
            }
        }));
        // Update training status if all sessions are completed and attendance recorded
        if (session.training.status === 'IN_PROGRESS') {
            const allSessions = await prisma.trainingSession.findMany({
                where: { trainingId: session.trainingId },
                select: { id: true, endTime: true }
            });
            // Check if all sessions are completed
            const allSessionsCompleted = allSessions.every(s => s.endTime < currentTime);
            if (allSessionsCompleted) {
                // Check if attendance has been recorded for all sessions
                const attendanceCount = await prisma.attendance.groupBy({
                    by: ['sessionId'],
                    where: { trainingId: session.trainingId }
                });
                if (attendanceCount.length === allSessions.length) {
                    // Update training status to COMPLETED
                    await prisma.training.update({
                        where: { id: session.trainingId },
                        data: { status: 'COMPLETED' }
                    });
                }
            }
        }
        res.status(200).json({
            message: 'Attendance recorded successfully',
            data: results
        });
        return;
    }
    catch (error) {
        console.error('Error recording attendance:', error);
        res.status(500).json({
            message: 'Failed to record attendance',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.recordAttendance = recordAttendance;
/**
 * Get attendance for a training session
 */
const getSessionAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        // Check if session exists
        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
            select: { id: true, trainingId: true }
        });
        if (!session) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        // Get attendance records with participant details
        const attendance = await prisma.attendance.findMany({
            where: { sessionId },
            include: {
                participant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        organization: true,
                    }
                }
            },
            orderBy: {
                participant: {
                    name: 'asc'
                }
            }
        });
        // Get all participants of this training
        const allParticipants = await prisma.trainingParticipant.findMany({
            where: {
                trainingId: session.trainingId
            },
            include: {
                participant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        organization: true,
                    }
                }
            }
        });
        // Find participants without attendance records
        const recordedParticipantIds = attendance.map(record => record.participantId);
        const missingAttendance = allParticipants.filter(tp => !recordedParticipantIds.includes(tp.participantId)).map(tp => ({
            userId: tp.participantId, // Keep userId for backward compatibility with frontend
            participantId: tp.participantId,
            user: tp.participant // Keep user for backward compatibility with frontend
        }));
        res.status(200).json({
            message: 'Session attendance retrieved successfully',
            data: {
                recorded: attendance.map(record => ({
                    ...record,
                    userId: record.participantId, // Add userId for backward compatibility
                    user: record.participant // Add user property for backward compatibility
                })),
                missing: missingAttendance
            }
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving session attendance:', error);
        res.status(500).json({
            message: 'Failed to retrieve session attendance',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getSessionAttendance = getSessionAttendance;
/**
 * Update session status
 */
const updateSessionStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status } = req.body;
        // Validate status value
        const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'];
        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({
                message: 'Invalid session status',
                validValues: validStatuses
            });
            return;
        }
        // Check if session exists
        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
            include: {
                training: {
                    select: {
                        id: true,
                        title: true,
                        status: true
                    }
                }
            }
        });
        if (!session) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        // Update session status
        const updatedSession = await prisma.trainingSession.update({
            where: { id: sessionId },
            data: { status: status }
        });
        // If session is marked as COMPLETED, check if we should update the training status
        if (status === 'COMPLETED') {
            // Get all sessions for this training
            const allSessions = await prisma.trainingSession.findMany({
                where: { trainingId: session.training.id }
            });
            // Check if all sessions are now completed
            const allSessionsCompleted = allSessions.every(s => s.status === 'COMPLETED');
            if (allSessionsCompleted && session.training.status !== 'COMPLETED') {
                // Update training status to COMPLETED
                await prisma.training.update({
                    where: { id: session.training.id },
                    data: { status: 'COMPLETED' }
                });
            }
        }
        res.status(200).json({
            message: 'Session status updated successfully',
            data: updatedSession
        });
        return;
    }
    catch (error) {
        console.error('Error updating session status:', error);
        res.status(500).json({
            message: 'Failed to update session status',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.updateSessionStatus = updateSessionStatus;
const uploadFeedbackForm = async (req, res) => {
    try {
        const { sessionId, participantId } = req.params;
        const file = req.file;
        if (!file) {
            res.status(400).json({ message: 'No feedback form file uploaded' });
            return;
        }
        // Verify session exists
        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
            include: { training: true }
        });
        if (!session) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        // Verify participant exists and is registered for the training
        const trainingParticipant = await prisma.trainingParticipant.findUnique({
            where: {
                trainingId_participantId: {
                    trainingId: session.trainingId,
                    participantId
                }
            },
            include: {
                participant: true
            }
        });
        if (!trainingParticipant) {
            res.status(404).json({ message: 'Participant not found or not registered for this training' });
            return;
        }
        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }
        // Generate unique filename
        const originalName = file.originalname.replace(/\s+/g, '-');
        const fileName = `${(0, uuid_1.v4)()}-${originalName}`;
        // Upload to Supabase
        const uploadResult = await (0, supabase_1.uploadFileToSupabase)(file.buffer, fileName, 'feedback-forms', // Use 'feedback-forms' bucket
        `sessions/${sessionId}` // Folder structure: sessions/{sessionId}
        );
        if (uploadResult.error || !uploadResult.url) {
            res.status(500).json({
                message: 'Failed to upload feedback form',
                error: uploadResult.error
            });
            return;
        }
        // Check if feedback form already exists
        const existingForm = await prisma.feedbackForm.findUnique({
            where: {
                sessionId_participantId: {
                    sessionId,
                    participantId
                }
            }
        });
        let feedbackForm;
        if (existingForm) {
            // If old form exists, delete the old file from Supabase
            if (existingForm.filePath) {
                await (0, supabase_1.deleteFileFromSupabase)(existingForm.filePath, 'feedback-forms');
            }
            // Update the existing record
            feedbackForm = await prisma.feedbackForm.update({
                where: {
                    sessionId_participantId: {
                        sessionId,
                        participantId
                    }
                },
                data: {
                    fileUrl: uploadResult.url,
                    filePath: uploadResult.path,
                    submittedAt: new Date(),
                    uploadedById: req.user.id
                },
                include: {
                    participant: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    session: {
                        select: {
                            title: true
                        }
                    },
                    uploadedBy: {
                        select: {
                            name: true
                        }
                    }
                }
            });
        }
        else {
            // Create new feedback form record
            feedbackForm = await prisma.feedbackForm.create({
                data: {
                    trainingId: session.trainingId,
                    sessionId,
                    participantId,
                    fileUrl: uploadResult.url,
                    filePath: uploadResult.path,
                    uploadedById: req.user.id
                },
                include: {
                    participant: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    session: {
                        select: {
                            title: true
                        }
                    },
                    uploadedBy: {
                        select: {
                            name: true
                        }
                    }
                }
            });
            // Create notification for trainer about the feedback form submission
            await prisma.trainingNotification.create({
                data: {
                    trainingId: session.trainingId,
                    userId: session.training.trainerId,
                    title: 'New Feedback Form Submission',
                    message: `${trainingParticipant.participant.name} has submitted a feedback form for session "${session.title}".`
                }
            });
        }
        res.status(201).json({
            message: 'Feedback form uploaded successfully',
            data: feedbackForm
        });
        return;
    }
    catch (error) {
        console.error('Error uploading feedback form:', error);
        res.status(500).json({
            message: 'Failed to upload feedback form',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.uploadFeedbackForm = uploadFeedbackForm;
const getSessionFeedbackForms = async (req, res) => {
    try {
        const { sessionId } = req.params;
        // Verify session exists
        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
            select: { id: true }
        });
        if (!session) {
            res.status(404).json({ message: 'Training session not found' });
            return;
        }
        const forms = await prisma.feedbackForm.findMany({
            where: { sessionId },
            orderBy: { submittedAt: 'desc' },
            include: {
                participant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        organization: true
                    }
                },
                uploadedBy: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        res.status(200).json({
            message: 'Feedback forms retrieved successfully',
            data: forms
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving feedback forms:', error);
        res.status(500).json({
            message: 'Failed to retrieve feedback forms',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getSessionFeedbackForms = getSessionFeedbackForms;
const getTrainingFeedbackForms = async (req, res) => {
    try {
        const { trainingId } = req.params;
        // Verify training exists
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            select: { id: true }
        });
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        const forms = await prisma.feedbackForm.findMany({
            where: { trainingId },
            orderBy: { submittedAt: 'desc' },
            include: {
                session: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                participant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        organization: true
                    }
                },
                uploadedBy: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        res.status(200).json({
            message: 'Feedback forms retrieved successfully',
            data: forms
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving feedback forms:', error);
        res.status(500).json({
            message: 'Failed to retrieve feedback forms',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getTrainingFeedbackForms = getTrainingFeedbackForms;
