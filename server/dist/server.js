"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const batch_route_1 = __importDefault(require("./routes/batch.route"));
const standard_route_1 = __importDefault(require("./routes/standard.route"));
const product_route_1 = __importDefault(require("./routes/product.route"));
const dashboard_route_1 = __importDefault(require("./routes/dashboard.route"));
const training_route_1 = __importDefault(require("./routes/training.route"));
const audit_route_1 = __importDefault(require("./routes/audit.route"));
const raw_route_1 = __importDefault(require("./routes/raw.route"));
const draft_route_1 = __importDefault(require("./routes/draft.route"));
const updateauditstatus_1 = require("./jobs/updateauditstatus");
const app = (0, express_1.default)();
const PORT = process.env.PORT;
// Middleware
app.use((0, cors_1.default)({
    origin: [
        'https://tgaf.inventory.nexusinfotech.co',
        'http://localhost:5173',
        'https://batch-flow-one.vercel.app' // <-- Add this line
    ],
    credentials: true,
}));
app.use(express_1.default.json());
// Routes
app.use('/auth', auth_route_1.default);
app.use('/batch', batch_route_1.default);
app.use('/standard', standard_route_1.default);
app.use('/product', product_route_1.default);
app.use('/dashboard', dashboard_route_1.default);
app.use('/training', training_route_1.default);
app.use('/audit', audit_route_1.default);
app.use('/raw', raw_route_1.default);
app.use('/draft', draft_route_1.default);
// Schedule background jobs
// Run once at startup and then every 6 hours
// This frequency balances timely updates with minimal performance impact
// cron.schedule('0 */6 * * *', async () => {
//   console.log('Running scheduled audit status update job...');
//   try {
//     const result = await updateAuditStatuses();
//     console.log('Audit status update result:', result);
//   } catch (err) {
//     console.error('Failed to run audit status update job:', err);
//   }
// });
// Also run once at server startup to ensure statuses are updated immediately
// Delay execution to allow database to wake up (Neon databases auto-pause)
setTimeout(async () => {
    console.log('Running initial audit status update job at server startup...');
    try {
        const result = await (0, updateauditstatus_1.updateAuditStatuses)();
        console.log('Initial audit status update result:', result);
    }
    catch (err) {
        console.error('Failed to run initial audit status update job:', err);
    }
}, 5000); // Wait 5 seconds before running
// Schedule mail job - Runs every 1 minute (FOR TESTING)
// TODO: Change back to '0 9 * * 1' for production (Monday at 9 AM)
// cron.schedule('*/1 * * * *', async () => {
//   console.log('Running scheduled mail job...');
//   try {
//     const result = await runScheduledMailJob();
//     console.log('Scheduled mail job result:', result);
//   } catch (err) {
//     console.error('Failed to run scheduled mail job:', err);
//   }
// });
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
