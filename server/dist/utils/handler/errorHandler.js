"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleApiError = void 0;
const prisma_1 = require("../../generated/prisma");
const handleApiError = (error, res) => {
    console.error('API Error:', error);
    // Check for Prisma errors
    if (error instanceof prisma_1.Prisma.PrismaClientKnownRequestError) {
        // Handle known Prisma errors
        switch (error.code) {
            case 'P2002':
                return res.status(409).json({
                    error: 'A record with this information already exists.',
                    details: error.meta?.target || 'Unique constraint violation',
                });
            case 'P2025':
                return res.status(404).json({
                    error: 'Record not found',
                    details: error.meta?.cause || 'The requested resource does not exist',
                });
            default:
                return res.status(400).json({
                    error: 'Database operation failed',
                    code: error.code,
                    details: error.message,
                });
        }
    }
    // Handle validation errors
    if (error.name === 'ValidationError' || error.details) {
        return res.status(400).json({
            error: 'Validation error',
            details: error.details || error.message,
        });
    }
    // Handle other types of errors
    return res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
    });
};
exports.handleApiError = handleApiError;
