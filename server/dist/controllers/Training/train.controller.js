"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSessionPhotoCaption = exports.deleteSessionPhoto = exports.getSessionPhotos = exports.createSessionPhoto = exports.deleteTraining = exports.updateTraining = exports.updateTrainingStatus = exports.getTrainingDocuments = exports.getTrainingParticipants = exports.getTrainingById = exports.getAllTrainings = exports.submitTrainingFeedback = exports.createTraining = exports.uploadSessionPhoto = void 0;
const prisma_1 = require("../../generated/prisma");
const trainingnotification_1 = require("../../service/trainingnotification");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const supabase_1 = require("../../service/supabase");
const prisma = new prisma_1.PrismaClient();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept only images
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(file.originalname.toLowerCase().split('.').pop() || '');
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});
exports.uploadSessionPhoto = upload.single('photo');
const createTraining = async (req, res) => {
    try {
        const { title, description, trainingType, startDate, endDate, location, maxParticipants, trainerId, month, year, calendarDescription, participants, session } = req.body;
        // Validate required fields
        if (!title || !trainingType || !startDate || !endDate || !location || !trainerId) {
            res.status(400).json({ message: 'Missing required training fields' });
            return;
        }
        if (!session || !session.title || !session.startTime || !session.endTime || !session.venue) {
            res.status(400).json({ message: 'Initial session details are required' });
            return;
        }
        // Get or create training calendar for the month
        let trainingCalendar = await prisma.trainingCalendar.findUnique({
            where: {
                month_year: {
                    month,
                    year
                }
            }
        });
        if (!trainingCalendar) {
            trainingCalendar = await prisma.trainingCalendar.create({
                data: {
                    month,
                    year,
                    description: calendarDescription
                }
            });
        }
        // Ensure req.user and req.user.id are defined
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }
        // Start a transaction to create training and related records
        const result = await prisma.$transaction(async (tx) => {
            // Create the training
            const training = await tx.training.create({
                data: {
                    title,
                    description,
                    trainingType: trainingType,
                    status: prisma_1.TrainingStatus.SCHEDULED,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    location,
                    maxParticipants,
                    trainerId,
                    calendarId: trainingCalendar.id,
                    createdById: req.user.id, // Non-null assertion since checked above
                    // Create initial session
                    sessions: {
                        create: {
                            title: session.title,
                            description: session.description,
                            startTime: new Date(session.startTime),
                            endTime: new Date(session.endTime),
                            venue: session.venue
                        }
                    }
                },
                include: {
                    sessions: true,
                    trainer: true
                }
            });
            // Add participants if provided
            if (participants && participants.length > 0) {
                // First, check if these participants already exist or need to be created
                for (const participantData of participants) {
                    let participant;
                    // If it's just an email string, try to find or create a participant
                    if (typeof participantData === 'string') {
                        // Check if a participant with this email already exists
                        participant = await tx.participant.findUnique({
                            where: { email: participantData }
                        });
                        if (!participant) {
                            // Extract name from email if possible
                            const emailParts = participantData.split('@');
                            let name = emailParts[0].replace(/[._-]/g, ' ');
                            // Capitalize name parts
                            name = name.split(' ')
                                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                                .join(' ');
                            // Create a new participant
                            participant = await tx.participant.create({
                                data: {
                                    name,
                                    email: participantData
                                }
                            });
                        }
                        // Add the participant to the training
                        await tx.trainingParticipant.create({
                            data: {
                                trainingId: training.id,
                                participantId: participant.id
                            }
                        });
                    }
                    // If it's an object with participant details
                    else if (typeof participantData === 'object' && participantData.email) {
                        // Check if a participant with this email already exists
                        participant = await tx.participant.findUnique({
                            where: { email: participantData.email }
                        });
                        if (!participant) {
                            // Create a new participant
                            participant = await tx.participant.create({
                                data: {
                                    name: participantData.name || participantData.email.split('@')[0],
                                    email: participantData.email,
                                    phone: participantData.phone,
                                    organization: participantData.organization,
                                    position: participantData.position
                                }
                            });
                        }
                        // Add the participant to the training
                        await tx.trainingParticipant.create({
                            data: {
                                trainingId: training.id,
                                participantId: participant.id
                            }
                        });
                    }
                }
            }
            // Create notification for trainer
            await tx.trainingNotification.create({
                data: {
                    trainingId: training.id,
                    userId: trainerId,
                    title: 'New Training Assignment',
                    message: `You have been assigned as the trainer for "${title}" scheduled from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`
                }
            });
            // Create notification for admin users
            const adminUsers = await tx.user.findMany({
                where: {
                    Role: {
                        name: 'ADMIN'
                    }
                },
                select: { id: true }
            });
            // Batch create notifications for admins
            if (adminUsers.length > 0) {
                await tx.trainingNotification.createMany({
                    data: adminUsers.map(admin => ({
                        trainingId: training.id,
                        userId: admin.id,
                        title: 'New Training Created',
                        message: `A new training "${title}" has been created by ${req.user.email} and scheduled for ${new Date(startDate).toLocaleDateString()}.`
                    }))
                });
            }
            return training;
        });
        // Send invitations to participants after transaction
        if (result.id) {
            // Get all participants to send invitations
            const trainingParticipants = await prisma.trainingParticipant.findMany({
                where: { trainingId: result.id },
                include: { participant: true }
            });
            // Send invites asynchronously
            for (const tp of trainingParticipants) {
                if (tp.participant && tp.participant.email) {
                    // Send email invitation
                    await (0, trainingnotification_1.sendExternalTrainingInvite)(tp.participant.email, tp.participant.name, result.id, tp.participant.id);
                    // Update participant record to reflect invite sent
                    await prisma.trainingParticipant.update({
                        where: { id: tp.id },
                        data: {
                            inviteSent: true,
                            inviteSentAt: new Date()
                        }
                    });
                }
            }
        }
        res.status(201).json({
            message: 'Training created successfully',
            data: result
        });
        return;
    }
    catch (error) {
        console.error('Error creating training:', error);
        res.status(500).json({
            message: 'Failed to create training',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.createTraining = createTraining;
const submitTrainingFeedback = async (req, res) => {
    try {
        const { trainingId } = req.params;
        const { contentRating, trainerRating, materialRating, venueRating, overallRating, comments, suggestedImprovements } = req.body;
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }
        // Find participant record for this user
        let participant = await prisma.participant.findUnique({
            where: { email: req.user.email }
        });
        // If user doesn't exist as a participant, create one
        if (!participant) {
            participant = await prisma.participant.create({
                data: {
                    name: req.user.email,
                    email: req.user.email
                }
            });
        }
        const participantId = participant.id;
        // Validate ratings
        if (!contentRating || !trainerRating || !materialRating || !venueRating || !overallRating) {
            res.status(400).json({ message: 'All rating fields are required' });
            return;
        }
        // Check if participant has already submitted feedback
        const existingFeedback = await prisma.trainingFeedback.findUnique({
            where: {
                trainingId_participantId: {
                    trainingId,
                    participantId
                }
            }
        });
        let feedback;
        if (existingFeedback) {
            // Update existing feedback
            feedback = await prisma.trainingFeedback.update({
                where: {
                    trainingId_participantId: {
                        trainingId,
                        participantId
                    }
                },
                data: {
                    contentRating,
                    trainerRating,
                    materialRating,
                    venueRating,
                    overallRating,
                    comments,
                    suggestedImprovements
                }
            });
        }
        else {
            // Create new feedback
            feedback = await prisma.trainingFeedback.create({
                data: {
                    trainingId,
                    participantId,
                    contentRating,
                    trainerRating,
                    materialRating,
                    venueRating,
                    overallRating,
                    comments,
                    suggestedImprovements
                }
            });
        }
        res.status(200).json({
            message: 'Training feedback submitted successfully',
            data: feedback
        });
        return;
    }
    catch (error) {
        console.error('Error submitting training feedback:', error);
        res.status(500).json({
            message: 'Failed to submit training feedback',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.submitTrainingFeedback = submitTrainingFeedback;
const getAllTrainings = async (req, res) => {
    try {
        const { page = '1', limit = '10', status, trainingType, search, startDate, endDate, trainerId, sort = 'startDate', order = 'desc' } = req.query;
        // Convert pagination params to numbers
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build filter conditions
        const where = {};
        if (status) {
            where.status = status;
        }
        if (trainingType) {
            where.trainingType = trainingType;
        }
        if (trainerId) {
            where.trainerId = trainerId;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (startDate) {
            where.startDate = { gte: new Date(startDate) };
        }
        if (endDate) {
            where.endDate = { lte: new Date(endDate) };
        }
        // Determine sort order
        const orderBy = {};
        orderBy[sort] = order;
        // Get total count for pagination
        const totalCount = await prisma.training.count({ where });
        // Get trainings with pagination, filtering, and sorting
        const trainings = await prisma.training.findMany({
            where,
            orderBy,
            skip,
            take: limitNum,
            include: {
                trainer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                sessions: {
                    orderBy: {
                        startTime: 'asc'
                    }
                },
                _count: {
                    select: {
                        participants: true,
                        documents: true
                    }
                }
            }
        });
        res.status(200).json({
            message: 'Trainings retrieved successfully',
            data: trainings,
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
        console.error('Error retrieving trainings:', error);
        res.status(500).json({
            message: 'Failed to retrieve trainings',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getAllTrainings = getAllTrainings;
const getTrainingById = async (req, res) => {
    try {
        const { trainingId } = req.params;
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            include: {
                trainer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                sessions: {
                    orderBy: {
                        startTime: 'asc'
                    }
                },
                documents: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        uploadedBy: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                participants: {
                    include: {
                        participant: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                organization: true,
                                position: true
                            }
                        }
                    }
                },
                photos: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                calendar: true
            }
        });
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        res.status(200).json({
            message: 'Training retrieved successfully',
            data: training
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving training:', error);
        res.status(500).json({
            message: 'Failed to retrieve training',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getTrainingById = getTrainingById;
const getTrainingParticipants = async (req, res) => {
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
        const participants = await prisma.trainingParticipant.findMany({
            where: { trainingId },
            include: {
                participant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        organization: true,
                        position: true
                    }
                }
            }
        });
        res.status(200).json({
            message: 'Training participants retrieved successfully',
            data: participants
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving training participants:', error);
        res.status(500).json({
            message: 'Failed to retrieve training participants',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getTrainingParticipants = getTrainingParticipants;
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
const updateTrainingStatus = async (req, res) => {
    try {
        const { trainingId } = req.params;
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ message: 'Status is required' });
            return;
        }
        // Check if training exists
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            include: {
                trainer: true,
                createdBy: true
            }
        });
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        // Start a transaction to update training and create notifications
        const result = await prisma.$transaction(async (tx) => {
            // Update training status
            const updatedTraining = await tx.training.update({
                where: { id: trainingId },
                data: {
                    status: status
                }
            });
            // Create notification message based on new status
            let notificationTitle = 'Training Status Update';
            let notificationMessage = '';
            switch (status) {
                case 'SCHEDULED':
                    notificationMessage = `Training "${training.title}" has been scheduled.`;
                    break;
                case 'IN_PROGRESS':
                    notificationMessage = `Training "${training.title}" has started and is now in progress.`;
                    break;
                case 'COMPLETED':
                    notificationMessage = `Training "${training.title}" has been completed. Please submit your feedback.`;
                    break;
                case 'CANCELLED':
                    notificationMessage = `Training "${training.title}" has been cancelled.`;
                    break;
                case 'POSTPONED':
                    notificationMessage = `Training "${training.title}" has been postponed. New dates will be announced soon.`;
                    break;
                default:
                    notificationMessage = `Status of training "${training.title}" has been updated to ${status}.`;
            }
            // Create notification for trainer
            await tx.trainingNotification.create({
                data: {
                    trainingId,
                    userId: training.trainerId,
                    title: notificationTitle,
                    message: notificationMessage
                }
            });
            // Create notification for training creator
            if (training.createdById !== training.trainerId) {
                await tx.trainingNotification.create({
                    data: {
                        trainingId,
                        userId: training.createdById,
                        title: notificationTitle,
                        message: notificationMessage
                    }
                });
            }
            // Create notification for admins
            const adminUsers = await tx.user.findMany({
                where: {
                    Role: {
                        name: 'ADMIN'
                    }
                },
                select: { id: true }
            });
            if (adminUsers.length > 0) {
                await tx.trainingNotification.createMany({
                    data: adminUsers.map(admin => ({
                        trainingId,
                        userId: admin.id,
                        title: notificationTitle,
                        message: notificationMessage
                    }))
                });
            }
            return updatedTraining;
        });
        // For completed trainings, consider sending feedback requests to participants
        if (status === 'COMPLETED') {
            // Get all participants for this training
            const trainingParticipants = await prisma.trainingParticipant.findMany({
                where: {
                    trainingId,
                    participant: {
                        email: { not: undefined }
                    }
                },
                include: {
                    participant: true
                }
            });
            // Here you could implement feedback request emails to all participants
            // This is placeholder for that functionality
        }
        res.status(200).json({
            message: 'Training status updated successfully',
            data: result
        });
        return;
    }
    catch (error) {
        console.error('Error updating training status:', error);
        res.status(500).json({
            message: 'Failed to update training status',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.updateTrainingStatus = updateTrainingStatus;
const updateTraining = async (req, res) => {
    try {
        const { trainingId } = req.params;
        const { title, description, trainingType, startDate, endDate, location, maxParticipants, trainerId, } = req.body;
        // Check if training exists
        const existingTraining = await prisma.training.findUnique({
            where: { id: trainingId },
            include: {
                trainer: true
            }
        });
        if (!existingTraining) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        // Validate required fields
        if (!title || !trainingType || !startDate || !endDate || !location || !trainerId) {
            res.status(400).json({ message: 'Missing required training fields' });
            return;
        }
        // Update the training
        const updatedTraining = await prisma.training.update({
            where: { id: trainingId },
            data: {
                title,
                description,
                trainingType: trainingType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                location,
                maxParticipants,
                trainerId,
                updatedAt: new Date()
            },
            include: {
                trainer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });
        // Create notification if trainer has changed
        if (existingTraining.trainerId !== trainerId) {
            // Notify new trainer
            await prisma.trainingNotification.create({
                data: {
                    trainingId,
                    userId: trainerId,
                    title: 'Training Assignment',
                    message: `You have been assigned as the trainer for "${title}" scheduled from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`
                }
            });
            // Notify previous trainer
            await prisma.trainingNotification.create({
                data: {
                    trainingId,
                    userId: existingTraining.trainerId,
                    title: 'Training Reassignment',
                    message: `You are no longer the trainer for "${title}". The training has been reassigned.`
                }
            });
        }
        res.status(200).json({
            message: 'Training updated successfully',
            data: updatedTraining
        });
        return;
    }
    catch (error) {
        console.error('Error updating training:', error);
        res.status(500).json({
            message: 'Failed to update training',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.updateTraining = updateTraining;
const deleteTraining = async (req, res) => {
    try {
        const { trainingId } = req.params;
        // Check if training exists
        const existingTraining = await prisma.training.findUnique({
            where: { id: trainingId },
            include: {
                sessions: true,
                participants: true,
                documents: true,
                photos: true,
                notifications: true
            }
        });
        if (!existingTraining) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        // Transaction to delete all related records first
        await prisma.$transaction(async (tx) => {
            // Delete attendance records
            for (const session of existingTraining.sessions) {
                await tx.attendance.deleteMany({
                    where: { sessionId: session.id }
                });
            }
            // Delete sessions
            await tx.trainingSession.deleteMany({
                where: { trainingId }
            });
            // Delete participant relationships
            await tx.trainingParticipant.deleteMany({
                where: { trainingId }
            });
            // Delete invite tokens
            await tx.trainingInviteToken.deleteMany({
                where: { trainingId }
            });
            // Delete feedback
            await tx.trainingFeedback.deleteMany({
                where: { trainingId }
            });
            // Delete documents
            await tx.trainingDocument.deleteMany({
                where: { trainingId }
            });
            // Delete photos
            await tx.trainingPhoto.deleteMany({
                where: { trainingId }
            });
            // Delete notifications
            await tx.trainingNotification.deleteMany({
                where: { trainingId }
            });
            // Now delete the training itself
            await tx.training.delete({
                where: { id: trainingId }
            });
        });
        res.status(200).json({
            message: 'Training and all related records deleted successfully'
        });
        return;
    }
    catch (error) {
        console.error('Error deleting training:', error);
        res.status(500).json({
            message: 'Failed to delete training',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.deleteTraining = deleteTraining;
const createSessionPhoto = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { caption } = req.body;
        const file = req.file;
        if (!file) {
            res.status(400).json({ message: 'No photo file uploaded' });
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
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }
        // Upload to Supabase
        const fileName = `${(0, uuid_1.v4)()}-${file.originalname.replace(/\s+/g, '-')}`;
        const uploadResult = await (0, supabase_1.uploadFileToSupabase)(file.buffer, fileName, 'training-photos', // Use 'training-photos' bucket
        `sessions/${sessionId}` // Folder structure: sessions/{sessionId}
        );
        if (uploadResult.error || !uploadResult.url) {
            res.status(500).json({ message: 'Failed to upload photo', error: uploadResult.error });
            return;
        }
        // Create record in database
        const photo = await prisma.trainingSessionPhoto.create({
            data: {
                sessionId,
                photoUrl: uploadResult.url,
                caption: caption || null,
                uploadedById: req.user.id
            },
            include: {
                session: {
                    select: {
                        title: true,
                        trainingId: true
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
        res.status(201).json({
            message: 'Session photo uploaded successfully',
            data: photo
        });
        return;
    }
    catch (error) {
        console.error('Error uploading session photo:', error);
        res.status(500).json({
            message: 'Failed to upload session photo',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.createSessionPhoto = createSessionPhoto;
const getSessionPhotos = async (req, res) => {
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
        const photos = await prisma.trainingSessionPhoto.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        res.status(200).json({
            message: 'Session photos retrieved successfully',
            data: photos
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving session photos:', error);
        res.status(500).json({
            message: 'Failed to retrieve session photos',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getSessionPhotos = getSessionPhotos;
const deleteSessionPhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        // Find photo to delete
        const photo = await prisma.trainingSessionPhoto.findUnique({
            where: { id: photoId }
        });
        if (!photo) {
            res.status(404).json({ message: 'Photo not found' });
            return;
        }
        // Check if user is authorized (admin or the uploader)
        if (!req.user || (req.user.id !== photo.uploadedById && req.user.role !== 'ADMIN')) {
            res.status(403).json({ message: 'You do not have permission to delete this photo' });
            return;
        }
        // Extract file path from photo URL
        const photoUrl = photo.photoUrl;
        const bucketName = 'training-photos';
        // Extract the file path from the URL
        // Example URL: https://xxxx.supabase.co/storage/v1/object/public/training-photos/sessions/abc-123/file.jpg
        // We need: sessions/abc-123/file.jpg
        const urlParts = photoUrl.split(`${bucketName}/`);
        let filePath = '';
        if (urlParts.length > 1) {
            filePath = urlParts[1];
        }
        if (filePath) {
            // Delete from Supabase
            await (0, supabase_1.deleteFileFromSupabase)(filePath, bucketName);
        }
        // Delete from database
        await prisma.trainingSessionPhoto.delete({
            where: { id: photoId }
        });
        res.status(200).json({
            message: 'Session photo deleted successfully'
        });
        return;
    }
    catch (error) {
        console.error('Error deleting session photo:', error);
        res.status(500).json({
            message: 'Failed to delete session photo',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.deleteSessionPhoto = deleteSessionPhoto;
const updateSessionPhotoCaption = async (req, res) => {
    try {
        const { photoId } = req.params;
        const { caption } = req.body;
        if (caption === undefined) {
            res.status(400).json({ message: 'Caption is required' });
            return;
        }
        // Find photo
        const photo = await prisma.trainingSessionPhoto.findUnique({
            where: { id: photoId }
        });
        if (!photo) {
            res.status(404).json({ message: 'Photo not found' });
            return;
        }
        // Check if user is authorized (admin or the uploader)
        if (!req.user || (req.user.id !== photo.uploadedById && req.user.role !== 'ADMIN')) {
            res.status(403).json({ message: 'You do not have permission to update this photo' });
            return;
        }
        // Update caption
        const updatedPhoto = await prisma.trainingSessionPhoto.update({
            where: { id: photoId },
            data: { caption }
        });
        res.status(200).json({
            message: 'Photo caption updated successfully',
            data: updatedPhoto
        });
        return;
    }
    catch (error) {
        console.error('Error updating photo caption:', error);
        res.status(500).json({
            message: 'Failed to update photo caption',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.updateSessionPhotoCaption = updateSessionPhotoCaption;
