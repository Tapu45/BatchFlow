"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBulkEmail = exports.sendTransactionalEmail = void 0;
require("dotenv/config");
const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
// Instantiate the client
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const sendTransactionalEmail = async (options) => {
    try {
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = options.subject;
        sendSmtpEmail.htmlContent = options.htmlContent;
        sendSmtpEmail.sender = options.sender || {
            name: "NexInventory",
            email: process.env.EMAIL_FROM || "subhamswain8456@gmail.com"
        };
        sendSmtpEmail.to = options.to;
        if (options.attachment) {
            sendSmtpEmail.attachment = options.attachment;
        }
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully:', data);
        return { success: true, data };
    }
    catch (error) {
        console.error('Error sending email via Brevo:', error);
        return { success: false, error };
    }
};
exports.sendTransactionalEmail = sendTransactionalEmail;
const sendBulkEmail = async (options) => {
    try {
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = options.subject;
        sendSmtpEmail.htmlContent = options.htmlContent;
        sendSmtpEmail.sender = options.sender || {
            name: "NexInventory",
            email: "training@tgaf.com"
        };
        sendSmtpEmail.to = options.to;
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Bulk email sent successfully');
        return { success: true, data };
    }
    catch (error) {
        console.error('Error sending bulk email via Brevo:', error);
        return { success: false, error };
    }
};
exports.sendBulkEmail = sendBulkEmail;
