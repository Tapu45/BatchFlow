"use strict";
/**
 * Scheduled Mail Job
 * Calls all existing mail controllers via internal HTTP requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScheduledMailJob = void 0;
const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const CLIENT_EMAIL = process.env.CLIENT_EMAIL || 'subhamswain8456@gmail.com';
const runScheduledMailJob = async () => {
    console.log('='.repeat(50));
    console.log('Starting Scheduled Mail Job...');
    console.log(`Execution Time: ${new Date().toISOString()}`);
    console.log(`Recipient: ${CLIENT_EMAIL}`);
    console.log('='.repeat(50));
    const results = {
        qualityReports: { success: false, message: '' },
        batches: { success: false, message: '' }
    };
    try {
        // 1. Mail all Quality Reports
        console.log('\n📊 Sending Quality Reports...');
        try {
            const qualityRes = await fetch(`${BASE_URL}/raw/quality-report/mail/all?email=${CLIENT_EMAIL}`);
            const qualityData = await qualityRes.json();
            results.qualityReports = {
                success: qualityData.success || false,
                message: qualityData.message || qualityData.error || 'Unknown'
            };
            console.log(`   ✓ Quality Reports: ${results.qualityReports.message}`);
        }
        catch (err) {
            results.qualityReports = { success: false, message: err.message };
            console.error(`   ✗ Quality Reports Error: ${err.message}`);
        }
        // 2. Mail all Batches (requires auth, so we'll skip auth check for internal calls)
        console.log('\n📦 Sending Batches Report...');
        try {
            const batchRes = await fetch(`${BASE_URL}/batch/batches/mail/all?email=${CLIENT_EMAIL}`, {
                headers: {
                    // Internal system call - you may need to add a system token or bypass auth
                    'x-internal-call': 'true'
                }
            });
            const batchData = await batchRes.json();
            results.batches = {
                success: batchData.success || false,
                message: batchData.message || batchData.error || 'Unknown'
            };
            console.log(`   ✓ Batches: ${results.batches.message}`);
        }
        catch (err) {
            results.batches = { success: false, message: err.message };
            console.error(`   ✗ Batches Error: ${err.message}`);
        }
        console.log('\n' + '='.repeat(50));
        console.log('Scheduled Mail Job Completed!');
        console.log('='.repeat(50));
        return { success: true, results };
    }
    catch (error) {
        console.error('Critical error in scheduled mail job:', error);
        return { success: false, results };
    }
};
exports.runScheduledMailJob = runScheduledMailJob;
exports.default = exports.runScheduledMailJob;
