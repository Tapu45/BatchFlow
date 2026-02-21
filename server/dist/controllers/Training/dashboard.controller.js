"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getParticipantEngagementStats = exports.getTrainerStats = exports.getFeedbackStats = exports.getAttendanceStats = exports.getMonthlyTrainingStats = exports.getTrainingSummaryStats = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
/**
 * Get summary statistics for the training dashboard
 * Returns counts of trainings by status, type, upcoming trainings, etc.
 */
const getTrainingSummaryStats = async (req, res) => {
    try {
        // Get total counts by training status
        const statusCounts = await prisma.training.groupBy({
            by: ['status'],
            _count: { id: true }
        });
        // Get total counts by training type
        const typeCounts = await prisma.training.groupBy({
            by: ['trainingType'],
            _count: { id: true }
        });
        // Get upcoming trainings (scheduled in the next 30 days)
        const today = new Date();
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(today.getDate() + 30);
        const upcomingTrainings = await prisma.training.count({
            where: {
                startDate: {
                    gte: today,
                    lte: thirtyDaysLater
                },
                status: 'SCHEDULED'
            }
        });
        // Get trainings in progress
        const inProgressTrainings = await prisma.training.count({
            where: {
                status: 'IN_PROGRESS'
            }
        });
        // Get completed trainings in the last 30 days
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const recentlyCompletedTrainings = await prisma.training.count({
            where: {
                status: 'COMPLETED',
                endDate: {
                    gte: thirtyDaysAgo,
                    lte: today
                }
            }
        });
        // Get total number of participants across all trainings
        const totalParticipants = await prisma.trainingParticipant.count();
        // Format the response
        const summaryStats = {
            statusDistribution: statusCounts.map(item => ({
                status: item.status,
                count: item._count.id
            })),
            typeDistribution: typeCounts.map(item => ({
                type: item.trainingType,
                count: item._count.id
            })),
            upcomingTrainings,
            inProgressTrainings,
            recentlyCompletedTrainings,
            totalParticipants
        };
        res.status(200).json({
            message: 'Training summary statistics retrieved successfully',
            data: summaryStats
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving training summary statistics:', error);
        res.status(500).json({
            message: 'Failed to retrieve training summary statistics',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getTrainingSummaryStats = getTrainingSummaryStats;
/**
 * Get monthly training statistics for the current year
 * Returns number of trainings and participants by month
 */
const getMonthlyTrainingStats = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const { year = currentYear } = req.query;
        // Get all trainings for the specified year
        const trainings = await prisma.training.findMany({
            where: {
                startDate: {
                    gte: new Date(`${year}-01-01`),
                    lt: new Date(`${Number(year) + 1}-01-01`)
                }
            },
            select: {
                id: true,
                startDate: true,
                status: true,
                _count: {
                    select: {
                        participants: true
                    }
                }
            }
        });
        // Initialize monthly data structure
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            monthName: new Date(Number(year), i, 1).toLocaleString('default', { month: 'long' }),
            trainingsCount: 0,
            participantsCount: 0,
            completedTrainings: 0
        }));
        // Populate monthly data
        trainings.forEach(training => {
            const month = training.startDate.getMonth();
            monthlyData[month].trainingsCount += 1;
            monthlyData[month].participantsCount += training._count.participants;
            if (training.status === 'COMPLETED') {
                monthlyData[month].completedTrainings += 1;
            }
        });
        res.status(200).json({
            message: 'Monthly training statistics retrieved successfully',
            data: {
                year: Number(year),
                months: monthlyData
            }
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving monthly training statistics:', error);
        res.status(500).json({
            message: 'Failed to retrieve monthly training statistics',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getMonthlyTrainingStats = getMonthlyTrainingStats;
/**
 * Get attendance statistics
 * Returns attendance rates and distribution by status
 */
const getAttendanceStats = async (req, res) => {
    try {
        // Get attendance counts by status
        const attendanceCounts = await prisma.attendance.groupBy({
            by: ['status'],
            _count: { id: true }
        });
        // Calculate total attendance records
        const totalAttendance = attendanceCounts.reduce((sum, item) => sum + item._count.id, 0);
        // Get completed trainings with attendance data
        const completedTrainings = await prisma.training.findMany({
            where: {
                status: 'COMPLETED'
            },
            select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                _count: {
                    select: {
                        participants: true,
                        attendance: true
                    }
                }
            },
            orderBy: {
                endDate: 'desc'
            },
            take: 10 // Get only the 10 most recent completed trainings
        });
        // Calculate attendance rate for each completed training
        const trainingAttendanceRates = completedTrainings.map(training => {
            const expectedAttendance = training._count.participants;
            const actualAttendance = training._count.attendance;
            const attendanceRate = expectedAttendance > 0
                ? Math.round((actualAttendance / expectedAttendance) * 100)
                : 0;
            return {
                id: training.id,
                title: training.title,
                startDate: training.startDate,
                endDate: training.endDate,
                participantsCount: expectedAttendance,
                attendanceCount: actualAttendance,
                attendanceRate
            };
        });
        // Format the response
        const attendanceStats = {
            statusDistribution: attendanceCounts.map(item => ({
                status: item.status,
                count: item._count.id,
                percentage: totalAttendance > 0
                    ? Math.round((item._count.id / totalAttendance) * 100)
                    : 0
            })),
            totalAttendance,
            trainingAttendanceRates
        };
        res.status(200).json({
            message: 'Attendance statistics retrieved successfully',
            data: attendanceStats
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving attendance statistics:', error);
        res.status(500).json({
            message: 'Failed to retrieve attendance statistics',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getAttendanceStats = getAttendanceStats;
/**
 * Get feedback statistics
 * Returns average ratings across different training aspects
 */
const getFeedbackStats = async (req, res) => {
    try {
        // Get average ratings for all trainings
        const overallAverages = await prisma.trainingFeedback.aggregate({
            _avg: {
                contentRating: true,
                trainerRating: true,
                materialRating: true,
                venueRating: true,
                overallRating: true
            }
        });
        // Get recent trainings with their average ratings
        const recentTrainingsWithFeedback = await prisma.training.findMany({
            where: {
                status: 'COMPLETED',
                feedback: {
                    some: {} // At least one feedback record exists
                }
            },
            select: {
                id: true,
                title: true,
                endDate: true,
                feedback: {
                    select: {
                        contentRating: true,
                        trainerRating: true,
                        materialRating: true,
                        venueRating: true,
                        overallRating: true
                    }
                }
            },
            orderBy: {
                endDate: 'desc'
            },
            take: 10 // Get only the 10 most recent trainings with feedback
        });
        // Calculate average ratings for each training
        const trainingRatings = recentTrainingsWithFeedback.map(training => {
            const feedbackCount = training.feedback.length;
            // Calculate averages for each rating category
            const avgContentRating = training.feedback.reduce((sum, fb) => sum + fb.contentRating, 0) / feedbackCount;
            const avgTrainerRating = training.feedback.reduce((sum, fb) => sum + fb.trainerRating, 0) / feedbackCount;
            const avgMaterialRating = training.feedback.reduce((sum, fb) => sum + fb.materialRating, 0) / feedbackCount;
            const avgVenueRating = training.feedback.reduce((sum, fb) => sum + fb.venueRating, 0) / feedbackCount;
            const avgOverallRating = training.feedback.reduce((sum, fb) => sum + fb.overallRating, 0) / feedbackCount;
            return {
                id: training.id,
                title: training.title,
                endDate: training.endDate,
                feedbackCount,
                ratings: {
                    content: parseFloat(avgContentRating.toFixed(1)),
                    trainer: parseFloat(avgTrainerRating.toFixed(1)),
                    material: parseFloat(avgMaterialRating.toFixed(1)),
                    venue: parseFloat(avgVenueRating.toFixed(1)),
                    overall: parseFloat(avgOverallRating.toFixed(1))
                }
            };
        });
        // Count trainings by rating range
        const feedbackCounts = {
            excellent: 0, // 4.5-5.0
            good: 0, // 3.5-4.4
            average: 0, // 2.5-3.4
            poor: 0, // 1.5-2.4
            veryPoor: 0 // 1.0-1.4
        };
        trainingRatings.forEach(training => {
            const rating = training.ratings.overall;
            if (rating >= 4.5)
                feedbackCounts.excellent++;
            else if (rating >= 3.5)
                feedbackCounts.good++;
            else if (rating >= 2.5)
                feedbackCounts.average++;
            else if (rating >= 1.5)
                feedbackCounts.poor++;
            else
                feedbackCounts.veryPoor++;
        });
        // Format the response
        const feedbackStats = {
            overallAverages: {
                content: overallAverages._avg.contentRating ? parseFloat(overallAverages._avg.contentRating.toFixed(1)) : 0,
                trainer: overallAverages._avg.trainerRating ? parseFloat(overallAverages._avg.trainerRating.toFixed(1)) : 0,
                material: overallAverages._avg.materialRating ? parseFloat(overallAverages._avg.materialRating.toFixed(1)) : 0,
                venue: overallAverages._avg.venueRating ? parseFloat(overallAverages._avg.venueRating.toFixed(1)) : 0,
                overall: overallAverages._avg.overallRating ? parseFloat(overallAverages._avg.overallRating.toFixed(1)) : 0
            },
            trainingRatings,
            ratingDistribution: feedbackCounts
        };
        res.status(200).json({
            message: 'Feedback statistics retrieved successfully',
            data: feedbackStats
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving feedback statistics:', error);
        res.status(500).json({
            message: 'Failed to retrieve feedback statistics',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getFeedbackStats = getFeedbackStats;
/**
 * Get trainer performance statistics
 * Returns effectiveness metrics for trainers
 */
const getTrainerStats = async (req, res) => {
    try {
        // Get trainers who have conducted trainings
        const trainers = await prisma.user.findMany({
            where: {
                trainerTrainings: {
                    some: {} // At least one training
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                trainerTrainings: {
                    select: {
                        id: true,
                        status: true,
                        feedback: {
                            select: {
                                trainerRating: true,
                                contentRating: true,
                                overallRating: true
                            }
                        }
                    }
                }
            }
        });
        // Process trainer statistics
        const trainerStats = trainers.map(trainer => {
            const trainingsCount = trainer.trainerTrainings.length;
            const completedTrainings = trainer.trainerTrainings.filter(t => t.status === 'COMPLETED').length;
            // Collect all feedback for this trainer
            let allFeedback = [];
            trainer.trainerTrainings.forEach(training => {
                allFeedback = [...allFeedback, ...training.feedback];
            });
            const feedbackCount = allFeedback.length;
            // Calculate average ratings
            const avgTrainerRating = feedbackCount > 0
                ? allFeedback.reduce((sum, fb) => sum + fb.trainerRating, 0) / feedbackCount
                : 0;
            const avgContentRating = feedbackCount > 0
                ? allFeedback.reduce((sum, fb) => sum + fb.contentRating, 0) / feedbackCount
                : 0;
            const avgOverallRating = feedbackCount > 0
                ? allFeedback.reduce((sum, fb) => sum + fb.overallRating, 0) / feedbackCount
                : 0;
            return {
                id: trainer.id,
                name: trainer.name,
                email: trainer.email,
                trainingsCount,
                completedTrainings,
                feedbackCount,
                ratings: {
                    trainer: parseFloat(avgTrainerRating.toFixed(1)),
                    content: parseFloat(avgContentRating.toFixed(1)),
                    overall: parseFloat(avgOverallRating.toFixed(1))
                },
                completionRate: trainingsCount > 0
                    ? Math.round((completedTrainings / trainingsCount) * 100)
                    : 0
            };
        });
        // Sort trainers by overall rating (highest first)
        trainerStats.sort((a, b) => b.ratings.overall - a.ratings.overall);
        res.status(200).json({
            message: 'Trainer statistics retrieved successfully',
            data: {
                trainers: trainerStats,
                totalTrainers: trainerStats.length
            }
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving trainer statistics:', error);
        res.status(500).json({
            message: 'Failed to retrieve trainer statistics',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getTrainerStats = getTrainerStats;
/**
 * Get participant engagement statistics
 * Returns metrics about participant attendance and feedback
 */
const getParticipantEngagementStats = async (req, res) => {
    try {
        // Get top participants by training participation
        const topParticipants = await prisma.participant.findMany({
            where: {
                trainings: {
                    some: {} // At least one participation
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                organization: true,
                _count: {
                    select: {
                        trainings: true,
                        attendances: true,
                        feedbacks: true
                    }
                }
            },
            orderBy: {
                trainings: {
                    _count: 'desc'
                }
            },
            take: 10 // Top 10 participants
        });
        // Calculate engagement metrics
        const participantEngagement = topParticipants.map(participant => {
            const trainingsCount = participant._count.trainings;
            const attendancesCount = participant._count.attendances;
            const feedbacksCount = participant._count.feedbacks;
            // Calculate engagement score (based on attendance and feedback)
            const attendanceRate = trainingsCount > 0 ? (attendancesCount / trainingsCount) : 0;
            const feedbackRate = trainingsCount > 0 ? (feedbacksCount / trainingsCount) : 0;
            const engagementScore = Math.round(((attendanceRate * 0.6) + (feedbackRate * 0.4)) * 100);
            return {
                id: participant.id,
                name: participant.name,
                email: participant.email,
                organization: participant.organization || 'N/A',
                trainingsCount,
                attendancesCount,
                feedbacksCount,
                attendanceRate: Math.round(attendanceRate * 100),
                feedbackRate: Math.round(feedbackRate * 100),
                engagementScore
            };
        });
        // Get training participation over time (last 6 months)
        const today = new Date();
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        // Format months for the last 6 months
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const date = new Date(today);
            date.setMonth(today.getMonth() - i);
            return {
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                label: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
                participantsCount: 0
            };
        }).reverse();
        // Get training participants by month
        const monthlyParticipation = await prisma.trainingParticipant.findMany({
            where: {
                training: {
                    startDate: {
                        gte: sixMonthsAgo,
                        lte: today
                    }
                }
            },
            include: {
                training: {
                    select: {
                        startDate: true
                    }
                }
            }
        });
        // Populate monthly participation data
        monthlyParticipation.forEach(participant => {
            const participantMonth = participant.training.startDate.getMonth() + 1;
            const participantYear = participant.training.startDate.getFullYear();
            const monthIndex = last6Months.findIndex(m => m.month === participantMonth && m.year === participantYear);
            if (monthIndex !== -1) {
                last6Months[monthIndex].participantsCount++;
            }
        });
        res.status(200).json({
            message: 'Participant engagement statistics retrieved successfully',
            data: {
                topParticipants: participantEngagement,
                monthlyParticipation: last6Months
            }
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving participant engagement statistics:', error);
        res.status(500).json({
            message: 'Failed to retrieve participant engagement statistics',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getParticipantEngagementStats = getParticipantEngagementStats;
/**
 * Get combined dashboard statistics
 * Returns key metrics from all other endpoints
 */
const getDashboardStats = async (req, res) => {
    try {
        // Get current date for calculations
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        // Summary counts
        const totalTrainings = await prisma.training.count();
        const scheduledTrainings = await prisma.training.count({ where: { status: 'SCHEDULED' } });
        const completedTrainings = await prisma.training.count({ where: { status: 'COMPLETED' } });
        const inProgressTrainings = await prisma.training.count({ where: { status: 'IN_PROGRESS' } });
        // Get trainings for current month
        const currentMonthStart = new Date(currentYear, currentMonth, 1);
        const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
        const currentMonthTrainings = await prisma.training.count({
            where: {
                startDate: {
                    gte: currentMonthStart,
                    lt: nextMonthStart
                }
            }
        });
        // Get upcoming trainings (next 30 days)
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(today.getDate() + 30);
        const upcomingTrainings = await prisma.training.findMany({
            where: {
                startDate: {
                    gte: today,
                    lt: thirtyDaysLater
                },
                status: 'SCHEDULED'
            },
            select: {
                id: true,
                title: true,
                startDate: true,
                location: true,
                trainingType: true,
                trainer: {
                    select: {
                        name: true
                    }
                },
                _count: {
                    select: {
                        participants: true
                    }
                }
            },
            orderBy: {
                startDate: 'asc'
            },
            take: 5 // Get only the next 5 upcoming trainings
        });
        // Format upcoming trainings for display
        const formattedUpcomingTrainings = upcomingTrainings.map(training => ({
            id: training.id,
            title: training.title,
            startDate: training.startDate,
            location: training.location,
            trainingType: training.trainingType,
            trainerName: training.trainer.name,
            participantsCount: training._count.participants,
            daysUntilStart: Math.ceil((training.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        }));
        // Get recently completed trainings
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const recentlyCompletedCount = await prisma.training.count({
            where: {
                status: 'COMPLETED',
                endDate: {
                    gte: thirtyDaysAgo,
                    lte: today
                }
            }
        });
        // Get total participants and average feedback
        const totalParticipants = await prisma.trainingParticipant.count();
        const avgFeedback = await prisma.trainingFeedback.aggregate({
            _avg: {
                overallRating: true
            }
        });
        // Get monthly training counts for the current year
        const monthlyTrainingCounts = await Promise.all(Array.from({ length: 12 }, async (_, month) => {
            const startDate = new Date(currentYear, month, 1);
            const endDate = new Date(currentYear, month + 1, 0); // Last day of month
            const count = await prisma.training.count({
                where: {
                    startDate: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            return {
                month: month + 1,
                monthName: startDate.toLocaleString('default', { month: 'short' }),
                count
            };
        }));
        res.status(200).json({
            message: 'Dashboard statistics retrieved successfully',
            data: {
                summary: {
                    totalTrainings,
                    scheduledTrainings,
                    completedTrainings,
                    inProgressTrainings,
                    currentMonthTrainings,
                    recentlyCompletedCount,
                    totalParticipants,
                    averageRating: avgFeedback._avg.overallRating
                        ? parseFloat(avgFeedback._avg.overallRating.toFixed(1))
                        : 0
                },
                upcomingTrainings: formattedUpcomingTrainings,
                monthlyTrainingCounts
            }
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving dashboard statistics:', error);
        res.status(500).json({
            message: 'Failed to retrieve dashboard statistics',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getDashboardStats = getDashboardStats;
