"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCustomNotification = exports.sendActionNotification = exports.sendFindingNotification = exports.sendAuditNotification = exports.sendEmailNotification = exports.NotificationType = void 0;
const brevomail_1 = require("./brevomail");
// Template types for different notification scenarios
var NotificationType;
(function (NotificationType) {
    NotificationType["AUDIT_CREATED"] = "audit_created";
    NotificationType["AUDIT_UPDATED"] = "audit_updated";
    NotificationType["AUDIT_STATUS_CHANGED"] = "audit_status_changed";
    NotificationType["FINDING_CREATED"] = "finding_created";
    NotificationType["FINDING_ASSIGNED"] = "finding_assigned";
    NotificationType["ACTION_REQUIRED"] = "action_required";
    NotificationType["ACTION_COMPLETED"] = "action_completed";
    NotificationType["REMINDER"] = "reminder";
    NotificationType["CUSTOM"] = "custom";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// Function to generate email content based on notification type
const generateEmailContent = (type, data) => {
    let subject = '';
    let html = '';
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    switch (type) {
        case NotificationType.AUDIT_CREATED:
            const auditData = data;
            subject = data.subject || `New Audit Created: ${auditData.audit.name}`;
            html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">New Audit Created</h2>
          <p>A new audit has been created in the system.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Audit Name:</strong> ${auditData.audit.name}</p>
            <p><strong>Audit Type:</strong> ${auditData.audit.auditType}</p>
            <p><strong>Start Date:</strong> ${new Date(auditData.audit.startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> ${auditData.audit.endDate ? new Date(auditData.audit.endDate).toLocaleDateString() : 'Not specified'}</p>
            <p><strong>Auditor:</strong> ${auditData.audit.auditor?.name || 'Not assigned'}</p>
            ${auditData.audit.auditee ? `<p><strong>Auditee:</strong> ${auditData.audit.auditee.name}</p>` : ''}
          </div>
          <p>${auditData.message || ''}</p>
          <div style="margin-top: 20px;">
            <a href="${appUrl}/audits/${auditData.audit.id}" style="background-color: #00fac8; color: #000; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Audit Details</a>
          </div>
        </div>
      `;
            break;
        case NotificationType.AUDIT_STATUS_CHANGED:
            const statusData = data;
            subject = data.subject || `Audit Status Updated: ${statusData.audit.name}`;
            html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Audit Status Changed</h2>
          <p>The status of an audit has been updated in the system.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Audit Name:</strong> ${statusData.audit.name}</p>
            <p><strong>New Status:</strong> <span style="color: ${statusData.newStatus === 'COMPLETED' ? 'green' :
                statusData.newStatus === 'IN_PROGRESS' ? 'blue' :
                    statusData.newStatus === 'DELAYED' ? 'orange' :
                        statusData.newStatus === 'CANCELLED' ? 'red' : 'black'};">${statusData.newStatus}</span></p>
          </div>
          <p>${statusData.message || ''}</p>
          <div style="margin-top: 20px;">
            <a href="${appUrl}/audits/${statusData.audit.id}" style="background-color: #00fac8; color: #000; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Audit Details</a>
          </div>
        </div>
      `;
            break;
        case NotificationType.FINDING_CREATED:
        case NotificationType.FINDING_ASSIGNED:
            const findingData = data;
            subject = data.subject || `Audit Finding: ${findingData.finding.title}`;
            html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Audit Finding ${type === NotificationType.FINDING_CREATED ? 'Created' : 'Assigned'}</h2>
          <p>A finding has been ${type === NotificationType.FINDING_CREATED ? 'created' : 'assigned to you'} in the system.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Finding Title:</strong> ${findingData.finding.title}</p>
            <p><strong>Type:</strong> ${findingData.finding.findingType}</p>
            <p><strong>Status:</strong> ${findingData.finding.status}</p>
            <p><strong>Audit:</strong> ${findingData.audit.name}</p>
            ${findingData.assignedTo ? `<p><strong>Assigned To:</strong> ${findingData.assignedTo.name}</p>` : ''}
            ${findingData.finding.dueDate ? `<p><strong>Due Date:</strong> ${new Date(findingData.finding.dueDate).toLocaleDateString()}</p>` : ''}
          </div>
          <p>${findingData.message || ''}</p>
          <div style="margin-top: 20px;">
            <a href="${appUrl}/audits/${findingData.audit.id}/findings/${findingData.finding.id}" style="background-color: #00fac8; color: #000; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Finding Details</a>
          </div>
        </div>
      `;
            break;
        case NotificationType.ACTION_REQUIRED:
        case NotificationType.ACTION_COMPLETED:
            const actionData = data;
            subject = data.subject || `Corrective Action ${type === NotificationType.ACTION_COMPLETED ? 'Completed' : 'Required'}: ${actionData.action.title}`;
            html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Corrective Action ${type === NotificationType.ACTION_COMPLETED ? 'Completed' : 'Required'}</h2>
          <p>${type === NotificationType.ACTION_COMPLETED ? 'A corrective action has been completed.' : 'A corrective action requires your attention.'}</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Action Title:</strong> ${actionData.action.title}</p>
            <p><strong>Status:</strong> ${actionData.action.status}</p>
            <p><strong>Audit:</strong> ${actionData.audit.name}</p>
            ${actionData.assignedTo ? `<p><strong>Assigned To:</strong> ${actionData.assignedTo.name}</p>` : ''}
            ${actionData.completedBy ? `<p><strong>Completed By:</strong> ${actionData.completedBy.name}</p>` : ''}
            ${actionData.action.dueDate ? `<p><strong>Due Date:</strong> ${new Date(actionData.action.dueDate).toLocaleDateString()}</p>` : ''}
          </div>
          <p>${actionData.message || ''}</p>
          <div style="margin-top: 20px;">
            <a href="${appUrl}/audits/${actionData.audit.id}/actions/${actionData.action.id}" style="background-color: #00fac8; color: #000; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Action Details</a>
          </div>
        </div>
      `;
            break;
        case NotificationType.REMINDER:
            const reminderData = data;
            subject = data.subject || `Reminder: Audit - ${reminderData.audit.name}`;
            html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Audit Reminder</h2>
          <p>This is a reminder about an upcoming or ongoing audit.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Audit Name:</strong> ${reminderData.audit.name}</p>
            <p><strong>Audit Type:</strong> ${reminderData.audit.auditType}</p>
            <p><strong>Status:</strong> ${reminderData.audit.status}</p>
            <p><strong>Start Date:</strong> ${new Date(reminderData.audit.startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> ${reminderData.audit.endDate ? new Date(reminderData.audit.endDate).toLocaleDateString() : 'Not specified'}</p>
          </div>
          <p>${reminderData.message || ''}</p>
          <div style="margin-top: 20px;">
            <a href="${appUrl}/audits/${reminderData.audit.id}" style="background-color: #00fac8; color: #000; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Audit Details</a>
          </div>
        </div>
      `;
            break;
        case NotificationType.CUSTOM:
            const customData = data;
            subject = data.subject || customData.title;
            html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">${customData.title}</h2>
          <div style="margin: 20px 0;">
            ${customData.message}
          </div>
          ${customData.ctaLink && customData.ctaText ? `
            <div style="margin-top: 20px;">
              <a href="${customData.ctaLink}" style="background-color: #00fac8; color: #000; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">${customData.ctaText}</a>
            </div>
          ` : ''}
        </div>
      `;
            break;
        default:
            subject = data.subject || 'Audit System Notification';
            html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Audit System Notification</h2>
          <p>You have a new notification from the audit system.</p>
          <p><a href="${appUrl}">View in Audit System</a></p>
        </div>
      `;
    }
    return { subject, html };
};
// Main function to send email notifications
const sendEmailNotification = async (type, data) => {
    try {
        if (!data.recipients || data.recipients.length === 0) {
            console.error('No recipients provided for email notification');
            return false;
        }
        const { subject, html } = generateEmailContent(type, data);
        // Convert recipients to Brevo format
        const toRecipients = data.recipients.map(email => ({ email }));
        const ccRecipients = data.cc?.map(email => ({ email }));
        const bccRecipients = data.bcc?.map(email => ({ email }));
        // Combine all recipients for Brevo (it handles cc/bcc in the to field)
        const allRecipients = [
            ...toRecipients,
            ...(ccRecipients || []),
            ...(bccRecipients || [])
        ];
        const result = await (0, brevomail_1.sendTransactionalEmail)({
            to: allRecipients,
            subject,
            htmlContent: html,
            sender: {
                name: 'TGAF Audit System',
                email: process.env.EMAIL_USER || 'training@tgaf.com'
            }
        });
        if (result.success) {
            console.log('Email notification sent successfully');
            return true;
        }
        else {
            console.error('Failed to send email notification:', result.error);
            return false;
        }
    }
    catch (error) {
        console.error('Error sending email notification:', error);
        return false;
    }
};
exports.sendEmailNotification = sendEmailNotification;
// Controller function to handle audit notifications
const sendAuditNotification = async ({ type, audit, recipients, cc, message, newStatus, subject }) => {
    return (0, exports.sendEmailNotification)(type, {
        recipients,
        cc,
        subject,
        audit,
        message,
        newStatus
    });
};
exports.sendAuditNotification = sendAuditNotification;
// Controller function to handle finding notifications
const sendFindingNotification = async ({ type, finding, audit, recipients, cc, message, assignedTo, subject }) => {
    return (0, exports.sendEmailNotification)(type, {
        recipients,
        cc,
        subject,
        finding,
        audit,
        assignedTo,
        message
    });
};
exports.sendFindingNotification = sendFindingNotification;
// Controller function to handle corrective action notifications
const sendActionNotification = async ({ type, action, audit, finding, recipients, cc, message, assignedTo, completedBy, subject }) => {
    return (0, exports.sendEmailNotification)(type, {
        recipients,
        cc,
        subject,
        action,
        audit,
        finding,
        assignedTo,
        completedBy,
        message
    });
};
exports.sendActionNotification = sendActionNotification;
// Controller function to handle custom notifications
const sendCustomNotification = async ({ title, message, recipients, cc, ctaLink, ctaText, subject }) => {
    return (0, exports.sendEmailNotification)(NotificationType.CUSTOM, {
        recipients,
        cc,
        subject,
        title,
        message,
        ctaLink,
        ctaText
    });
};
exports.sendCustomNotification = sendCustomNotification;
