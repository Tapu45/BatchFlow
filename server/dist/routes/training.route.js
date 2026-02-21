"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const train_controller_1 = require("../controllers/Training/train.controller");
const document_controller_1 = require("../controllers/Training/document.controller");
const participant_controller_1 = require("../controllers/Training/participant.controller");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const session_controller_1 = require("../controllers/Training/session.controller");
const calender_controller_1 = require("../controllers/Training/calender.controller");
const router = express_1.default.Router();
router.get('/respond', participant_controller_1.handleInvitationResponse);
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authenticate);
// Training routes
router.post('/', train_controller_1.createTraining);
router.get('/get', train_controller_1.getAllTrainings);
router.get('/:trainingId', train_controller_1.getTrainingById);
router.post('/:trainingId/feedback', train_controller_1.submitTrainingFeedback);
router.patch('/:trainingId/status', train_controller_1.updateTrainingStatus);
router.put('/:trainingId', train_controller_1.updateTraining);
router.delete('/:trainingId', train_controller_1.deleteTraining);
// Document routes
router.get('/documents/all', document_controller_1.getAllDocuments);
router.post('/documents/batch-delete', document_controller_1.batchDeleteDocuments);
router.post('/:trainingId/documents', document_controller_1.handleFileUpload, document_controller_1.uploadTrainingDocuments);
router.get('/:trainingId/documents', document_controller_1.getTrainingDocuments);
router.get('/documents/:documentId', document_controller_1.getDocumentById);
router.patch('/documents/:documentId', document_controller_1.updateDocumentMetadata);
router.delete('/documents/:documentId', document_controller_1.deleteTrainingDocument);
// Participant routes
router.get('/:trainingId/participants', participant_controller_1.getTrainingParticipants);
router.post('/:trainingId/participants', participant_controller_1.addTrainingParticipants);
router.delete('/:trainingId/participants/:userId', participant_controller_1.removeTrainingParticipant);
router.patch('/:trainingId/participants/:userId/status', participant_controller_1.updateParticipantStatus);
router.post('/:trainingId/participants/:userId/resend-invite', participant_controller_1.resendParticipantInvite);
// Session routes
router.post('/:trainingId/sessions', session_controller_1.addTrainingSession);
router.get('/:trainingId/sessions', session_controller_1.getTrainingSessions);
router.get('/sessions/:sessionId', session_controller_1.getSessionById);
router.patch('/sessions/:sessionId', session_controller_1.updateTrainingSession);
router.delete('/sessions/:sessionId', session_controller_1.deleteTrainingSession);
router.post('/sessions/:sessionId/attendance', session_controller_1.recordAttendance);
router.get('/sessions/:sessionId/attendance', session_controller_1.getSessionAttendance);
router.patch('/sessions/:sessionId/status', session_controller_1.updateSessionStatus);
router.post('/sessions/:sessionId/documents', document_controller_1.handleFileUpload, document_controller_1.uploadSessionDocument);
router.get('/sessions/:sessionId/documents', document_controller_1.getSessionDocuments);
router.delete('/documents/:documentId/session', document_controller_1.deleteSessionDocument);
router.get('/calendar/monthly', calender_controller_1.getMonthlyCalendar);
router.get('/calendar/daily/:date', calender_controller_1.getDailyCalendar);
router.get('/calendar/statistics', calender_controller_1.getCalendarStatistics);
router.put('/calendar/:month/:year/description', calender_controller_1.updateCalendarDescription);
router.post('/sessions/:sessionId/photos', train_controller_1.uploadSessionPhoto, train_controller_1.createSessionPhoto);
router.get('/sessions/:sessionId/photos', train_controller_1.getSessionPhotos);
//router.get('/trainings/:trainingId/photos', getTrainingSessionPhotosByTrainingId);
router.delete('/photos/:photoId', train_controller_1.deleteSessionPhoto);
router.patch('/photos/:photoId', train_controller_1.updateSessionPhotoCaption);
router.post('/sessions/:sessionId/participants/:participantId/feedback', session_controller_1.uploadFeedbackFormFile, session_controller_1.uploadFeedbackForm);
router.get('/sessions/:sessionId/feedback-forms', session_controller_1.getSessionFeedbackForms);
router.get('/trainings/:trainingId/feedback-forms', session_controller_1.getTrainingFeedbackForms);
// Dashboard statistics routes
exports.default = router;
