"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarStatistics = exports.updateCalendarDescription = exports.getDailyCalendar = exports.getMonthlyCalendar = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
/**
 * Get monthly training calendar with various detail levels
 * Supports view modes: 'overview', 'detailed', and 'compact'
 */
const getMonthlyCalendar = async (req, res) => {
    try {
        const { month, year, detailLevel = 'overview', status, trainingType } = req.query;
        // Validate required parameters
        if (!month || !year) {
            res.status(400).json({ message: 'Month and year are required' });
            return;
        }
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        if (isNaN(monthNum) || isNaN(yearNum) ||
            monthNum < 1 || monthNum > 12 ||
            yearNum < 2000 || yearNum > 2100) {
            res.status(400).json({ message: 'Invalid month or year value' });
            return;
        }
        // Find or create the training calendar for this month and year
        let calendar = await prisma.trainingCalendar.findUnique({
            where: {
                month_year: {
                    month: monthNum,
                    year: yearNum
                }
            }
        });
        if (!calendar) {
            // Create a new calendar entry for this month/year
            calendar = await prisma.trainingCalendar.create({
                data: {
                    month: monthNum,
                    year: yearNum,
                    description: `Training Calendar for ${monthNum}/${yearNum}`
                }
            });
        }
        // Build conditions for training filter
        const whereConditions = {
            calendarId: calendar.id
        };
        // Add optional filters
        if (status) {
            whereConditions.status = status;
        }
        if (trainingType) {
            whereConditions.trainingType = trainingType;
        }
        // Get trainings for this calendar with different detail levels
        let trainings;
        switch (detailLevel) {
            case 'detailed':
                // Full details including sessions, participants, etc.
                trainings = await prisma.training.findMany({
                    where: whereConditions,
                    orderBy: { startDate: 'asc' },
                    include: {
                        trainer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        },
                        sessions: {
                            orderBy: { startTime: 'asc' },
                            include: {
                                attendance: {
                                    include: {
                                        participant: {
                                            select: {
                                                name: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        participants: {
                            include: {
                                participant: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    }
                                }
                            }
                        },
                        documents: {
                            select: {
                                id: true,
                                title: true,
                                documentType: true,
                                createdAt: true
                            }
                        },
                        _count: {
                            select: {
                                participants: true,
                                documents: true,
                                sessions: true
                            }
                        }
                    }
                });
                break;
            case 'compact':
                // Just essential information for calendar display
                trainings = await prisma.training.findMany({
                    where: whereConditions,
                    orderBy: { startDate: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        trainingType: true,
                        startDate: true,
                        endDate: true,
                        location: true,
                        _count: {
                            select: {
                                participants: true,
                                sessions: true
                            }
                        }
                    }
                });
                break;
            case 'overview':
            default:
                // Standard info with key counts
                trainings = await prisma.training.findMany({
                    where: whereConditions,
                    orderBy: { startDate: 'asc' },
                    include: {
                        trainer: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        sessions: {
                            select: {
                                id: true,
                                title: true,
                                startTime: true,
                                endTime: true,
                                venue: true
                            },
                            orderBy: { startTime: 'asc' }
                        },
                        _count: {
                            select: {
                                participants: true,
                                documents: true,
                                sessions: true
                            }
                        }
                    }
                });
                break;
        }
        // Generate calendar data structure
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1).getDay();
        // Create daily breakdown of trainings
        const calendarDays = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(yearNum, monthNum - 1, day);
            // Find trainings that occur on this day
            const trainingsOnThisDay = trainings.filter((training) => {
                const startDate = new Date(training.startDate);
                const endDate = new Date(training.endDate);
                // Check if this day falls within the training period
                return ((currentDate >= startDate && currentDate <= endDate) ||
                    currentDate.toDateString() === startDate.toDateString() ||
                    currentDate.toDateString() === endDate.toDateString());
            });
            // Find sessions that occur on this day
            const sessionsOnThisDay = [];
            if (detailLevel !== 'compact') {
                trainingsOnThisDay.forEach((training) => {
                    if (training.sessions) {
                        training.sessions.forEach((session) => {
                            const sessionDate = new Date(session.startTime);
                            if (sessionDate.getDate() === day &&
                                sessionDate.getMonth() === monthNum - 1 &&
                                sessionDate.getFullYear() === yearNum) {
                                sessionsOnThisDay.push({
                                    ...session,
                                    trainingId: training.id,
                                    trainingTitle: training.title
                                });
                            }
                        });
                    }
                });
            }
            calendarDays.push({
                day,
                date: currentDate,
                isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
                trainings: trainingsOnThisDay,
                sessions: sessionsOnThisDay
            });
        }
        // Return response with calendar data
        res.status(200).json({
            message: 'Calendar retrieved successfully',
            calendarInfo: calendar,
            month: monthNum,
            year: yearNum,
            firstDayOfMonth,
            daysInMonth,
            days: calendarDays,
            trainings,
            statistics: {
                totalTrainings: trainings.length,
                scheduledTrainings: trainings.filter((t) => t.status === 'SCHEDULED').length,
                completedTrainings: trainings.filter((t) => t.status === 'COMPLETED').length,
                inProgressTrainings: trainings.filter((t) => t.status === 'IN_PROGRESS').length,
                cancelledTrainings: trainings.filter((t) => t.status === 'CANCELLED').length
            }
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving monthly calendar:', error);
        res.status(500).json({
            message: 'Failed to retrieve monthly calendar',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getMonthlyCalendar = getMonthlyCalendar;
/**
 * Get daily trainings and sessions
 */
const getDailyCalendar = async (req, res) => {
    try {
        const { date } = req.params;
        // Parse the date or use current date if not provided
        const targetDate = date ? new Date(date) : new Date();
        // Validate date format
        if (isNaN(targetDate.getTime())) {
            res.status(400).json({ message: 'Invalid date format' });
            return;
        }
        // Extract day, month, year from the date
        const day = targetDate.getDate();
        const month = targetDate.getMonth() + 1; // Month is zero-indexed
        const year = targetDate.getFullYear();
        // Set start and end of the day for queries
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59);
        // Find trainings that overlap with this day
        const trainings = await prisma.training.findMany({
            where: {
                OR: [
                    { startDate: { lte: endOfDay }, endDate: { gte: startOfDay } },
                    { startDate: { equals: startOfDay } },
                    { endDate: { equals: endOfDay } }
                ]
            },
            include: {
                trainer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                sessions: {
                    where: {
                        startTime: { gte: startOfDay },
                        endTime: { lte: endOfDay }
                    },
                    orderBy: { startTime: 'asc' }
                },
                _count: {
                    select: {
                        participants: true
                    }
                }
            }
        });
        // Return the daily calendar data
        res.status(200).json({
            message: 'Daily calendar retrieved successfully',
            date: targetDate,
            day,
            month,
            year,
            trainings,
            trainingsCount: trainings.length
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving daily calendar:', error);
        res.status(500).json({
            message: 'Failed to retrieve daily calendar',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getDailyCalendar = getDailyCalendar;
/**
 * Update calendar description
 */
const updateCalendarDescription = async (req, res) => {
    try {
        const { month, year } = req.params;
        const { description } = req.body;
        if (!description) {
            res.status(400).json({ message: 'Description is required' });
            return;
        }
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        // Find the calendar
        let calendar = await prisma.trainingCalendar.findUnique({
            where: {
                month_year: {
                    month: monthNum,
                    year: yearNum
                }
            }
        });
        if (!calendar) {
            // Create if it doesn't exist
            calendar = await prisma.trainingCalendar.create({
                data: {
                    month: monthNum,
                    year: yearNum,
                    description
                }
            });
        }
        else {
            // Update existing calendar
            calendar = await prisma.trainingCalendar.update({
                where: { id: calendar.id },
                data: { description }
            });
        }
        res.status(200).json({
            message: 'Calendar description updated successfully',
            calendar
        });
        return;
    }
    catch (error) {
        console.error('Error updating calendar description:', error);
        res.status(500).json({
            message: 'Failed to update calendar description',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.updateCalendarDescription = updateCalendarDescription;
/**
 * Get calendar statistics and summary for dashboard
 */
const getCalendarStatistics = async (req, res) => {
    try {
        const { month, year } = req.query;
        const monthNum = month ? parseInt(month, 10) : new Date().getMonth() + 1;
        const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
        // Find the calendar
        let calendar = await prisma.trainingCalendar.findUnique({
            where: {
                month_year: {
                    month: monthNum,
                    year: yearNum
                }
            }
        });
        // If calendar doesn't exist, get basic stats without calendar
        if (!calendar) {
            const trainings = await prisma.training.findMany({
                where: {
                    AND: [
                        { startDate: { gte: new Date(yearNum, monthNum - 1, 1) } },
                        { startDate: { lt: new Date(yearNum, monthNum, 1) } }
                    ]
                },
                select: {
                    id: true,
                    status: true,
                    trainingType: true
                }
            });
            res.status(200).json({
                message: 'Calendar statistics retrieved',
                month: monthNum,
                year: yearNum,
                calendarExists: false,
                statistics: {
                    totalTrainings: trainings.length,
                    byStatus: {
                        SCHEDULED: trainings.filter(t => t.status === 'SCHEDULED').length,
                        IN_PROGRESS: trainings.filter(t => t.status === 'IN_PROGRESS').length,
                        COMPLETED: trainings.filter(t => t.status === 'COMPLETED').length,
                        CANCELLED: trainings.filter(t => t.status === 'CANCELLED').length,
                        POSTPONED: trainings.filter(t => t.status === 'POSTPONED').length
                    },
                    byType: {
                        TECHNICAL: trainings.filter(t => t.trainingType === 'TECHNICAL').length,
                        SAFETY: trainings.filter(t => t.trainingType === 'SAFETY').length,
                        COMPLIANCE: trainings.filter(t => t.trainingType === 'COMPLIANCE').length,
                        ONBOARDING: trainings.filter(t => t.trainingType === 'ONBOARDING').length,
                        WORKSHOP: trainings.filter(t => t.trainingType === 'WORKSHOP').length,
                        SEMINAR: trainings.filter(t => t.trainingType === 'SEMINAR').length,
                        PROFESSIONAL_DEVELOPMENT: trainings.filter(t => t.trainingType === 'PROFESSIONAL_DEVELOPMENT').length,
                    }
                }
            });
            return;
        }
        // Get trainings for this calendar
        const trainings = await prisma.training.findMany({
            where: {
                calendarId: calendar.id
            },
            include: {
                _count: {
                    select: {
                        participants: true,
                        sessions: true
                    }
                }
            }
        });
        // Calculate statistics
        const participantCounts = trainings.reduce((sum, t) => sum + (t._count?.participants || 0), 0);
        const sessionCounts = trainings.reduce((sum, t) => sum + (t._count?.sessions || 0), 0);
        // Get recent trainings - last 5
        const recentTrainings = await prisma.training.findMany({
            where: {
                calendarId: calendar.id
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                startDate: true,
                endDate: true,
            }
        });
        // Get upcoming sessions - next 5
        const currentDate = new Date();
        const upcomingSessions = await prisma.trainingSession.findMany({
            where: {
                training: { calendarId: calendar.id },
                startTime: { gte: currentDate }
            },
            orderBy: { startTime: 'asc' },
            take: 5,
            include: {
                training: {
                    select: {
                        id: true,
                        title: true,
                        status: true
                    }
                }
            }
        });
        res.status(200).json({
            message: 'Calendar statistics retrieved successfully',
            calendar,
            month: monthNum,
            year: yearNum,
            calendarExists: true,
            statistics: {
                totalTrainings: trainings.length,
                totalParticipants: participantCounts,
                totalSessions: sessionCounts,
                byStatus: {
                    SCHEDULED: trainings.filter(t => t.status === 'SCHEDULED').length,
                    IN_PROGRESS: trainings.filter(t => t.status === 'IN_PROGRESS').length,
                    COMPLETED: trainings.filter(t => t.status === 'COMPLETED').length,
                    CANCELLED: trainings.filter(t => t.status === 'CANCELLED').length,
                    POSTPONED: trainings.filter(t => t.status === 'POSTPONED').length
                },
                byType: {
                    TECHNICAL: trainings.filter(t => t.trainingType === 'TECHNICAL').length,
                    SAFETY: trainings.filter(t => t.trainingType === 'SAFETY').length,
                    COMPLIANCE: trainings.filter(t => t.trainingType === 'COMPLIANCE').length,
                    ONBOARDING: trainings.filter(t => t.trainingType === 'ONBOARDING').length,
                    WORKSHOP: trainings.filter(t => t.trainingType === 'WORKSHOP').length,
                    SEMINAR: trainings.filter(t => t.trainingType === 'SEMINAR').length,
                    PROFESSIONAL_DEVELOPMENT: trainings.filter(t => t.trainingType === 'PROFESSIONAL_DEVELOPMENT').length,
                }
            },
            recentTrainings,
            upcomingSessions
        });
        return;
    }
    catch (error) {
        console.error('Error retrieving calendar statistics:', error);
        res.status(500).json({
            message: 'Failed to retrieve calendar statistics',
            error: error instanceof Error ? error.message : String(error)
        });
        return;
    }
};
exports.getCalendarStatistics = getCalendarStatistics;
