import { PrismaClient } from '../generated/prisma';
import { sendTransactionalEmail, sendBulkEmail } from '../service/brevomail';
import {
    sendAuditNotification,
    sendCustomNotification,
    NotificationType
} from '../service/auditnotification';

const prisma = new PrismaClient();

// Get client email from environment variable for testing/notifications
const CLIENT_EMAIL = process.env.CLIENT_EMAIL || 'subhamswain8456@gmail.com';

/**
 * Weekly email job that sends automated notifications for:
 * - Upcoming trainings (within next 7 days)
 * - Ongoing and upcoming audits
 * - Pending corrective actions with approaching deadlines
 * - Batch status summaries
 * 
 * All emails are sent to CLIENT_EMAIL from .env
 */

// Send training reminder emails
const sendTrainingReminders = async (): Promise<{ success: boolean; sent: number; errors: number }> => {
    let sent = 0;
    let errors = 0;

    try {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const today = new Date();

        // Get upcoming trainings within next 7 days
        const upcomingTrainings = await prisma.training.findMany({
            where: {
                startDate: {
                    gte: today,
                    lte: nextWeek
                },
                status: {
                    in: ['SCHEDULED', 'IN_PROGRESS']
                }
            },
            include: {
                trainer: {
                    select: { name: true, email: true }
                },
                participants: {
                    include: {
                        participant: {
                            select: { name: true, email: true }
                        }
                    }
                },
                sessions: {
                    orderBy: { startTime: 'asc' },
                    take: 1
                }
            }
        }) as any[];

        console.log(`Found ${upcomingTrainings.length} upcoming trainings for weekly reminder`);

        for (const training of upcomingTrainings) {
            // Collect all participant emails from the Participant relation
            const participantEmails = training.participants
                .filter((p: any) => p.participant?.email)
                .map((p: any) => ({ email: p.participant.email, name: p.participant.name }));

            if (participantEmails.length === 0) continue;

            const trainingDate = training.startDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const sessionTime = training.sessions[0]
                ? `${training.sessions[0].startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${training.sessions[0].endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                : 'Time to be announced';

            const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #00fac8; border-bottom: 2px solid #00fac8; padding-bottom: 10px;">📅 Weekly Training Reminder</h2>
          <p>This is a reminder about an upcoming training session:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #00fac8;">
            <h3 style="margin-top: 0; color: #333;">${training.title}</h3>
            <p><strong>📅 Date:</strong> ${trainingDate}</p>
            <p><strong>🕐 Time:</strong> ${sessionTime}</p>
            <p><strong>📍 Location:</strong> ${training.location}</p>
            <p><strong>👤 Trainer:</strong> ${training.trainer?.name || 'To be announced'}</p>
          </div>
          
          ${training.description ? `<p style="color: #666;">${training.description}</p>` : ''}
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated weekly reminder from the Training Management System.
          </p>
        </div>
      `;

            try {
                // Send to CLIENT_EMAIL for testing/notifications
                await sendTransactionalEmail({
                    to: [{ email: CLIENT_EMAIL, name: 'Admin' }],
                    subject: `📅 Reminder: ${training.title} - ${trainingDate}`,
                    htmlContent
                });
                sent++;
            } catch (err) {
                console.error(`Error sending training reminder for ${training.title}:`, err);
                errors++;
            }
        }

        return { success: true, sent, errors };
    } catch (error) {
        console.error('Error in sendTrainingReminders:', error);
        return { success: false, sent, errors: errors + 1 };
    }
};

// Send audit reminder emails
const sendAuditReminders = async (): Promise<{ success: boolean; sent: number; errors: number }> => {
    let sent = 0;
    let errors = 0;

    try {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const today = new Date();

        // Get upcoming and ongoing audits
        const audits = await prisma.audit.findMany({
            where: {
                OR: [
                    // Upcoming audits starting within next 7 days
                    {
                        status: 'PLANNED',
                        startDate: {
                            gte: today,
                            lte: nextWeek
                        }
                    },
                    // Ongoing audits
                    {
                        status: 'IN_PROGRESS'
                    }
                ]
            },
            include: {
                auditor: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                },
                auditee: {
                    select: { name: true, email: true }
                },
                createdBy: {
                    select: { name: true, email: true }
                }
            }
        });

        console.log(`Found ${audits.length} audits for weekly reminder`);

        for (const audit of audits) {
            const recipients: string[] = [];

            // Add auditor email
            if (audit.auditor?.user?.email) {
                recipients.push(audit.auditor.user.email);
            }

            // Add auditee email
            if (audit.auditee?.email) {
                recipients.push(audit.auditee.email);
            }

            // Add creator email
            if (audit.createdBy?.email) {
                recipients.push(audit.createdBy.email);
            }

            if (recipients.length === 0) continue;

            const isUpcoming = audit.status === 'PLANNED';
            const statusMessage = isUpcoming
                ? `This audit is scheduled to start on ${audit.startDate.toLocaleDateString()}`
                : `This audit is currently in progress`;

            try {
                // Send to CLIENT_EMAIL for testing/notifications
                await sendCustomNotification({
                    title: `Audit Reminder: ${audit.name}`,
                    message: `Weekly Reminder: ${statusMessage}. Please ensure all preparations are in place.`,
                    recipients: [CLIENT_EMAIL],
                    ctaLink: `${process.env.APP_URL || 'http://localhost:5173'}/audits/${audit.id}`,
                    ctaText: 'View Audit Details'
                });
                sent++;
            } catch (err) {
                console.error(`Error sending audit reminder for ${audit.name}:`, err);
                errors++;
            }
        }

        return { success: true, sent, errors };
    } catch (error) {
        console.error('Error in sendAuditReminders:', error);
        return { success: false, sent, errors: errors + 1 };
    }
};

// Send corrective action deadline reminders
const sendCorrectiveActionReminders = async (): Promise<{ success: boolean; sent: number; errors: number }> => {
    let sent = 0;
    let errors = 0;

    try {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const today = new Date();

        // Get pending corrective actions with due dates within next 7 days
        const pendingActions = await prisma.correctiveAction.findMany({
            where: {
                status: {
                    in: ['OPEN', 'IN_PROGRESS']
                },
                dueDate: {
                    gte: today,
                    lte: nextWeek
                }
            },
            include: {
                audit: true,
                assignedTo: {
                    select: { name: true, email: true }
                },
                finding: true
            }
        });

        console.log(`Found ${pendingActions.length} pending corrective actions for weekly reminder`);

        for (const action of pendingActions) {
            if (!action.assignedTo?.email) continue;

            const daysUntilDue = Math.ceil((action.dueDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: ${daysUntilDue <= 2 ? '#f44336' : '#ff9800'}; border-bottom: 2px solid ${daysUntilDue <= 2 ? '#f44336' : '#ff9800'}; padding-bottom: 10px;">
            ⚠️ Corrective Action Deadline Reminder
          </h2>
          <p>You have a corrective action that requires attention:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid ${daysUntilDue <= 2 ? '#f44336' : '#ff9800'};">
            <h3 style="margin-top: 0; color: #333;">${action.title}</h3>
            <p><strong>🔍 Related Audit:</strong> ${action.audit.name}</p>
            <p><strong>📋 Status:</strong> ${action.status}</p>
            <p><strong>📅 Due Date:</strong> ${action.dueDate!.toLocaleDateString()}</p>
            <p><strong>⏰ Days Remaining:</strong> <span style="color: ${daysUntilDue <= 2 ? '#f44336' : '#ff9800'}; font-weight: bold;">${daysUntilDue} day(s)</span></p>
          </div>
          
          ${action.description ? `<p><strong>Description:</strong> ${action.description}</p>` : ''}
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated weekly reminder. Please take action to complete this item before the deadline.
          </p>
        </div>
      `;

            try {
                // Send to CLIENT_EMAIL for testing/notifications
                await sendTransactionalEmail({
                    to: [{ email: CLIENT_EMAIL, name: 'Admin' }],
                    subject: `⚠️ Action Required: ${action.title} - Due in ${daysUntilDue} day(s)`,
                    htmlContent
                });
                sent++;
            } catch (err) {
                console.error(`Error sending corrective action reminder for ${action.title}:`, err);
                errors++;
            }
        }

        return { success: true, sent, errors };
    } catch (error) {
        console.error('Error in sendCorrectiveActionReminders:', error);
        return { success: false, sent, errors: errors + 1 };
    }
};

// Send weekly batch summary to managers/admins
const sendBatchWeeklySummary = async (): Promise<{ success: boolean; sent: number; errors: number }> => {
    let sent = 0;
    let errors = 0;

    try {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        // Get batch statistics using Batch model
        const batchStats = await prisma.batch.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        });

        const recentBatches = await prisma.batch.count({
            where: {
                createdAt: {
                    gte: lastWeek
                }
            }
        });

        // Get admin users to send summary
        const adminUsers = await prisma.user.findMany({
            where: {
                Role: {
                    Permission: {
                        some: {
                            OR: [
                                { action: 'manage' },
                                { action: 'view' }
                            ],
                            resource: 'batch'
                        }
                    }
                }
            },
            select: { email: true, name: true }
        });

        if (adminUsers.length === 0) {
            console.log('No admin users found for batch summary');
            return { success: true, sent: 0, errors: 0 };
        }

        const statusCounts = batchStats.reduce((acc: Record<string, number>, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
        }, {} as Record<string, number>);

        const totalBatches = Object.values(statusCounts).reduce((a: number, b: number) => a + b, 0);

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #00fac8; border-bottom: 2px solid #00fac8; padding-bottom: 10px;">📊 Weekly Batch Summary</h2>
        <p>Here's your weekly batch production summary:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #333;">Overview</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Batches:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${totalBatches}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>New This Week:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${recentBatches}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #333;">Status Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${Object.entries(statusCounts).map(([status, count]) => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${status.replace(/_/g, ' ')}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${count}</td>
              </tr>
            `).join('')}
          </table>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          This is an automated weekly summary from the Batch Management System.
        </p>
      </div>
    `;

        try {
            // Send to CLIENT_EMAIL for testing/notifications
            await sendTransactionalEmail({
                to: [{ email: CLIENT_EMAIL, name: 'Admin' }],
                subject: `📊 Weekly Batch Summary - ${new Date().toLocaleDateString()}`,
                htmlContent
            });
            sent++;
        } catch (err) {
            console.error('Error sending batch weekly summary:', err);
            errors++;
        }

        return { success: true, sent, errors };
    } catch (error) {
        console.error('Error in sendBatchWeeklySummary:', error);
        return { success: false, sent, errors: errors + 1 };
    }
};

// Send finding status reminders
const sendFindingReminders = async (): Promise<{ success: boolean; sent: number; errors: number }> => {
    let sent = 0;
    let errors = 0;

    try {
        // Get open findings that need attention
        const openFindings = await prisma.finding.findMany({
            where: {
                status: {
                    in: ['OPEN', 'IN_PROGRESS']
                }
            },
            include: {
                audit: true,
                assignedTo: {
                    select: { name: true, email: true }
                }
            }
        });

        console.log(`Found ${openFindings.length} open findings for weekly reminder`);

        // Group findings by assigned user
        const findingsByUser = openFindings.reduce((acc, finding) => {
            if (finding.assignedTo?.email) {
                if (!acc[finding.assignedTo.email]) {
                    acc[finding.assignedTo.email] = {
                        user: finding.assignedTo,
                        findings: []
                    };
                }
                acc[finding.assignedTo.email].findings.push(finding);
            }
            return acc;
        }, {} as Record<string, { user: { name: string; email: string }; findings: typeof openFindings }>);

        for (const [email, data] of Object.entries(findingsByUser)) {
            const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #ff9800; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">📋 Open Findings Summary</h2>
          <p>Hello ${data.user.name},</p>
          <p>You have <strong>${data.findings.length}</strong> open finding(s) that require attention:</p>
          
          ${data.findings.map(finding => `
            <div style="background-color: #f9f9f9; padding: 15px; margin: 15px 0; border-left: 4px solid #ff9800;">
              <h4 style="margin-top: 0; color: #333;">${finding.title}</h4>
              <p><strong>Audit:</strong> ${finding.audit.name}</p>
              <p><strong>Type:</strong> ${finding.findingType}</p>
              <p><strong>Status:</strong> ${finding.status}</p>
              ${finding.dueDate ? `<p><strong>Due Date:</strong> ${finding.dueDate.toLocaleDateString()}</p>` : ''}
            </div>
          `).join('')}
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated weekly reminder. Please review and address these findings.
          </p>
        </div>
      `;

            try {
                // Send to CLIENT_EMAIL for testing/notifications
                await sendTransactionalEmail({
                    to: [{ email: CLIENT_EMAIL, name: 'Admin' }],
                    subject: `📋 Weekly Findings Summary - ${data.findings.length} Open Item(s)`,
                    htmlContent
                });
                sent++;
            } catch (err) {
                console.error(`Error sending finding reminder to ${email}:`, err);
                errors++;
            }
        }

        return { success: true, sent, errors };
    } catch (error) {
        console.error('Error in sendFindingReminders:', error);
        return { success: false, sent, errors: errors + 1 };
    }
};

// Main weekly email job runner
export const runWeeklyEmailJob = async (): Promise<{
    success: boolean;
    results: {
        trainings: { success: boolean; sent: number; errors: number };
        audits: { success: boolean; sent: number; errors: number };
        correctiveActions: { success: boolean; sent: number; errors: number };
        findings: { success: boolean; sent: number; errors: number };
        batchSummary: { success: boolean; sent: number; errors: number };
    };
}> => {
    console.log('='.repeat(50));
    console.log('Starting Weekly Email Job...');
    console.log(`Execution Time: ${new Date().toISOString()}`);
    console.log('='.repeat(50));

    const results = {
        trainings: { success: false, sent: 0, errors: 0 },
        audits: { success: false, sent: 0, errors: 0 },
        correctiveActions: { success: false, sent: 0, errors: 0 },
        findings: { success: false, sent: 0, errors: 0 },
        batchSummary: { success: false, sent: 0, errors: 0 }
    };

    try {
        // Run all email jobs
        console.log('\n📚 Sending Training Reminders...');
        results.trainings = await sendTrainingReminders();
        console.log(`   ✓ Trainings: ${results.trainings.sent} sent, ${results.trainings.errors} errors`);

        console.log('\n🔍 Sending Audit Reminders...');
        results.audits = await sendAuditReminders();
        console.log(`   ✓ Audits: ${results.audits.sent} sent, ${results.audits.errors} errors`);

        console.log('\n⚠️ Sending Corrective Action Reminders...');
        results.correctiveActions = await sendCorrectiveActionReminders();
        console.log(`   ✓ Corrective Actions: ${results.correctiveActions.sent} sent, ${results.correctiveActions.errors} errors`);

        console.log('\n📋 Sending Finding Reminders...');
        results.findings = await sendFindingReminders();
        console.log(`   ✓ Findings: ${results.findings.sent} sent, ${results.findings.errors} errors`);

        console.log('\n📊 Sending Batch Weekly Summary...');
        results.batchSummary = await sendBatchWeeklySummary();
        console.log(`   ✓ Batch Summary: ${results.batchSummary.sent} sent, ${results.batchSummary.errors} errors`);

        const totalSent = Object.values(results).reduce((acc, r) => acc + r.sent, 0);
        const totalErrors = Object.values(results).reduce((acc, r) => acc + r.errors, 0);

        console.log('\n' + '='.repeat(50));
        console.log('Weekly Email Job Completed!');
        console.log(`Total Emails Sent: ${totalSent}`);
        console.log(`Total Errors: ${totalErrors}`);
        console.log('='.repeat(50));

        return { success: true, results };
    } catch (error) {
        console.error('Critical error in weekly email job:', error);
        return { success: false, results };
    }
};

export default runWeeklyEmailJob;
