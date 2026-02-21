"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTrainingInvite = exports.sendExternalTrainingInvite = void 0;
const prisma_1 = require("../generated/prisma");
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const prisma = new prisma_1.PrismaClient();
// Set up nodemailer transporter
// For production, use your actual SMTP credentials
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
});
const sendExternalTrainingInvite = async (email, name, trainingId, participantId) => {
    try {
        // Get training details
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            include: {
                sessions: {
                    orderBy: {
                        startTime: 'asc'
                    },
                    take: 1
                },
                trainer: {
                    select: { name: true }
                }
            }
        });
        if (!training) {
            throw new Error('Training not found');
        }
        // Format dates and times in a readable way
        const trainingDate = training.startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const sessionTime = training.sessions[0] ?
            `${training.sessions[0].startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${training.sessions[0].endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` :
            'Time to be announced';
        // Generate secure tokens for accept and decline actions
        const acceptToken = crypto_1.default.randomBytes(32).toString('hex');
        const declineToken = crypto_1.default.randomBytes(32).toString('hex');
        // Store the tokens in the database with a 30-day expiration
        await prisma.trainingInviteToken.create({
            data: {
                token: acceptToken,
                action: 'ACCEPT',
                trainingId,
                participantId,
                email,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            }
        });
        await prisma.trainingInviteToken.create({
            data: {
                token: declineToken,
                action: 'DECLINE',
                trainingId,
                participantId,
                email,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            }
        });
        // Create the base URL without https to avoid SSL issues in development
        const baseUrl = (process.env.APP_URL || 'http://localhost:5173').replace('https://', 'http://');
        // Create HTML email content with token links
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #3366cc;">Training Invitation</h2>
        <p>Hello ${name},</p>
        <p>You have been invited to attend the following training:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #3366cc;">
          <h3 style="margin-top: 0;">${training.title}</h3>
          <p><strong>Date:</strong> ${trainingDate}</p>
          <p><strong>Time:</strong> ${sessionTime}</p>
          <p><strong>Location:</strong> ${training.location}</p>
          <p><strong>Trainer:</strong> ${training.trainer?.name || 'To be announced'}</p>
        </div>
        
        <p>${training.description || ''}</p>
        
        <div style="margin: 25px 0;">
          <a href="${baseUrl}/training/respond?token=${acceptToken}&action=accept" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Accept Invitation
          </a>
          <a href="${baseUrl}/training/respond?token=${declineToken}&action=decline" 
             style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-left: 10px;">
            Decline
          </a>
        </div>
        
        <p>If you have any questions, please contact us.</p>
        <p>Thank you,<br>The Training Team</p>
      </div>
    `;
        // Send the email using nodemailer
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Training System" <training@yourdomain.com>',
            to: email,
            subject: `Invitation: ${training.title}`,
            html: htmlContent,
        };
        await transporter.sendMail(mailOptions);
        return true;
    }
    catch (error) {
        console.error('Error sending external training invite:', error);
        throw error;
    }
};
exports.sendExternalTrainingInvite = sendExternalTrainingInvite;
// Update the internal training invite function to be consistent
const sendTrainingInvite = async (userId, trainingId) => {
    try {
        // Get training details
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            include: {
                sessions: {
                    orderBy: {
                        startTime: 'asc'
                    },
                    take: 1
                },
                trainer: {
                    select: { name: true }
                }
            }
        });
        if (!training) {
            throw new Error('Training not found');
        }
        // Get user details
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Create a notification record in the database
        await prisma.trainingNotification.create({
            data: {
                trainingId,
                userId,
                title: 'Training Invitation',
                message: `You have been invited to attend "${training.title}" starting on ${training.startDate.toLocaleDateString()}.`
            }
        });
        // Format dates and times in a readable way
        const trainingDate = training.startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const sessionTime = training.sessions[0] ?
            `${training.sessions[0].startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${training.sessions[0].endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` :
            'Time to be announced';
        // Generate secure tokens for accept and decline actions for internal users too
        const acceptToken = crypto_1.default.randomBytes(32).toString('hex');
        const declineToken = crypto_1.default.randomBytes(32).toString('hex');
        // Store the tokens in the database with a 30-day expiration
        await prisma.trainingInviteToken.create({
            data: {
                token: acceptToken,
                action: 'ACCEPT',
                trainingId,
                email: user.email,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            }
        });
        await prisma.trainingInviteToken.create({
            data: {
                token: declineToken,
                action: 'DECLINE',
                trainingId,
                email: user.email,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            }
        });
        // Create the base URL without https to avoid SSL issues in development
        const baseUrl = (process.env.APP_URL || 'http://localhost:5173').replace('https://', 'http://');
        // Create HTML email content with links to respond AND a link to view in dashboard
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #3366cc;">Training Invitation</h2>
        <p>Hello ${user.name},</p>
        <p>You have been invited to attend the following training:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #3366cc;">
          <h3 style="margin-top: 0;">${training.title}</h3>
          <p><strong>Date:</strong> ${trainingDate}</p>
          <p><strong>Time:</strong> ${sessionTime}</p>
          <p><strong>Location:</strong> ${training.location}</p>
          <p><strong>Trainer:</strong> ${training.trainer?.name || 'To be announced'}</p>
        </div>
        
        <p>${training.description || ''}</p>
        
        <div style="margin: 25px 0;">
          <a href="${baseUrl}/training/respond?token=${acceptToken}&action=accept" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Accept Invitation
          </a>
          <a href="${baseUrl}/training/respond?token=${declineToken}&action=decline" 
             style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-left: 10px;">
            Decline
          </a>
        </div>
        
        <p>You can also log in to your account to view more details:</p>
        <div style="margin: 15px 0;">
          <a href="${baseUrl}/dashboard/trainings/${trainingId}" 
             style="background-color: #3366cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            View in Dashboard
          </a>
        </div>
        
        <p>If you have any questions, please contact your manager or the training team.</p>
        <p>Thank you,<br>The Training Team</p>
      </div>
    `;
        // Send the email using nodemailer
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Training System" <training@yourdomain.com>',
            to: user.email,
            subject: `Invitation: ${training.title}`,
            html: htmlContent,
        };
        // Always send emails for simplicity during development
        await transporter.sendMail(mailOptions);
        return true;
    }
    catch (error) {
        console.error('Error sending training invite:', error);
        throw error;
    }
};
exports.sendTrainingInvite = sendTrainingInvite;
