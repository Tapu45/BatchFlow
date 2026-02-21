import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  CalendarClock,
  Users,
  CheckCircle,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  User,
  Star,
  BookOpen,
  Medal,
  ArrowUpRight,
  MapPin,
  Building,
  ChevronRight,
  Download,
  Activity,
  FileText,
  ArrowRight
} from 'lucide-react';
import {
  Bar,
  Line,
  Doughnut,
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format } from 'date-fns';
import api, { API_ROUTES } from '../../../utils/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Define types
type TrainingSummary = {
  totalTrainings: number;
  scheduledTrainings: number;
  completedTrainings: number;
  inProgressTrainings: number;
  currentMonthTrainings: number;
  recentlyCompletedCount: number;
  totalParticipants: number;
  averageRating: number;
};

type UpcomingTraining = {
  id: string;
  title: string;
  startDate: string;
  location: string;
  trainingType: string;
  trainerName: string;
  participantsCount: number;
  daysUntilStart: number;
};

type MonthlyCount = {
  month: number;
  monthName: string;
  count: number;
};

type DashboardData = {
  summary: TrainingSummary;
  upcomingTrainings: UpcomingTraining[];
  monthlyTrainingCounts: MonthlyCount[];
};

type FeedbackStats = {
  overallAverages: {
    content: number;
    trainer: number;
    material: number;
    venue: number;
    overall: number;
  };
  trainingRatings: Array<{
    id: string;
    title: string;
    endDate: string;
    feedbackCount: number;
    ratings: {
      content: number;
      trainer: number;
      material: number;
      venue: number;
      overall: number;
    };
  }>;
  ratingDistribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
    veryPoor: number;
  };
};

type TrainerStats = {
  trainers: Array<{
    id: string;
    name: string;
    email: string;
    trainingsCount: number;
    completedTrainings: number;
    feedbackCount: number;
    ratings: {
      trainer: number;
      content: number;
      overall: number;
    };
    completionRate: number;
  }>;
  totalTrainers: number;
};

type MonthlyTrainingStats = {
  year: number;
  months: Array<{
    month: number;
    monthName: string;
    trainingsCount: number;
    participantsCount: number;
    completedTrainings: number;
  }>;
};

type AttendanceStats = {
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  totalAttendance: number;
  trainingAttendanceRates: Array<{
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    participantsCount: number;
    attendanceCount: number;
    attendanceRate: number;
  }>;
};

type ParticipantEngagement = {
  topParticipants: Array<{
    id: string;
    name: string;
    email: string;
    organization: string;
    trainingsCount: number;
    attendancesCount: number;
    feedbacksCount: number;
    attendanceRate: number;
    feedbackRate: number;
    engagementScore: number;
  }>;
  monthlyParticipation: Array<{
    month: number;
    year: number;
    label: string;
    participantsCount: number;
  }>;
};

const TrainingDashboard: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // Helpers to resolve CSS variables and produce rgba strings for charts
  const getCssVar = (name: string, fallback: string) => {
    try {
      if (typeof window === 'undefined') return fallback;
      const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return val || fallback;
    } catch (e) {
      return fallback;
    }
  };

  const parseColorToRgba = (color: string, alpha: number) => {
    if (!color) return `rgba(0,0,0,${alpha})`;
    color = color.trim();
    if (color.startsWith('rgba')) return color.replace(/rgba\(([^)]+)\)/, (_, vals) => `rgba(${vals.split(',').slice(0, 3).join(',')},${alpha})`);
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const normalized = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
      const bigint = parseInt(normalized, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return color;
  };

  const primaryColor = getCssVar('--primary', '#6366F1');
  const secondaryColor = getCssVar('--secondary', '#3b82f6');
  const successColor = getCssVar('--success', '#10b981');
  const mutedColor = getCssVar('--muted', 'rgba(0,0,0,0.6)');


  // Fetch main dashboard statistics
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError
  } = useQuery<DashboardData>({
    queryKey: ['trainingDashboardStats'],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TRAINING.GET_TRAINING_DASHBOARD_STATS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch feedback statistics
  const {
    data: feedbackData,
    isLoading: feedbackLoading,
    error: feedbackError
  } = useQuery<FeedbackStats>({
    queryKey: ['trainingFeedbackStats'],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TRAINING.GET_TRAINING_FEEDBACK_STATS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch trainer statistics
  const {
    data: trainerData,
    isLoading: trainerLoading,
    error: trainerError
  } = useQuery<TrainerStats>({
    queryKey: ['trainingTrainerStats'],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TRAINING.GET_TRAINING_TRAINER_STATS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch monthly training statistics
  const {
    data: monthlyData,
    isLoading: monthlyLoading,
    error: monthlyError
  } = useQuery<MonthlyTrainingStats>({
    queryKey: ['trainingMonthlyStats', selectedYear],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TRAINING.GET_TRAINING_MONTHLY_STATS, {
        params: { year: selectedYear },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch attendance statistics
  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    error: attendanceError
  } = useQuery<AttendanceStats>({
    queryKey: ['trainingAttendanceStats'],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TRAINING.GET_TRAINING_ATTENDANCE_STATS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch participant engagement statistics
  const {
    data: engagementData,
    isLoading: engagementLoading,
    error: engagementError
  } = useQuery<ParticipantEngagement>({
    queryKey: ['trainingParticipantEngagementStats'],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TRAINING.GET_TRAINING_PARTICIPANT_ENGAGEMENT_STATS, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Prepare monthly training data for charts
  const monthlyTrainingChartData = useMemo(() => {
    if (!monthlyData?.months) return null;

    return {
      labels: monthlyData.months.map(m => m.monthName),
      datasets: [
        {
          label: 'Total Trainings',
          data: monthlyData.months.map(m => m.trainingsCount),
          borderColor: parseColorToRgba(primaryColor, 1),
          backgroundColor: parseColorToRgba(primaryColor, 0.2),
          fill: true,
          tension: 0.4
        },
        {
          label: 'Completed Trainings',
          data: monthlyData.months.map(m => m.completedTrainings),
          borderColor: parseColorToRgba(successColor, 1),
          backgroundColor: parseColorToRgba(successColor, 0.2),
          fill: true,
          tension: 0.4
        }
      ]
    };
  }, [monthlyData]);



  // Training status distribution
  const statusDistributionData = useMemo(() => {
    if (!dashboardData?.summary) return null;

    return {
      labels: [
        'Scheduled',
        'In Progress',
        'Completed'
      ],
      datasets: [
        {
          data: [
            dashboardData.summary.scheduledTrainings,
            dashboardData.summary.inProgressTrainings,
            dashboardData.summary.completedTrainings
          ],
          backgroundColor: [
            parseColorToRgba(secondaryColor, 0.85),
            parseColorToRgba(primaryColor, 0.85),
            parseColorToRgba(successColor, 0.85)
          ],
          borderWidth: 0
        }
      ]
    };
  }, [dashboardData]);



  // Monthly participation chart data
  const participationTrendData = useMemo(() => {
    if (!engagementData?.monthlyParticipation) return null;

    return {
      labels: engagementData.monthlyParticipation.map(item => item.label),
      datasets: [
        {
          label: 'Participants',
          data: engagementData.monthlyParticipation.map(item => item.participantsCount),
          borderColor: parseColorToRgba(primaryColor, 1),
          backgroundColor: parseColorToRgba(primaryColor, 0.2),
          fill: true,
          tension: 0.4
        }
      ]
    };
  }, [engagementData]);



  // Detailed feedback ratings data
  const detailedFeedbackData = useMemo(() => {
    if (!feedbackData?.overallAverages) return null;

    return {
      labels: ['Content', 'Trainer', 'Materials', 'Venue', 'Overall'],
      datasets: [
        {
          label: 'Average Rating',
          data: [
            feedbackData.overallAverages.content,
            feedbackData.overallAverages.trainer,
            feedbackData.overallAverages.material,
            feedbackData.overallAverages.venue,
            feedbackData.overallAverages.overall
          ],
          backgroundColor: [
            parseColorToRgba(primaryColor, 0.7),
            parseColorToRgba(successColor, 0.7),
            parseColorToRgba(secondaryColor, 0.7),
            parseColorToRgba(secondaryColor, 0.7),
            parseColorToRgba(primaryColor, 0.7)
          ],
          borderWidth: 0,
          borderRadius: 4,
          maxBarThickness: 50
        }
      ]
    };
  }, [feedbackData]);

  // Generate year options for dropdown
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 15
      }
    }
  };

  return (
    <motion.div
      className="px-6 py-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Dashboard Header */}
      <motion.div variants={itemVariants} className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Training Dashboard</h1>
          <p className="mt-1" style={{ color: 'var(--muted-foreground)' }}>Comprehensive overview of training programs and metrics</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg shadow-sm p-1" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border-none rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-0"
              style={{ background: 'transparent', color: 'var(--foreground)' }}
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              onClick={() => {/* Export functionality */ }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-primary-600 rounded-lg text-sm font-medium"
            >
              <Download size={14} />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Trainings */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-xl shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${parseColorToRgba(primaryColor, 0.08)}, ${parseColorToRgba(primaryColor, 0.04)})`,
            border: `1px solid var(--border)`,
            color: 'var(--card-foreground)'
          }}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full" style={{ background: parseColorToRgba(primaryColor, 0.12) }}>
              <BookOpen size={24} style={{ color: primaryColor }} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium" style={{ color: primaryColor, fontWeight: 'bold' }}>TOTAL TRAININGS</h2>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                  {dashboardLoading ? "..." : dashboardData?.summary.totalTrainings || 0}
                </span>
                <span className="ml-2 text-xs font-medium flex items-center" style={{ color: parseColorToRgba(successColor, 1) }}>
                  <ArrowUpRight size={12} className="mr-0.5" />
                  {dashboardData?.summary.currentMonthTrainings
                    ? `${dashboardData.summary.currentMonthTrainings} this month`
                    : "0 this month"
                  }
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
              <span>Scheduled: {dashboardData?.summary.scheduledTrainings || 0}</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-amber-500 mr-1"></div>
              <span>In Progress: {dashboardData?.summary.inProgressTrainings || 0}</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
              <span>Completed: {dashboardData?.summary.completedTrainings || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* Total Participants */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-xl shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${parseColorToRgba(secondaryColor, 0.08)}, ${parseColorToRgba(secondaryColor, 0.04)})`,
            border: `1px solid var(--border)`,
            color: 'var(--card-foreground)'
          }}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full" style={{ background: parseColorToRgba(secondaryColor, 0.12) }}>
              <Users size={24} style={{ color: secondaryColor }} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium" style={{ color: secondaryColor, fontWeight: 'bold' }}>PARTICIPANTS</h2>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                  {dashboardLoading ? "..." : dashboardData?.summary.totalParticipants || 0}
                </span>
                {engagementData && (
                  <span className="ml-2 text-xs font-medium" style={{ color: secondaryColor }}>
                    {engagementData.topParticipants.length} active
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <div className="w-full rounded-full h-1" style={{ background: parseColorToRgba(mutedColor, 0.12) }}>
              <div
                className="h-1 rounded-full"
                style={{
                  background: parseColorToRgba(secondaryColor, 1),
                  width: `${engagementData?.topParticipants
                    ? Math.min(100, Math.round((engagementData.topParticipants
                      .filter(p => p.engagementScore > 70).length /
                      engagementData.topParticipants.length) * 100))
                    : 0}%`
                }}
              ></div>
            </div>
          </div>
        </motion.div>

        {/* Satisfaction Rate */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-xl shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${parseColorToRgba(primaryColor, 0.08)}, ${parseColorToRgba(primaryColor, 0.04)})`,
            border: `1px solid var(--border)`,
            color: 'var(--card-foreground)'
          }}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full" style={{ background: parseColorToRgba(primaryColor, 0.12) }}>
              <BookOpen size={24} style={{ color: primaryColor }} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium" style={{ color: primaryColor, fontWeight: 'bold' }}>SATISFACTION RATE</h2>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                  {dashboardLoading ? "..." : `${dashboardData?.summary.averageRating.toFixed(1)}/5.0` || "0/5.0"}
                </span>
                {feedbackData?.ratingDistribution && (
                  <span className="ml-2 text-xs font-medium" style={{ color: successColor }}>
                    {feedbackData.ratingDistribution.excellent + feedbackData.ratingDistribution.good} positive
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {feedbackData?.ratingDistribution && (
              <>
                <div className="flex items-center">
                  <Star size={12} className="text-amber-400 mr-1" />
                  <span>Excellent: {feedbackData.ratingDistribution.excellent}</span>
                </div>
                <div className="flex items-center">
                  <Star size={12} className="text-blue-400 mr-1" />
                  <span>Good: {feedbackData.ratingDistribution.good}</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Attendance Rate */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-xl shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${parseColorToRgba(getCssVar('--chart-3', '#F59E0B'), 0.08)}, ${parseColorToRgba(getCssVar('--chart-3', '#F59E0B'), 0.04)})`,
            border: `1px solid var(--border)`,
            color: 'var(--card-foreground)'
          }}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full" style={{ background: parseColorToRgba(getCssVar('--chart-3', '#F59E0B'), 0.12) }}>
              <CheckCircle size={24} style={{ color: getCssVar('--chart-3', '#F59E0B') }} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium" style={{ color: getCssVar('--chart-3', '#F59E0B'), fontWeight: 'bold' }}>ATTENDANCE RATE</h2>
              <div className="flex items-baseline mt-1">
                <span className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                  {attendanceLoading ? "..." :
                    attendanceData?.statusDistribution ?
                      `${Math.round((attendanceData.statusDistribution
                        .find(s => s.status === 'PRESENT')?.percentage || 0))}%` :
                      "0%"
                  }
                </span>
                {(attendanceData?.totalAttendance ?? 0) > 0 && (
                  <span className="ml-2 text-xs font-medium" style={{ color: getCssVar('--chart-3', '#F59E0B') }}>
                    {attendanceData?.totalAttendance}
                    {' '}
                    records
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {attendanceData?.statusDistribution && (
              attendanceData.statusDistribution.slice(0, 2).map((status, idx) => (
                <div key={idx} className="flex items-center">
                  <div className={`h-2 w-2 rounded-full ${status.status === 'PRESENT' ? 'bg-green-500' :
                    status.status === 'ABSENT' ? 'bg-red-500' :
                      status.status === 'LATE' ? 'bg-amber-500' : 'bg-gray-500'
                    } mr-1`}></div>
                  <span>{status.status}: {status.percentage}%</span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Monthly Training Trend */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-8 rounded-xl shadow-sm overflow-hidden"
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)' }}
        >
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--foreground)' }}>
                <TrendingUp size={18} style={{ color: primaryColor }} className="mr-2" />
                Monthly Training Trend
              </h2>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {selectedYear}
              </span>
            </div>
          </div>
          <div className="p-6">
            {monthlyLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            ) : monthlyError ? (
              <div className="h-64 flex items-center justify-center text-red-500">
                Failed to load monthly data
              </div>
            ) : !monthlyTrainingChartData ? (
              <div className="h-64 flex items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
                No monthly data available
              </div>
            ) : (
              <div className="h-64">
                <Line
                  data={monthlyTrainingChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: parseColorToRgba(mutedColor, 0.05),
                        },
                        ticks: {
                          precision: 0
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top' as const,
                        align: 'end' as const,
                        labels: {
                          boxWidth: 8,
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      }
                    },
                    interaction: {
                      mode: 'index' as const,
                      intersect: false,
                    }
                  }}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Training Status Distribution */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-4 rounded-xl shadow-sm overflow-hidden"
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)' }}
        >
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--foreground)' }}>
                <PieChart size={18} style={{ color: primaryColor }} className="mr-2" />
                Status Distribution
              </h2>
            </div>
          </div>
          <div className="p-6">
            {dashboardLoading ? (
              <div className="h-60 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            ) : dashboardError ? (
              <div className="h-60 flex items-center justify-center text-red-500">
                Failed to load status data
              </div>
            ) : !statusDistributionData ? (
              <div className="h-60 flex items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
                No status data available
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center">
                <div className="w-48 relative">
                  <Doughnut
                    data={statusDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '65%',
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                          labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                          }
                        }
                      }
                    }}
                  />
                  {dashboardData?.summary && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{dashboardData.summary.totalTrainings}</div>
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Total</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Upcoming Trainings */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-6 rounded-xl shadow-sm overflow-hidden"
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)' }}
        >
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--foreground)' }}>
                <CalendarClock size={18} style={{ color: primaryColor }} className="mr-2" />
                Upcoming Trainings
              </h2>
              <button className="text-xs text-blue-500 hover:text-blue-700">View All</button>
            </div>
          </div>
          <div className="p-1">
            {dashboardLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            ) : dashboardError ? (
              <div className="h-80 flex items-center justify-center text-red-500">
                Failed to load upcoming trainings
              </div>
            ) : !dashboardData?.upcomingTrainings || dashboardData.upcomingTrainings.length === 0 ? (
              <div className="h-80 flex flex-col items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
                <Calendar size={36} style={{ color: parseColorToRgba(mutedColor, 0.35), marginBottom: 12 }} />
                <p>No upcoming trainings scheduled</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {dashboardData.upcomingTrainings.map((training) => (
                  <div key={training.id} className="p-4 transition-colors" style={{ background: 'transparent' }}>
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium ${training.daysUntilStart <= 3 ? 'bg-red-500' :
                          training.daysUntilStart <= 7 ? 'bg-amber-500' :
                            'bg-blue-500'
                          }`}
                      >
                        <div className="text-center">
                          <div className="text-xs">
                            {format(new Date(training.startDate), 'MMM')}
                          </div>
                          <div className="text-lg font-bold leading-none">
                            {format(new Date(training.startDate), 'd')}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>{training.title}</h3>
                        <div className="flex flex-wrap gap-y-1 gap-x-4 mt-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          <div className="flex items-center">
                            <User size={12} className="mr-1" />
                            {training.trainerName}
                          </div>
                          <div className="flex items-center">
                            <MapPin size={12} className="mr-1" />
                            {training.location}
                          </div>
                          <div className="flex items-center">
                            <Users size={12} className="mr-1" />
                            {training.participantsCount} participants
                          </div>
                        </div>
                        <div className="mt-2 flex items-center">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium`}
                            style={{
                              background: training.trainingType === 'INTERNAL' ? parseColorToRgba(primaryColor, 0.12) : training.trainingType === 'EXTERNAL' ? parseColorToRgba(secondaryColor, 0.12) : parseColorToRgba(mutedColor, 0.08),
                              color: training.trainingType === 'INTERNAL' ? primaryColor : training.trainingType === 'EXTERNAL' ? secondaryColor : 'var(--foreground)'
                            }}
                          >
                            {training.trainingType}
                          </span>
                          <span className="text-xs ml-2" style={{ color: 'var(--muted-foreground)' }}>
                            {training.daysUntilStart > 0 ?
                              `${training.daysUntilStart} day${training.daysUntilStart !== 1 ? 's' : ''} remaining` :
                              'Today'
                            }
                          </span>
                        </div>
                      </div>

                      <button className="hover:text-[color:var(--primary)]" style={{ color: 'var(--muted-foreground)' }}>
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Trainer Performance */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-6 rounded-xl shadow-sm overflow-hidden"
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)' }}
        >
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--foreground)' }}>
                <Medal size={18} style={{ color: primaryColor }} className="mr-2" />
                Trainer Performance
              </h2>
              <button className="text-xs text-blue-500 hover:text-blue-700">View All</button>
            </div>
          </div>
          <div className="p-6">
            {trainerLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            ) : trainerError ? (
              <div className="h-80 flex items-center justify-center text-red-500">
                Failed to load trainer data
              </div>
            ) : !trainerData?.trainers || trainerData.trainers.length === 0 ? (
              <div className="h-80 flex items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
                No trainer data available
              </div>
            ) : (
              <div className="h-80 overflow-y-auto pr-2">
                <table className="min-w-full divide-y" style={{ borderColor: 'var(--border)' }}>
                  <thead>
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>
                        Trainer
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>
                        Trainings
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>
                        Rating
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}>
                        Completion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ background: 'var(--card)' }}>
                    {trainerData.trainers.slice(0, 6).map((trainer) => (
                      <tr key={trainer.id} className="transition-colors">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                              {trainer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{trainer.name}</div>
                              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{trainer.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <div className="text-sm" style={{ color: 'var(--foreground)' }}>{trainer.trainingsCount}</div>
                          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{trainer.completedTrainings} completed</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${trainer.ratings.overall >= 4.5 ? 'bg-green-100 text-green-800' :
                                trainer.ratings.overall >= 3.5 ? 'bg-blue-100 text-blue-800' :
                                  trainer.ratings.overall >= 2.5 ? 'bg-amber-100 text-amber-800' :
                                    'bg-red-100 text-red-800'
                                }`}
                            >
                              {trainer.ratings.overall.toFixed(1)}
                              <Star size={12} className="ml-0.5" />
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <div className="text-sm" style={{ color: 'var(--foreground)' }}>{trainer.completionRate}%</div>
                          <div className="w-16 rounded-full h-1.5 mx-auto" style={{ background: parseColorToRgba(mutedColor, 0.12) }}>
                            <div
                              className={`h-1.5 rounded-full ${trainer.completionRate >= 80 ? 'bg-green-500' :
                                trainer.completionRate >= 60 ? 'bg-blue-500' :
                                  trainer.completionRate >= 40 ? 'bg-amber-500' :
                                    'bg-red-500'
                                }`}
                              style={{ width: `${trainer.completionRate}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Feedback Ratings Breakdown */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-8 rounded-xl shadow-sm overflow-hidden"
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)' }}
        >
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--foreground)' }}>
                <BarChart3 size={18} style={{ color: primaryColor }} className="mr-2" />
                Feedback Ratings Breakdown
              </h2>
            </div>
          </div>
          <div className="p-6">
            {feedbackLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            ) : feedbackError ? (
              <div className="h-64 flex items-center justify-center text-red-500">
                Failed to load feedback data
              </div>
            ) : !detailedFeedbackData ? (
              <div className="h-64 flex items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
                No feedback data available
              </div>
            ) : (
              <div className="h-64">
                <Bar
                  data={{
                    ...detailedFeedbackData,
                    datasets: detailedFeedbackData.datasets.map(ds => ({
                      ...ds,
                      barThickness: 40
                    }))
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 5,
                        grid: {
                          color: parseColorToRgba(mutedColor, 0.05),
                        },
                        ticks: {
                          stepSize: 1
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Participant Engagement */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-4 rounded-xl shadow-sm overflow-hidden"
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)' }}
        >
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--foreground)' }}>
                <Activity size={18} style={{ color: primaryColor }} className="mr-2" />
                Participant Engagement
              </h2>
            </div>
          </div>
          <div className="p-6">
            {engagementLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            ) : engagementError ? (
              <div className="h-64 flex items-center justify-center text-red-500">
                Failed to load engagement data
              </div>
            ) : !engagementData?.topParticipants || engagementData.topParticipants.length === 0 ? (
              <div className="h-64 flex items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
                No engagement data available
              </div>
            ) : (
              <div className="h-64 overflow-y-auto">
                {engagementData.topParticipants.slice(0, 5).map((participant, idx) => (
                  <div
                    key={participant.id}
                    className="mb-3 pb-3 border-b last:mb-0 last:border-b-0 last:pb-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${idx === 0 ? 'bg-indigo-600' :
                          idx === 1 ? 'bg-blue-600' :
                            idx === 2 ? 'bg-green-600' :
                              'bg-gray-600'
                          }`}>
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{participant.name}</div>
                          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{participant.organization}</div>
                        </div>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${participant.engagementScore >= 80 ? 'bg-green-100 text-green-800' :
                          participant.engagementScore >= 60 ? 'bg-blue-100 text-blue-800' :
                            participant.engagementScore >= 40 ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                          }`}
                      >
                        {participant.engagementScore}%
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="flex justify-between" style={{ color: 'var(--muted-foreground)' }}>
                          <span>Attendance:</span>
                          <span className="font-medium">{participant.attendanceRate}%</span>
                        </div>
                        <div className="w-full rounded-full h-1 mt-1" style={{ background: parseColorToRgba(mutedColor, 0.12) }}>
                          <div
                            className={`h-1 rounded-full ${participant.attendanceRate >= 80 ? 'bg-green-500' :
                              participant.attendanceRate >= 60 ? 'bg-blue-500' :
                                participant.attendanceRate >= 40 ? 'bg-amber-500' :
                                  'bg-red-500'
                              }`}
                            style={{ width: `${participant.attendanceRate}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between" style={{ color: 'var(--muted-foreground)' }}>
                          <span>Feedback:</span>
                          <span className="font-medium">{participant.feedbackRate}%</span>
                        </div>
                        <div className="w-full rounded-full h-1 mt-1" style={{ background: parseColorToRgba(mutedColor, 0.12) }}>
                          <div
                            className={`h-1 rounded-full ${participant.feedbackRate >= 80 ? 'bg-green-500' :
                              participant.feedbackRate >= 60 ? 'bg-blue-500' :
                                participant.feedbackRate >= 40 ? 'bg-amber-500' :
                                  'bg-red-500'
                              }`}
                            style={{ width: `${participant.feedbackRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Monthly Participation Trend */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-6 rounded-xl shadow-sm overflow-hidden"
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)' }}
        >
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--foreground)' }}>
                <Users size={18} style={{ color: primaryColor }} className="mr-2" />
                Monthly Participation
              </h2>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Last 6 months</span>
            </div>
          </div>
          <div className="p-6">
            {engagementLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            ) : engagementError ? (
              <div className="h-64 flex items-center justify-center text-red-500">
                Failed to load monthly participation data
              </div>
            ) : !participationTrendData ? (
              <div className="h-64 flex items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
                No participation trend data available
              </div>
            ) : (
              <div className="h-64">
                <Line
                  data={participationTrendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: parseColorToRgba(mutedColor, 0.05),
                        },
                        ticks: {
                          precision: 0
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Attendance Rates */}
        <motion.div
          variants={itemVariants}
          className="col-span-12 lg:col-span-6 rounded-xl shadow-sm overflow-hidden"
          style={{ background: 'var(--card)', color: 'var(--card-foreground)', border: '1px solid var(--border)' }}
        >
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--foreground)' }}>
                <CalendarCheck size={18} style={{ color: primaryColor }} className="mr-2" />
                Training Attendance Rates
              </h2>
            </div>
          </div>
          <div className="p-6">
            {attendanceLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            ) : attendanceError ? (
              <div className="h-64 flex items-center justify-center text-red-500">
                Failed to load attendance data
              </div>
            ) : !attendanceData?.trainingAttendanceRates || attendanceData.trainingAttendanceRates.length === 0 ? (
              <div className="h-64 flex items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
                No attendance rate data available
              </div>
            ) : (
              <div className="h-64 overflow-y-auto">
                {attendanceData.trainingAttendanceRates.slice(0, 6).map((training) => (
                  <div key={training.id} className="mb-4 last:mb-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm font-medium truncate pr-4 max-w-xs" style={{ color: 'var(--foreground)' }}>
                        {training.title}
                      </div>
                      <div
                        className={`text-sm font-medium ${training.attendanceRate >= 80 ? 'text-green-600' :
                          training.attendanceRate >= 60 ? 'text-blue-600' :
                            training.attendanceRate >= 40 ? 'text-amber-600' :
                              'text-red-600'
                          }`}
                      >
                        {training.attendanceRate}%
                      </div>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ background: parseColorToRgba(mutedColor, 0.12) }}>
                      <div
                        className={`h-2 rounded-full ${training.attendanceRate >= 80 ? 'bg-green-500' :
                          training.attendanceRate >= 60 ? 'bg-blue-500' :
                            training.attendanceRate >= 40 ? 'bg-amber-500' :
                              'bg-red-500'
                          }`}
                        style={{ width: `${training.attendanceRate}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      <span>
                        {format(new Date(training.endDate), 'MMM d, yyyy')}
                      </span>
                      <span>
                        {training.attendanceCount} / {training.participantsCount} attended
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Training Quality Score */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg overflow-hidden text-white p-6 mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="rounded-lg p-3 mb-3 inline-block" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <CalendarCheck size={24} />
            </div>
            <div className="text-2xl font-bold">
              {dashboardLoading ? "..." :
                dashboardData?.summary ?
                  `${Math.round((dashboardData.summary.completedTrainings / dashboardData.summary.totalTrainings) * 100) || 0}%` :
                  "0%"
              }
            </div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>Completion Rate</div>
          </div>

          <div className="text-center">
            <div className="rounded-lg p-3 mb-3 inline-block" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Star size={24} />
            </div>
            <div className="text-2xl font-bold">
              {feedbackLoading ? "..." :
                feedbackData?.overallAverages ?
                  feedbackData.overallAverages.overall.toFixed(1) :
                  "0.0"
              }
            </div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>Overall Rating</div>
          </div>

          <div className="text-center">
            <div className="rounded-lg p-3 mb-3 inline-block" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <CheckCircle size={24} />
            </div>
            <div className="text-2xl font-bold">
              {attendanceLoading ? "..." :
                attendanceData?.statusDistribution ?
                  `${attendanceData.statusDistribution.find(s => s.status === 'PRESENT')?.percentage || 0}%` :
                  "0%"
              }
            </div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>Attendance Rate</div>
          </div>

          <div className="text-center">
            <div className="rounded-lg p-3 mb-3 inline-block" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Building size={24} />
            </div>
            <div className="text-2xl font-bold">
              {engagementData?.topParticipants ?
                new Set(engagementData.topParticipants.map(p => p.organization)).size :
                0
              }
            </div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>Organizations</div>
          </div>

          <div className="text-center">
            <div className="rounded-lg p-3 mb-3 inline-block" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <FileText size={24} />
            </div>
            <div className="text-2xl font-bold">
              {trainerLoading ? "..." :
                trainerData?.trainers ?
                  trainerData.trainers.length :
                  0
              }
            </div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>Active Trainers</div>
          </div>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row items-center justify-between rounded-xl shadow-sm p-6"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Need to schedule a new training?</h3>
          <p style={{ color: 'var(--muted-foreground)' }}>Create a new training session for your team or organization.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={() => {/* Create training functionality */ }}
          >
            Create Training
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TrainingDashboard;