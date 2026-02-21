import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Search, 
  MessageSquareText, 
  Users, 
  BookOpen, 
  Clock, 
  Calendar as CalendarIcon,
  EyeOff,
  RefreshCw,
  PieChart,
  ArrowLeft,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { API_ROUTES } from '../../../utils/api';
import { format, addMonths, subMonths, isToday } from 'date-fns';

// Type definitions
interface Training {
  id: string;
  title: string;
  status: string;
  trainingType: string;
  startDate: string;
  endDate: string;
  location: string;
  trainer: {
    id: string;
    name: string;
    email: string;
  };
  sessions: Session[];
  _count: {
    participants: number;
    sessions: number;
  };
}

interface Session {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  venue: string;
  trainingId?: string;
  trainingTitle?: string;
}

interface CalendarDay {
  day: number;
  date: Date;
  isWeekend: boolean;
  trainings: Training[];
  sessions: Session[];
}

interface CalendarResponse {
  calendarInfo: {
    id: string;
    month: number;
    year: number;
    description: string;
  };
  month: number;
  year: number;
  firstDayOfMonth: number;
  daysInMonth: number;
  days: CalendarDay[];
  trainings: Training[];
  statistics: {
    totalTrainings: number;
    scheduledTrainings: number;
    completedTrainings: number;
    inProgressTrainings: number;
    cancelledTrainings: number;
  };
}

interface DailyCalendarResponse {
  date: string;
  day: number;
  month: number;
  year: number;
  trainings: Training[];
  trainingsCount: number;
}

interface StatisticsResponse {
  calendar?: {
    id: string;
    month: number;
    year: number;
    description: string;
  };
  month: number;
  year: number;
  calendarExists: boolean;
  statistics: {
    totalTrainings: number;
    totalParticipants?: number;
    totalSessions?: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  recentTrainings?: any[];
  upcomingSessions?: any[];
}

// Status color mapping - theme aware
const getStatusClasses = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    case 'POSTPONED':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Training type color mapping - theme aware
const getTrainingTypeClasses = (type: string) => {
  switch (type) {
    case 'TECHNICAL':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
    case 'SAFETY':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    case 'COMPLIANCE':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300';
    case 'ONBOARDING':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300';
    case 'WORKSHOP':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300';
    case 'SEMINAR':
      return 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300';
    case 'PROFESSIONAL_DEVELOPMENT':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Calendar component
const TrainingCalendar: React.FC = () => {
  // State management
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day' | 'stats'>('month');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [calendarDescription, setCalendarDescription] = useState<string>('');
  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);
  const [filters, setFilters] = useState({
    status: '',
    trainingType: '',
    search: '',
    detailLevel: 'overview' as 'overview' | 'detailed' | 'compact'
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  const queryClient = useQueryClient();
  
  // Get auth token from local storage
  const authToken = localStorage.getItem('authToken');
  
  // API configuration with auth token
  const apiConfig = {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  };

  // Fetch monthly calendar data
  const { 
    data: monthlyData, 
    isLoading: isLoadingMonthly,
    isError: isErrorMonthly,
    refetch: refetchMonthly
  } = useQuery<CalendarResponse>({
    queryKey: ['monthlyCalendar', currentDate.getMonth() + 1, currentDate.getFullYear(), filters],
    queryFn: async () => {
      const response = await api.get(
        `${API_ROUTES.TRAINING.GET_MONTHLY_CALENDAR}`, {
          ...apiConfig,
          params: {
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear(),
            detailLevel: filters.detailLevel,
            ...(filters.status && { status: filters.status }),
            ...(filters.trainingType && { trainingType: filters.trainingType })
          }
        }
      );
      return response.data;
    }
  });

  // Fetch daily calendar data when a day is selected
  const { 
    data: dailyData, 
    isLoading: isLoadingDaily,
    isError: isErrorDaily 
  } = useQuery<DailyCalendarResponse>({
    queryKey: ['dailyCalendar', selectedDay],
    queryFn: async () => {
      if (!selectedDay) return null;
      const dateString = format(selectedDay, 'yyyy-MM-dd');
      const response = await api.get(
        `${API_ROUTES.TRAINING.GET_DAILY_CALENDAR(dateString)}`,
        apiConfig
      );
      return response.data;
    },
    enabled: viewMode === 'day' && !!selectedDay
  });

  // Fetch calendar statistics
  const { 
    data: statsData, 
    isLoading: isLoadingStats,
    isError: isErrorStats 
  } = useQuery<StatisticsResponse>({
    queryKey: ['calendarStats', currentDate.getMonth() + 1, currentDate.getFullYear()],
    queryFn: async () => {
      const response = await api.get(
        `${API_ROUTES.TRAINING.GET_CALENDAR_STATISTICS}`,
        {
          ...apiConfig,
          params: {
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
          }
        }
      );
      return response.data;
    },
    enabled: viewMode === 'stats'
  });

  // Update calendar description
  const updateDescription = async () => {
    try {
      await api.post(
        API_ROUTES.TRAINING.UPDATE_CALENDAR_DESCRIPTION(
          (currentDate.getMonth() + 1).toString(),
          currentDate.getFullYear().toString()
        ),
        { description: calendarDescription },
        apiConfig
      );
      setIsEditingDescription(false);
      queryClient.invalidateQueries({ queryKey: ['monthlyCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['calendarStats'] });
    } catch (error) {
      console.error("Failed to update description:", error);
    }
  };

  // Navigation handlers
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Filter handlers
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Set initial description from API data
  useEffect(() => {
    if (monthlyData?.calendarInfo?.description) {
      setCalendarDescription(monthlyData.calendarInfo.description);
    }
  }, [monthlyData]);

  // Handle back to monthly view from daily view
  const handleBackToMonthly = () => {
    setViewMode('month');
    setSelectedDay(null);
  };

  // Day click handler
  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day.date);
    setViewMode('day');
  };

  // Filter training items based on search term
  const filterTrainings = (trainings: Training[]) => {
    if (!filters.search) return trainings;
    
    return trainings.filter(training => 
      training.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      training.location?.toLowerCase().includes(filters.search.toLowerCase()) ||
      training.trainer?.name?.toLowerCase().includes(filters.search.toLowerCase())
    );
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
  };

  // Loading indicator
  if (
    (viewMode === 'month' && isLoadingMonthly) || 
    (viewMode === 'day' && isLoadingDaily) || 
    (viewMode === 'stats' && isLoadingStats)
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-primary"
        >
          <RefreshCw size={40} />
        </motion.div>
        <p className="ml-3 text-lg font-medium text-foreground">Loading calendar...</p>
      </div>
    );
  }

  // Error handling
  if (
    (viewMode === 'month' && isErrorMonthly) || 
    (viewMode === 'day' && isErrorDaily) || 
    (viewMode === 'stats' && isErrorStats)
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="p-8 bg-card rounded-lg shadow-lg border border-border">
          <p className="text-destructive text-xl font-semibold">Error loading calendar data</p>
          <button 
            onClick={() => {
              if (viewMode === 'month') refetchMonthly();
              else if (viewMode === 'day') setViewMode('month');
              else setViewMode('month');
            }}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background training-calendar-wrapper">
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="container mx-auto py-8 px-4 sm:px-6"
        >
          {/* Header Section */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Training Calendar</h1>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setViewMode('month')} 
                    className={`px-4 py-2 rounded-full flex items-center transition-colors ${
                      viewMode === 'month' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-card text-foreground hover:bg-muted border border-border'
                    }`}
                  >
                    <CalendarIcon size={18} className="mr-2" />
                    Monthly
                  </button>
                  <button 
                    onClick={() => setViewMode('stats')} 
                    className={`px-4 py-2 rounded-full flex items-center transition-colors ${
                      viewMode === 'stats' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-card text-foreground hover:bg-muted border border-border'
                    }`}
                  >
                    <PieChart size={18} className="mr-2" />
                    Statistics
                  </button>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0 flex flex-wrap gap-2 items-center">
                <button 
                  onClick={goToPreviousMonth} 
                  className="p-2 bg-card rounded-full shadow-sm hover:bg-muted transition-colors border border-border"
                >
                  <ChevronLeft size={20} className="text-foreground" />
                </button>
                
                {/* Month selector */}
                <div className="relative">
                  <select
                    value={currentDate.getMonth()}
                    onChange={(e) => {
                      const newDate = new Date(currentDate);
                      newDate.setMonth(parseInt(e.target.value));
                      setCurrentDate(newDate);
                    }}
                    className="appearance-none bg-card border border-border text-foreground font-medium py-1.5 pl-3 pr-8 rounded-lg shadow-sm hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
                
                {/* Year selector */}
                <div className="relative">
                  <select
                    value={currentDate.getFullYear()}
                    onChange={(e) => {
                      const newDate = new Date(currentDate);
                      newDate.setFullYear(parseInt(e.target.value));
                      setCurrentDate(newDate);
                    }}
                    className="appearance-none bg-card border border-border text-foreground font-medium py-1.5 pl-3 pr-8 rounded-lg shadow-sm hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
                
                <button 
                  onClick={goToToday} 
                  className="px-4 py-2 bg-card rounded-full shadow-sm hover:bg-muted transition-colors font-medium text-foreground border border-border"
                >
                  Today
                </button>
                
                <button 
                  onClick={goToNextMonth} 
                  className="p-2 bg-card rounded-full shadow-sm hover:bg-muted transition-colors border border-border"
                >
                  <ChevronRight size={20} className="text-foreground" />
                </button>
              </div>
            </div>
            
            <motion.div 
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-2xl font-semibold text-foreground">
                {format(currentDate, 'MMMM yyyy')}
              </div>
              
              <div className="mt-4 sm:mt-0 flex space-x-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search trainings..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10 pr-4 py-2 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 bg-card text-foreground placeholder:text-muted-foreground"
                  />
                  <Search size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
                </div>
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 bg-card rounded-full shadow-sm hover:bg-muted transition-colors relative border border-border"
                >
                  {showFilters ? (
                    <EyeOff size={20} className="text-foreground" />
                  ) : (
                    <Filter size={20} className="text-foreground" />
                  )}
                  {(filters.status || filters.trainingType || filters.detailLevel !== 'overview') && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></span>
                  )}
                </button>
              </div>
            </motion.div>
            
            {/* Filters Section */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mt-4"
                >
                  <div className="p-4 bg-card rounded-lg shadow-sm border border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Training Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary bg-card text-foreground"
                      >
                        <option value="">All Statuses</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="POSTPONED">Postponed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Training Type</label>
                      <select
                        value={filters.trainingType}
                        onChange={(e) => handleFilterChange('trainingType', e.target.value)}
                        className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary bg-card text-foreground"
                      >
                        <option value="">All Types</option>
                        <option value="TECHNICAL">Technical</option>
                        <option value="SAFETY">Safety</option>
                        <option value="COMPLIANCE">Compliance</option>
                        <option value="ONBOARDING">Onboarding</option>
                        <option value="WORKSHOP">Workshop</option>
                        <option value="SEMINAR">Seminar</option>
                        <option value="PROFESSIONAL_DEVELOPMENT">Professional Development</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Detail Level</label>
                      <select
                        value={filters.detailLevel}
                        onChange={(e) => handleFilterChange('detailLevel', e.target.value as any)}
                        className="w-full p-2 border border-border rounded-md focus:ring-primary focus:border-primary bg-card text-foreground"
                      >
                        <option value="overview">Overview</option>
                        <option value="detailed">Detailed</option>
                        <option value="compact">Compact</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Main Content Area */}
          {viewMode === 'month' && monthlyData && (
            <motion.div 
              className="bg-card rounded-xl shadow-md overflow-hidden border border-border"
              variants={cardVariants}
              initial="initial"
              animate="animate"
            >
              {/* Calendar Grid */}
              <div className="bg-card rounded-xl shadow-lg overflow-hidden border border-border">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 bg-muted border-b border-border">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                    <div 
                      key={day} 
                      className={`py-4 px-2 text-center font-semibold text-sm
                        ${index === 0 || index === 6 
                          ? 'text-destructive bg-destructive/5' 
                          : 'text-foreground'
                        } border-r last:border-r-0 border-border`}
                    >
                      <div className="hidden sm:block">{day}</div>
                      <div className="sm:hidden">{day.slice(0, 3)}</div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7">
                  {/* Empty cells for days before the first day of month */}
                  {Array.from({ length: monthlyData.firstDayOfMonth }).map((_, index) => (
                    <div 
                      key={`empty-${index}`} 
                      className="h-24 sm:h-32 lg:h-36 border-b border-r border-border bg-muted/30 last:border-r-0"
                    />
                  ))}
                  
                  {/* Calendar days */}
                  {monthlyData.days.map((day) => {
                    const filteredTrainings = filterTrainings(day.trainings);
                    const hasTrainings = filteredTrainings.length > 0;
                    const hasSessions = day.sessions.length > 0;
                    const isCurrentDay = isToday(day.date);
                    const isWeekendDay = day.isWeekend;
                    
                    return (
                      <motion.div 
                        key={`day-${day.day}`}
                        className={`relative h-24 sm:h-32 lg:h-36 border-b border-r border-border last:border-r-0 cursor-pointer group transition-all duration-200
                          ${isWeekendDay 
                            ? 'bg-muted/40 hover:bg-muted/60' 
                            : 'bg-card hover:bg-muted/30'
                          }
                          ${isCurrentDay 
                            ? 'ring-2 ring-primary ring-inset bg-primary/5' 
                            : ''
                          }
                          ${hasTrainings || hasSessions 
                            ? 'hover:shadow-lg hover:z-10' 
                            : 'hover:shadow-md'
                          }
                        `}
                        whileHover={{ 
                          scale: 1.02,
                          transition: { type: "spring", stiffness: 400, damping: 17 }
                        }}
                        onClick={() => handleDayClick(day)}
                      >
                        {/* Day Number */}
                        <div className="absolute top-2 right-2 flex items-center justify-center">
                          <span className={`text-lg font-bold transition-colors
                            ${isCurrentDay 
                              ? 'text-primary-foreground bg-primary rounded-full w-8 h-8 flex items-center justify-center shadow-md' 
                              : isWeekendDay 
                                ? 'text-destructive' 
                                : 'text-foreground group-hover:text-primary'
                            }
                          `}>
                            {day.day}
                          </span>
                        </div>
                        
                        {/* Activity Indicators */}
                        {(hasTrainings || hasSessions) && (
                          <div className="absolute top-2 left-2 flex gap-1">
                            {hasTrainings && (
                              <div className="w-2 h-2 bg-primary rounded-full shadow-sm animate-pulse" />
                            )}
                            {hasSessions && (
                              <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm animate-pulse" />
                            )}
                          </div>
                        )}
                        
                        {/* Training Items */}
                        <div className="absolute inset-x-2 bottom-2 top-10 overflow-hidden">
                          {hasTrainings && (
                            <div className="space-y-1 h-full">
                              {filteredTrainings.slice(0, 2).map((training, index) => (
                                <motion.div 
                                  key={training.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className={`relative p-1.5 rounded-md text-xs font-medium border-l-3 shadow-sm
                                    ${getStatusClasses(training.status)} 
                                    hover:shadow-md transition-all duration-200 group-hover:scale-105
                                  `}
                                  title={`${training.title} - ${training.status} - ${training.trainingType}`}
                                >
                                  <div className="truncate">{training.title}</div>
                                  <div className="flex items-center justify-between text-xs mt-0.5 opacity-75">
                                    <span className="truncate">{training.trainingType.split('_')[0]}</span>
                                    <div className="flex items-center gap-1">
                                      <Users size={10} />
                                      <span>{training._count?.participants || 0}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                              
                              {/* More items indicator */}
                              {filteredTrainings.length > 2 && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-xs font-semibold text-primary bg-primary/10 rounded-md p-1 text-center border border-primary/20 hover:bg-primary/20 transition-colors"
                                >
                                  +{filteredTrainings.length - 2} more
                                </motion.div>
                              )}
                            </div>
                          )}
                          
                          {/* Sessions indicator */}
                          {hasSessions && !hasTrainings && (
                            <div className="flex items-center justify-center h-full">
                              <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-2 text-center">
                                <Clock size={16} className="text-green-600 dark:text-green-400 mx-auto mb-1" />
                                <div className="text-xs font-medium text-green-800 dark:text-green-300">
                                  {day.sessions.length} session{day.sessions.length > 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Empty state */}
                          {!hasTrainings && !hasSessions && (
                            <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-30 transition-opacity">
                              <div className="text-xs text-muted-foreground font-medium">
                                No events
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Sessions count badge */}
                        {hasSessions && hasTrainings && (
                          <div className="absolute bottom-2 right-2">
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md"
                            >
                              {day.sessions.length}
                            </motion.div>
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md" />
                      </motion.div>
                    );
                  })}
                  
                  {/* Empty cells after the last day of month */}
                  {Array.from({ length: 42 - (monthlyData.firstDayOfMonth + monthlyData.daysInMonth) }).map((_, index) => (
                    <div 
                      key={`end-empty-${index}`} 
                      className="h-24 sm:h-32 lg:h-36 border-b border-r border-border bg-muted/30 last:border-r-0"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Calendar Notes Section */}
          {monthlyData?.calendarInfo && viewMode === 'month' && (
            <motion.div 
              className="mt-6 p-6 bg-card rounded-lg shadow-sm border border-border"
              variants={cardVariants}
              initial="initial"
              animate="animate"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <MessageSquareText size={18} className="mr-2 text-primary" />
                  Calendar Notes
                </h3>
                <button 
                  onClick={() => setIsEditingDescription(!isEditingDescription)}
                  className="text-primary hover:text-primary/80"
                >
                  {isEditingDescription ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              {isEditingDescription ? (
                <div className="mt-2">
                  <textarea
                    value={calendarDescription}
                    onChange={(e) => setCalendarDescription(e.target.value)}
                    className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-primary/50 focus:border-transparent bg-card text-foreground"
                    rows={3}
                    placeholder="Add description for this month's calendar..."
                  />
                  <div className="mt-2 flex justify-end">
                    <button 
                      onClick={updateDescription}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-muted-foreground">
                  {calendarDescription || "No description available for this month."}
                </p>
              )}
            </motion.div>
          )}

          {/* Daily View */}
          {viewMode === 'day' && dailyData && selectedDay && (
            <motion.div 
              variants={cardVariants}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              {/* Header Section */}
              <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl shadow-lg p-6 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="flex items-center mb-4 md:mb-0">
                    <motion.button 
                      onClick={handleBackToMonthly}
                      className="mr-4 flex items-center bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors backdrop-blur-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ArrowLeft size={20} />
                    </motion.button>
                    <div>
                      <h2 className="text-3xl font-bold">
                        {format(selectedDay, 'EEEE')}
                      </h2>
                      <p className="text-white/80 text-lg">
                        {format(selectedDay, 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{dailyData.trainingsCount}</div>
                      <div className="text-white/80 text-sm">Total Trainings</div>
                    </div>
                    <div className="w-px h-12 bg-white/30"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {dailyData.trainings.reduce((acc, t) => acc + (t.sessions?.length || 0), 0)}
                      </div>
                      <div className="text-white/80 text-sm">Total Sessions</div>
                    </div>
                  </div>
                </div>
              </div>

              {dailyData.trainings.length > 0 ? (
                <div className="space-y-6">
                  {/* Timeline View */}
                  <div className="bg-card rounded-2xl shadow-lg p-6 border border-border">
                    <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center">
                      <Clock size={24} className="mr-3 text-primary" />
                      Daily Timeline
                    </h3>
                    
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-secondary/50 to-primary/30"></div>
                      
                      <div className="space-y-6">
                        {filterTrainings(dailyData.trainings)
                          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                          .map((training, index) => (
                            <motion.div 
                              key={training.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="relative flex items-start"
                            >
                              {/* Timeline dot */}
                              <div className="absolute left-7 w-3 h-3 bg-primary rounded-full shadow-lg border-2 border-card z-10"></div>
                              
                              {/* Training card */}
                              <div className="ml-16 flex-1">
                                <motion.div 
                                  className="bg-card rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-border"
                                  whileHover={{ y: -2, scale: 1.01 }}
                                >
                                  <div className="flex justify-between items-start mb-4">
                                    <div>
                                      <h4 className="text-xl font-bold text-foreground mb-2">{training.title}</h4>
                                      <div className="flex flex-wrap gap-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClasses(training.status)}`}>
                                          {training.status.replace('_', ' ')}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTrainingTypeClasses(training.trainingType)}`}>
                                          {training.trainingType.replace('_', ' ')}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-semibold text-foreground">
                                        {format(new Date(training.startDate), 'h:mm a')}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Duration: {training.endDate ? 
                                          Math.round((new Date(training.endDate).getTime() - new Date(training.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 + ' days' :
                                          'TBD'
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Training details grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="flex items-center bg-muted rounded-lg p-3">
                                      <Users size={18} className="text-primary mr-2" />
                                      <div>
                                        <div className="text-sm text-muted-foreground">Participants</div>
                                        <div className="font-semibold text-foreground">
                                          {training._count?.participants || 0}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center bg-muted rounded-lg p-3">
                                      <BookOpen size={18} className="text-green-600 dark:text-green-400 mr-2" />
                                      <div>
                                        <div className="text-sm text-muted-foreground">Sessions</div>
                                        <div className="font-semibold text-foreground">
                                          {training._count?.sessions || 0}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center bg-muted rounded-lg p-3">
                                      <Calendar size={18} className="text-purple-600 dark:text-purple-400 mr-2" />
                                      <div>
                                        <div className="text-sm text-muted-foreground">Location</div>
                                        <div className="font-semibold text-foreground truncate">
                                          {training.location || 'Not specified'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Trainer info */}
                                  {training.trainer && (
                                    <div className="flex items-center bg-primary/10 rounded-lg p-3">
                                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mr-3">
                                        {training.trainer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-medium text-foreground">{training.trainer.name}</div>
                                        <div className="text-sm text-muted-foreground">{training.trainer.email}</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Sessions for this training */}
                                  {training.sessions && training.sessions.length > 0 && (
                                    <div className="mt-4">
                                      <h5 className="font-semibold text-foreground mb-3 flex items-center">
                                        <Clock size={16} className="mr-2 text-primary" />
                                        Today's Sessions
                                      </h5>
                                      <div className="space-y-2">
                                        {training.sessions.map((session, sessionIndex) => (
                                          <motion.div 
                                            key={session.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: (index * 0.1) + (sessionIndex * 0.05) }}
                                            className="bg-muted border-l-4 border-primary rounded-r-lg p-3 hover:shadow-md transition-shadow"
                                          >
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <div className="font-medium text-foreground">
                                                  {session.title || 'Session ' + (sessionIndex + 1)}
                                                </div>
                                                {session.venue && (
                                                  <div className="text-sm text-muted-foreground mt-1">
                                                    📍 {session.venue}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="text-right">
                                                <div className="font-semibold text-primary">
                                                  {format(new Date(session.startTime), 'h:mm a')} - {format(new Date(session.endTime), 'h:mm a')}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))} min
                                                </div>
                                              </div>
                                            </div>
                                          </motion.div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="bg-card rounded-2xl shadow-lg p-6 border border-border">
                    <h3 className="text-xl font-bold text-foreground mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center justify-center p-4 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        <BookOpen size={20} className="mr-2" />
                        Add Session
                      </motion.button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty State */
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl shadow-lg p-12 text-center border border-border"
                >
                  <div className="max-w-md mx-auto">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                      <Calendar size={40} className="text-primary" />
                    </motion.div>
                    
                    <h3 className="text-2xl font-bold text-foreground mb-3">No Trainings Scheduled</h3>
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                      There are no training activities scheduled for {format(selectedDay, 'EEEE, MMMM d, yyyy')}. 
                      Why not schedule something productive?
                    </p>
                    
                    <div className="space-y-3">
                      <motion.button
                        onClick={handleBackToMonthly}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="block w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                      >
                        <ArrowLeft size={18} className="inline mr-2" />
                        Back to Calendar
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="block w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                      >
                        <BookOpen size={18} className="inline mr-2" />
                        Schedule New Training
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Statistics View */}
          {viewMode === 'stats' && statsData && (
            <motion.div 
              variants={cardVariants}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div 
                  className="bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-md p-6 text-white"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  <h3 className="text-lg font-semibold opacity-90 mb-1">Total Trainings</h3>
                  <p className="text-3xl font-bold">{statsData.statistics.totalTrainings}</p>
                </motion.div>
                
                {statsData.statistics.totalParticipants !== undefined && (
                  <motion.div 
                    className="bg-gradient-to-br from-secondary to-secondary/80 rounded-xl shadow-md p-6 text-white"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    <h3 className="text-lg font-semibold opacity-90 mb-1">Total Participants</h3>
                    <p className="text-3xl font-bold">{statsData.statistics.totalParticipants}</p>
                  </motion.div>
                )}
                
                {statsData.statistics.totalSessions !== undefined && (
                  <motion.div 
                    className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl shadow-md p-6 text-white"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    <h3 className="text-lg font-semibold opacity-90 mb-1">Total Sessions</h3>
                    <p className="text-3xl font-bold">{statsData.statistics.totalSessions}</p>
                  </motion.div>
                )}
                
                <motion.div 
                  className="bg-gradient-to-br from-primary/90 to-secondary/90 rounded-xl shadow-md p-6 text-white"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  <h3 className="text-lg font-semibold opacity-90 mb-1">Month/Year</h3>
                  <p className="text-3xl font-bold">{format(currentDate, 'MMM yyyy')}</p>
                </motion.div>
              </div>
              
              {/* Statistics Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div 
                  className="bg-card rounded-xl shadow-md p-6 border border-border"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <h3 className="text-lg font-semibold text-foreground mb-4">Training Status Breakdown</h3>
                  
                  <div className="space-y-3">
                    {Object.entries(statsData.statistics.byStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                          status === 'SCHEDULED' ? 'bg-blue-500' :
                          status === 'IN_PROGRESS' ? 'bg-yellow-500' :
                          status === 'COMPLETED' ? 'bg-green-500' :
                          status === 'CANCELLED' ? 'bg-red-500' :
                          status === 'POSTPONED' ? 'bg-purple-500' : 'bg-gray-500'
                        }`}></div>
                        <span className="flex-1 text-foreground">{status.replace('_', ' ')}</span>
                        <span className="font-semibold text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
                
                <motion.div 
                  className="bg-card rounded-xl shadow-md p-6 border border-border"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <h3 className="text-lg font-semibold text-foreground mb-4">Training Type Breakdown</h3>
                  
                  <div className="space-y-3">
                    {Object.entries(statsData.statistics.byType)
                      .filter(([_, count]) => count > 0)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            type === 'TECHNICAL' ? 'bg-indigo-500' :
                            type === 'SAFETY' ? 'bg-orange-500' :
                            type === 'COMPLIANCE' ? 'bg-teal-500' :
                            type === 'ONBOARDING' ? 'bg-pink-500' :
                            type === 'WORKSHOP' ? 'bg-cyan-500' :
                            type === 'SEMINAR' ? 'bg-lime-500' :
                            type === 'PROFESSIONAL_DEVELOPMENT' ? 'bg-violet-500' : 'bg-gray-500'
                          }`}></div>
                          <span className="flex-1 text-foreground">{type.replace('_', ' ')}</span>
                          <span className="font-semibold text-foreground">{count}</span>
                        </div>
                      ))
                    }
                  </div>
                </motion.div>
              </div>
              
              {/* Recent Items */}
              {statsData.recentTrainings && statsData.upcomingSessions && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div 
                    className="bg-card rounded-xl shadow-md p-6 border border-border"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <h3 className="text-lg font-semibold text-foreground mb-4">Recent Trainings</h3>
                    
                    {statsData.recentTrainings.length > 0 ? (
                      <div className="space-y-3">
                        {statsData.recentTrainings.map(training => (
                          <div 
                            key={training.id}
                            className="p-3 border border-border rounded-lg bg-muted/30"
                          >
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-foreground">{training.title}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusClasses(training.status)}`}>
                                {training.status}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-2">
                              {format(new Date(training.startDate), 'MMM d')} - {format(new Date(training.endDate), 'MMM d, yyyy')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        No recent trainings found
                      </div>
                    )}
                  </motion.div>
                  
                  <motion.div 
                    className="bg-card rounded-xl shadow-md p-6 border border-border"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Sessions</h3>
                    
                    {statsData.upcomingSessions.length > 0 ? (
                      <div className="space-y-3">
                        {statsData.upcomingSessions.map(session => (
                          <div 
                            key={session.id}
                            className="p-3 border-l-4 border-primary bg-primary/5 rounded-r-lg"
                          >
                            <div className="font-medium text-foreground">{session.title || 'Untitled Session'}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Training: {session.training.title}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center">
                              <Clock size={14} className="mr-1" />
                              {format(new Date(session.startTime), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        No upcoming sessions found
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TrainingCalendar;
