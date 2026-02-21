"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInvitationResponse = exports.getAllParticipants = exports.resendParticipantInvite = exports.updateParticipantStatus = exports.removeTrainingParticipant = exports.addTrainingParticipants = exports.getTrainingParticipants = void 0;
const prisma_1 = require("../../generated/prisma");
const trainingnotification_1 = require("../../service/trainingnotification");
const prisma = new prisma_1.PrismaClient();
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
        // Get all participants
        const participants = await prisma.trainingParticipant.findMany({
            where: { trainingId },
            include: {
                participant: true
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
const addTrainingParticipants = async (req, res) => {
    try {
        const { trainingId } = req.params;
        let { participants } = req.body;
        // Handle different input formats
        if (!participants) {
            res.status(400).json({ message: 'No participants provided' });
            return;
        }
        // Check if training exists
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            select: { id: true, title: true }
        });
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        // If a string is provided (CSV or text list), convert it to an array
        if (typeof participants === 'string') {
            // Split by common delimiters (commas, semicolons, newlines)
            participants = participants.split(/[\n,;]/)
                .map(p => p.trim())
                .filter(p => p.length > 0);
        }
        // Ensure we have an array
        if (!Array.isArray(participants)) {
            participants = [participants];
        }
        // Process each participant
        const processedParticipants = [];
        for (const participant of participants) {
            let result;
            // Case 1: Object with email (participant data object)
            if (typeof participant === 'object' && participant.email) {
                result = await addParticipant(trainingId, participant);
            }
            // Case 2: String that looks like an email
            else if (typeof participant === 'string' && participant.includes('@')) {
                // Extract name from email if possible (e.g., john.doe@example.com -> John Doe)
                const emailParts = participant.split('@');
                let name = emailParts[0].replace(/[._-]/g, ' ');
                // Capitalize name parts
                name = name.split(' ')
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                    .join(' ');
                // Create a participant with the email
                result = await addParticipant(trainingId, {
                    name,
                    email: participant.trim()
                });
            }
            // Case 3: Name or other identifier
            else if (typeof participant === 'string') {
                result = {
                    success: false,
                    message: `Unable to process participant "${participant}". Please provide a valid email address.`,
                    data: participant
                };
            }
            else {
                // Invalid format
                result = {
                    success: false,
                    message: 'Invalid participant format',
                    data: participant
                };
            }
            processedParticipants.push(result);
        }
        const successful = processedParticipants.filter(r => r.success);
        const failed = processedParticipants.filter(r => !r.success);
        res.status(201).json({
            message: 'Participants processed',
            data: {
                added: successful.length,
                failed: failed.length > 0 ? failed : undefined,
                participants: successful.map(s => s.data)
            }
        });
        return;
    }
    catch (error) {
        console.error('Error adding training participants:', error);
        res.status(500).json({
            message: 'Failed to add participants',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.addTrainingParticipants = addTrainingParticipants;
async function addParticipant(trainingId, participantData) {
    try {
        const { name, email, phone, organization, position } = participantData;
        if (!name || !email) {
            return {
                success: false,
                message: 'Name and email are required for participants',
                data: participantData
            };
        }
        // Check if participant already exists in database
        let participant = await prisma.participant.findUnique({
            where: { email }
        });
        // Create new participant if needed
        if (!participant) {
            participant = await prisma.participant.create({
                data: {
                    name,
                    email,
                    phone,
                    organization,
                    position
                }
            });
        }
        // Check if already a participant in this training
        const existingParticipant = await prisma.trainingParticipant.findFirst({
            where: {
                trainingId,
                participantId: participant.id
            }
        });
        if (existingParticipant) {
            return {
                success: false,
                message: 'Participant already added to this training',
                data: {
                    id: participant.id,
                    name,
                    email,
                    organization
                }
            };
        }
        // Add participant to training
        const trainingParticipant = await prisma.trainingParticipant.create({
            data: {
                trainingId,
                participantId: participant.id
            }
        });
        // Send invitation
        try {
            await (0, trainingnotification_1.sendExternalTrainingInvite)(participant.email, participant.name, trainingId, participant.id);
            // Update invitation status
            await prisma.trainingParticipant.update({
                where: { id: trainingParticipant.id },
                data: {
                    inviteSent: true,
                    inviteSentAt: new Date()
                }
            });
        }
        catch (emailError) {
            console.error('Error sending email invitation:', emailError);
            // Don't fail the entire operation if email sending fails
            // Just mark the invitation as not sent
        }
        return {
            success: true,
            message: 'Participant added',
            data: {
                id: trainingParticipant.id,
                participantId: participant.id,
                name,
                email,
                phone,
                organization,
                position,
                inviteSent: true,
                inviteSentAt: new Date()
            }
        };
    }
    catch (error) {
        console.error('Error adding participant:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            data: participantData
        };
    }
}
const removeTrainingParticipant = async (req, res) => {
    try {
        const { trainingId, participantId } = req.params;
        // Check if training exists
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            select: { id: true }
        });
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }
        // Find participant in this training
        const trainingParticipant = await prisma.trainingParticipant.findFirst({
            where: {
                trainingId,
                participantId
            }
        });
        if (!trainingParticipant) {
            res.status(404).json({ message: 'Participant not found in this training' });
            return;
        }
        // Delete the participant association
        await prisma.trainingParticipant.delete({
            where: { id: trainingParticipant.id }
        });
        res.status(200).json({
            message: 'Participant removed successfully'
        });
        return;
    }
    catch (error) {
        console.error('Error removing training participant:', error);
        res.status(500).json({
            message: 'Failed to remove participant',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.removeTrainingParticipant = removeTrainingParticipant;
const updateParticipantStatus = async (req, res) => {
    try {
        const { participantId } = req.params;
        const { inviteAccepted } = req.body;
        if (inviteAccepted === undefined) {
            res.status(400).json({ message: 'Invite status is required' });
            return;
        }
        // Check if the participant exists
        const trainingParticipant = await prisma.trainingParticipant.findUnique({
            where: { id: participantId }
        });
        if (!trainingParticipant) {
            res.status(404).json({ message: 'Participant not found' });
            return;
        }
        // Update participant status
        const updatedParticipant = await prisma.trainingParticipant.update({
            where: { id: participantId },
            data: { inviteAccepted }
        });
        res.status(200).json({
            message: 'Participant status updated successfully',
            data: updatedParticipant
        });
        return;
    }
    catch (error) {
        console.error('Error updating participant status:', error);
        res.status(500).json({
            message: 'Failed to update participant status',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.updateParticipantStatus = updateParticipantStatus;
const resendParticipantInvite = async (req, res) => {
    try {
        const { participantId } = req.params;
        // Check if the participant exists
        const trainingParticipant = await prisma.trainingParticipant.findUnique({
            where: { id: participantId },
            include: {
                participant: true,
                training: {
                    select: { id: true, title: true }
                }
            }
        });
        if (!trainingParticipant || !trainingParticipant.participant) {
            res.status(404).json({ message: 'Participant not found' });
            return;
        }
        // Resend invitation
        await (0, trainingnotification_1.sendExternalTrainingInvite)(trainingParticipant.participant.email, trainingParticipant.participant.name, trainingParticipant.trainingId, trainingParticipant.participantId);
        // Update participant record
        const updatedParticipant = await prisma.trainingParticipant.update({
            where: { id: participantId },
            data: {
                inviteSent: true,
                inviteSentAt: new Date()
            }
        });
        res.status(200).json({
            message: 'Invitation resent successfully',
            data: updatedParticipant
        });
        return;
    }
    catch (error) {
        console.error('Error resending participant invitation:', error);
        res.status(500).json({
            message: 'Failed to resend invitation',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.resendParticipantInvite = resendParticipantInvite;
const getAllParticipants = async (req, res) => {
    try {
        const { search, page = '1', limit = '20' } = req.query;
        // Parse pagination parameters
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build where condition
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { organization: { contains: search, mode: 'insensitive' } }
            ];
        }
        // Get count for pagination
        const totalCount = await prisma.participant.count({ where });
        // Get participants
        const participants = await prisma.participant.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { name: 'asc' }
        });
        res.status(200).json({
            message: 'Participants retrieved successfully',
            data: participants,
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
        console.error('Error retrieving participants:', error);
        res.status(500).json({
            message: 'Failed to retrieve participants',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getAllParticipants = getAllParticipants;
const handleInvitationResponse = async (req, res) => {
    try {
        const { token, action } = req.query;
        if (!token) {
            res.status(400).json({ message: 'Invalid or missing token' });
            return;
        }
        // Find the token in the database
        const inviteToken = await prisma.trainingInviteToken.findUnique({
            where: { token: String(token) },
            include: {
                training: {
                    select: {
                        id: true,
                        title: true,
                        startDate: true,
                        location: true,
                        trainer: {
                            select: { name: true }
                        }
                    }
                }
            }
        });
        if (!inviteToken) {
            res.status(400).json({ message: 'Token is invalid' });
            return;
        }
        if (new Date() > inviteToken.expiresAt) {
            res.status(400).json({ message: 'This invitation has expired' });
            return;
        }
        if (inviteToken.used) {
            res.status(400).json({ message: 'This invitation has already been responded to' });
            return;
        }
        // The action can come from the token or from the query parameter
        const isAccepting = action === 'accept' || inviteToken.action === 'ACCEPT';
        // Find the participant by email
        const participant = await prisma.participant.findFirst({
            where: { email: inviteToken.email }
        });
        if (!participant) {
            res.status(404).json({ message: 'Participant not found' });
            return;
        }
        // Find the training participation record
        const trainingParticipant = await prisma.trainingParticipant.findFirst({
            where: {
                trainingId: inviteToken.trainingId,
                participantId: participant.id
            }
        });
        if (!trainingParticipant) {
            res.status(404).json({ message: 'Participant not enrolled in this training' });
            return;
        }
        // Update the participant status
        await prisma.trainingParticipant.update({
            where: { id: trainingParticipant.id },
            data: { inviteAccepted: isAccepting }
        });
        // Mark token as used
        await prisma.trainingInviteToken.update({
            where: { id: inviteToken.id },
            data: { used: true }
        });
        // Format training date
        const trainingDate = inviteToken.training.startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        // Return success HTML page
        const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isAccepting ? 'Invitation Accepted' : 'Invitation Declined'}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          border: 1px solid #e0e0e0;
          border-radius: 5px;
          padding: 20px;
          margin-top: 30px;
        }
        h1 {
          color: ${isAccepting ? '#4CAF50' : '#f44336'};
        }
        .details {
          background-color: #f9f9f9;
          padding: 15px;
          margin: 15px 0;
          border-left: 4px solid #3366cc;
        }
        .button {
          display: inline-block;
          background-color: #3366cc;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${isAccepting ? 'Thank You for Accepting' : 'Invitation Declined'}</h1>
        <p>You have successfully ${isAccepting ? 'accepted' : 'declined'} the invitation to the following training:</p>
        
        <div class="details">
          <h3>${inviteToken.training.title}</h3>
          <p><strong>Date:</strong> ${trainingDate}</p>
          <p><strong>Location:</strong> ${inviteToken.training.location}</p>
          <p><strong>Trainer:</strong> ${inviteToken.training.trainer?.name || 'To be announced'}</p>
        </div>
        
        ${isAccepting ? `
        <p>We look forward to seeing you at the training. You will receive additional information as the date approaches.</p>
        ` : `
        <p>We understand that not all trainings fit your schedule. Please let us know if you would like to be included in future training opportunities.</p>
        `}
        
        <p>If you have any questions, please feel free to contact us.</p>
      </div>
    </body>
    </html>
    `;
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    }
    catch (error) {
        console.error('Error handling invitation response:', error);
        res.status(500).json({
            message: 'Failed to process invitation response',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
exports.handleInvitationResponse = handleInvitationResponse;
