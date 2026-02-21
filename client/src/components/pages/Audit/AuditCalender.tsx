import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  Filter,
  X,
  Info,
  AlertCircle,
  Users,
  Building,
  Grid,
  List,
  Layers,
  User,
  Calendar,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import axios from 'axios';
import { API_ROUTES } from '../../../utils/api';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

// Type definitions
interface AuditEvent {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  auditType: 'INTERNAL' | 'EXTERNAL' | 'COMPLIANCE' | 'PROCESS' | 'QUALITY' | 'SAFETY' | 'SUPPLIER' | 'SYSTEM';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED';
  auditor: {
    id: string;
    name: string;
    isExternal: boolean;
  };
  auditee?: {
    id: string;
    name: string;
  };
  department: string | null;
  color: string;
  borderColor: string;
}

interface Department {
  id: string;
  name: string;
}

interface CalendarFilters {
  year: number;
  month: number | null;
  auditType: string | null;
  status: string | null;
  departmentId: string | null;
  view: 'month' | 'week' | 'day' | 'list';
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.1
    }
  }
};

const headerVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      delay: 0.2
    }
  }
};

const filterVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: 0.3
    }
  }
};

const AuditCalendar: React.FC = () => {
  const navigate = useNavigate();
  const calendarRef = useRef<any>(null);
  
  // State for filters
  const [filters, setFilters] = useState<CalendarFilters>({
    year: new Date().getFullYear(),
    month: null,
    auditType: null,
    status: null,
    departmentId: null,
    view: 'month',
  });
  
  // UI States
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Calculate date range based on filters
  const dateRange = useMemo(() => {
    let start: Date, end: Date;
    
    if (filters.month !== null) {
      start = startOfMonth(new Date(filters.year, filters.month));
      end = endOfMonth(new Date(filters.year, filters.month));
    } else {
      start = startOfYear(new Date(filters.year, 0));
      end = endOfYear(new Date(filters.year, 11));
    }
    
    return { start, end };
  }, [filters.year, filters.month]);

  // Fetch department data for filters
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await axios.get(API_ROUTES.AUDIT.GET_ALL_DEPARTMENTS, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return response.data.departments as Department[];
    }
  });

  // Fetch audit events based on filters
  const { data: calendarData, isLoading, isError, refetch } = useQuery({
    queryKey: ['auditCalendar', dateRange, filters.auditType, filters.status, filters.departmentId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      
      if (filters.auditType) params.append('auditType', filters.auditType);
      if (filters.status) params.append('status', filters.status);
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      
      const response = await axios.get(`${API_ROUTES.AUDIT.GET_AUDITS_FOR_CALENDAR}?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      return response.data;
    },
  });

  // Handler for filter changes with animation
  const handleFilterChange = (key: keyof CalendarFilters, value: any) => {
    setIsTransitioning(true);
    setFilters(prev => ({ ...prev, [key]: value }));
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // Reset all filters with animation
  const resetFilters = () => {
    setIsTransitioning(true);
    setFilters({
      year: new Date().getFullYear(),
      month: null,
      auditType: null,
      status: null,
      departmentId: null,
      view: 'month',
    });
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // Handle calendar view change
  const handleViewChange = (view: string) => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(view);
    }
    
    setFilters(prev => ({ 
      ...prev, 
      view: view === 'dayGridMonth' ? 'month' : 
            view === 'timeGridWeek' ? 'week' : 
            view === 'timeGridDay' ? 'day' : 'list'
    }));
  };

  // Handle event click to show details
  const handleEventClick = (info: any) => {
    const event = calendarData?.events.find((e: AuditEvent) => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
    }
  };
  
  // View audit details
  const viewAuditDetails = () => {
    if (selectedEvent) {
      navigate(`/audits/${selectedEvent.id}`);
    }
  };
  
  // Generate years for year selector (5 years back and forward)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  }, []);

  // Navigation controls for calendar
  const handlePrevious = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().prev();
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().next();
    }
  };

  const handleToday = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-1 sm:px-2 lg:px-3 py-2">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border"
        >
          {/* Enhanced Header Section */}
          <div className="bg-primary relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px), radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
                backgroundSize: '50px 50px'
              }}></div>
            </div>
            
            <div className="relative p-8">
              <motion.div 
                variants={headerVariants}
                className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
              >
                <div className="flex items-center">
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="bg-white/20 backdrop-blur-sm p-3 rounded-xl mr-4 border border-white/30"
                  >
                    <CalendarIcon size={32} className="text-primary-foreground drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <motion.h1 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-3xl font-bold text-primary-foreground drop-shadow-lg"
                    >
                      Audit Calendar
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-primary-foreground/80 text-lg mt-1 flex items-center"
                    >
                      <Sparkles size={16} className="mr-2" />
                      {filters.month !== null
                        ? `${format(new Date(filters.year, filters.month), 'MMMM yyyy')}`
                        : `Year ${filters.year}`}
                    </motion.p>
                  </div>
                </div>

                <motion.div 
                  variants={filterVariants}
                  className="flex flex-wrap gap-3"
                >
                  {/* Year Filter */}
                  <div className="relative">
                    <select
                      value={filters.year}
                      onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
                      className="appearance-none bg-white/20 backdrop-blur-sm text-primary-foreground rounded-xl pl-4 pr-10 py-3 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/30 transition-all font-medium shadow-lg"
                    >
                      {years.map(year => (
                        <option key={year} value={year} className="text-foreground bg-card">
                          {year}
                        </option>
                      ))}
                    </select>
                    <ChevronRight size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/70 pointer-events-none" />
                  </div>
                  
                  {/* Month Filter */}
                  <div className="relative">
                    <select
                      value={filters.month !== null ? filters.month : ''}
                      onChange={(e) => handleFilterChange('month', e.target.value ? parseInt(e.target.value) : null)}
                      className="appearance-none bg-white/20 backdrop-blur-sm text-primary-foreground rounded-xl pl-4 pr-10 py-3 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/30 transition-all font-medium shadow-lg"
                    >
                      <option value="" className="text-foreground bg-card">All Months</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i} className="text-foreground bg-card">
                          {format(new Date(2000, i), 'MMMM')}
                        </option>
                      ))}
                    </select>
                    <ChevronRight size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/70 pointer-events-none" />
                  </div>
                  
                  {/* Filter Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 rounded-xl px-5 py-3 border font-medium shadow-lg transition-all ${
                      showFilters || (filters.auditType || filters.status || filters.departmentId)
                        ? 'bg-card text-primary border-transparent shadow-xl'
                        : 'bg-white/20 backdrop-blur-sm text-primary-foreground border-white/30 hover:bg-white/30'
                    }`}
                  >
                    <Filter size={18} />
                    <span>Filters</span>
                    {(filters.auditType || filters.status || filters.departmentId) && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-primary text-primary-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold"
                      >
                        {[filters.auditType, filters.status, filters.departmentId].filter(Boolean).length}
                      </motion.span>
                    )}
                  </motion.button>
                  
                  {/* View Toggle */}
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 flex overflow-hidden shadow-lg">
                    <motion.button
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                      onClick={() => setViewMode('calendar')}
                      className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                        viewMode === 'calendar' 
                          ? 'bg-card text-primary shadow-lg' 
                          : 'text-primary-foreground'
                      }`}
                    >
                      <Calendar size={18} />
                      <span className="hidden sm:inline">Calendar</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                        viewMode === 'list' 
                          ? 'bg-card text-primary shadow-lg' 
                          : 'text-primary-foreground'
                      }`}
                    >
                      <List size={18} />
                      <span className="hidden sm:inline">List</span>
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
          
          {/* Enhanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="bg-muted/50 border-b border-border overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <motion.h2 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xl font-bold text-foreground flex items-center"
                    >
                      <Filter size={20} className="mr-2 text-primary" />
                      Advanced Filters
                    </motion.h2>
                    
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetFilters}
                      className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all font-medium"
                    >
                      <RotateCcw size={16} />
                      Reset All
                    </motion.button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Audit Type */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="space-y-2"
                    >
                      <label className="block text-sm font-semibold text-foreground items-center">
                        <Layers size={16} className="mr-2 text-primary" />
                        Audit Type
                      </label>
                      <select
                        value={filters.auditType || ''}
                        onChange={(e) => handleFilterChange('auditType', e.target.value || null)}
                        className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all bg-card text-foreground shadow-sm hover:shadow-md"
                      >
                        <option value="">All Types</option>
                        <option value="INTERNAL">Internal</option>
                        <option value="EXTERNAL">External</option>
                        <option value="COMPLIANCE">Compliance</option>
                        <option value="PROCESS">Process</option>
                        <option value="QUALITY">Quality</option>
                        <option value="SAFETY">Safety</option>
                        <option value="SUPPLIER">Supplier</option>
                        <option value="SYSTEM">System</option>
                      </select>
                    </motion.div>
                    
                    {/* Status */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-2"
                    >
                      <label className=" text-sm font-semibold text-foreground flex items-center">
                        <AlertCircle size={16} className="mr-2 text-emerald-600 dark:text-emerald-400" />
                        Status
                      </label>
                      <select
                        value={filters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value || null)}
                        className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all bg-card text-foreground shadow-sm hover:shadow-md"
                      >
                        <option value="">All Statuses</option>
                        <option value="PLANNED">Planned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="DELAYED">Delayed</option>
                      </select>
                    </motion.div>
                    
                    {/* Department */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-2"
                    >
                      <label className=" text-sm font-semibold text-foreground flex items-center">
                        <Building size={16} className="mr-2 text-secondary" />
                        Department
                      </label>
                      <select
                        value={filters.departmentId || ''}
                        onChange={(e) => handleFilterChange('departmentId', e.target.value || null)}
                        className="w-full border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all bg-card text-foreground shadow-sm hover:shadow-md"
                      >
                        <option value="">All Departments</option>
                        {departments?.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 flex justify-end"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowFilters(false)}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all font-medium shadow-lg hover:shadow-xl"
                    >
                      Apply Filters
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* View Mode Selector - Calendar Only */}
          {viewMode === 'calendar' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex border-b border-border bg-card p-4 gap-2"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleViewChange('dayGridMonth')}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  filters.view === 'month' 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Grid size={16} className="inline-block mr-2" />
                Month
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleViewChange('timeGridWeek')}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  filters.view === 'week' 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Layers size={16} className="inline-block mr-2" />
                Week
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleViewChange('listMonth')}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  filters.view === 'list' 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <List size={16} className="inline-block mr-2" />
                List
              </motion.button>
              
              {/* Calendar Navigation */}
              <div className="ml-auto flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrevious}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <ArrowLeft size={18} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToday}
                  className="px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                >
                  Today
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNext}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <ArrowRight size={18} />
                </motion.button>
              </div>
            </motion.div>
          )}
          
          {/* Enhanced Content Area */}
          <div className="p-6">
            {isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col justify-center items-center h-96"
              >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="rounded-full h-16 w-16 border-4 border-muted border-t-primary mb-4"
                />
                <p className="text-muted-foreground font-medium">Loading calendar events...</p>
              </motion.div>
            ) : isError ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center h-96 bg-destructive/10 rounded-xl border border-destructive/30"
              >
                <AlertCircle size={64} className="text-destructive mb-4" />
                <h3 className="text-xl font-bold text-destructive mb-2">Failed to load calendar data</h3>
                <p className="text-destructive/80 mb-4">Please try again later or contact support.</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => refetch()} 
                  className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 font-medium shadow-lg"
                >
                  Retry
                </motion.button>
              </motion.div>
            ) : calendarData?.events?.length === 0 ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center h-96 bg-primary/5 rounded-xl border border-primary/20"
              >
                <Calendar size={64} className="text-primary/60 mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">No audits scheduled</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your filters or create a new audit.</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/audits/new')} 
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium shadow-lg"
                >
                  Create Audit
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: isTransitioning ? 0.5 : 1, scale: isTransitioning ? 0.95 : 1 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden rounded-xl border border-border shadow-lg audit-calendar-wrapper"
              >
                {viewMode === 'calendar' ? (
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={
                      filters.view === 'month' ? 'dayGridMonth' : 
                      filters.view === 'week' ? 'timeGridWeek' : 
                      filters.view === 'day' ? 'timeGridDay' : 'listMonth'
                    }
                    headerToolbar={false}
                    events={calendarData.events}
                    eventClick={handleEventClick}
                    height="auto"
                    aspectRatio={1.8}
                    eventTimeFormat={{
                      hour: '2-digit',
                      minute: '2-digit',
                      meridiem: 'short'
                    }}
                    eventClassNames="cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                    eventContent={(arg: { event: any; view: { type: string; }; }) => {
                      const event = arg.event;
                      const status = event.extendedProps.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED';
                      const type = event.extendedProps.auditType;
                      
                      const statusDotMap: Record<'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED', string> = {
                        'PLANNED': 'bg-blue-500 shadow-blue-500/50',
                        'IN_PROGRESS': 'bg-amber-500 shadow-amber-500/50',
                        'COMPLETED': 'bg-green-500 shadow-green-500/50',
                        'CANCELLED': 'bg-red-500 shadow-red-500/50',
                        'DELAYED': 'bg-purple-500 shadow-purple-500/50',
                      };
                      
                      const statusDot = statusDotMap[status] || 'bg-gray-500';
                      const typeBorder = type === 'INTERNAL' ? 'border-l-blue-600' : 'border-l-red-600';
                      
                      if (arg.view.type === 'dayGridMonth') {
                        return (
                          <div className={`px-3 py-2 overflow-hidden border-l-4 rounded-r-lg shadow-sm hover:shadow-md transition-all ${typeBorder}`} 
                               style={{ backgroundColor: event.backgroundColor }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full shadow-lg ${statusDot}`}></span>
                              <span className="text-xs font-semibold truncate text-white drop-shadow-sm">{event.title}</span>
                            </div>
                            {!event.allDay && (
                              <div className="text-xs opacity-90 text-white">
                                {format(new Date(event.start!), 'HH:mm')}
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <div className={`p-3 overflow-hidden border-l-4 rounded-r-lg h-full flex flex-col shadow-lg ${typeBorder}`}
                               style={{ backgroundColor: event.backgroundColor }}>
                            <div className="font-semibold mb-2 truncate text-white drop-shadow-sm">{event.title}</div>
                            <div className="flex items-center gap-2 text-xs mb-2">
                              <span className={`w-3 h-3 rounded-full shadow-lg ${statusDot}`}></span>
                              <span className="text-white font-medium">{status}</span>
                            </div>
                            {event.extendedProps.auditor && (
                              <div className="text-xs opacity-90 truncate text-white">
                                Auditor: {event.extendedProps.auditor.name}
                              </div>
                            )}
                          </div>
                        );
                      }
                    }}
                  />
                ) : (
                  <div className="overflow-x-auto bg-card">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                            Name & Type
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                            Auditor
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                            Department
                          </th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-foreground uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {calendarData.events.map((event: AuditEvent, index: number) => (
                          <motion.tr 
                            key={event.id} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-muted/50 transition-all duration-200"
                          >
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-start">
                                <div className={`flex-shrink-0 w-3 h-12 rounded-full mr-4 shadow-lg ${
                                  event.auditType === 'INTERNAL' ? 'bg-gradient-to-b from-blue-400 to-blue-600' : 'bg-gradient-to-b from-red-400 to-red-600'
                                }`}></div>
                                <div>
                                  <div className="text-sm font-semibold text-foreground">{event.title}</div>
                                  <div className="text-xs text-muted-foreground font-medium">{event.auditType}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                                event.status === 'PLANNED' ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800' :
                                event.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800' :
                                event.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' :
                                event.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800' :
                                'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800'
                              }`}>
                                {event.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">
                                {format(new Date(event.start), 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(event.start), 'HH:mm')} - 
                                {event.end ? 
                                  format(new Date(event.end), ' HH:mm') : 
                                  format(new Date(new Date(event.start).getTime() + (2 * 60 * 60 * 1000)), ' HH:mm')}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mr-3 shadow-sm">
                                  <User size={16} />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-foreground">
                                    {event.auditor.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-medium">
                                    {event.auditor.isExternal ? 'External' : 'Internal'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              {event.department ? (
                                <div className="flex items-center">
                                  <Building size={16} className="text-secondary mr-2" />
                                  <span className="text-sm text-foreground font-medium">{event.department}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not specified</span>
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setSelectedEvent(event)}
                                  className="text-primary hover:opacity-80 p-2 rounded-lg hover:bg-primary/10 transition-all"
                                >
                                  View
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => navigate(`/audits/${event.id}`)}
                                  className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-all"
                                >
                                  <ExternalLink size={16} />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </div>
          
          {/* Enhanced Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="px-8 py-6 bg-muted/50 border-t border-border"
          >
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center">
              <Info size={16} className="mr-2 text-primary" />
              Legend
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="flex items-center">
                <span className="inline-block w-4 h-4 rounded-full bg-blue-500 mr-2 shadow-sm"></span>
                <span className="text-xs text-foreground font-medium">Planned</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-4 h-4 rounded-full bg-amber-500 mr-2 shadow-sm"></span>
                <span className="text-xs text-foreground font-medium">In Progress</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-4 h-4 rounded-full bg-green-500 mr-2 shadow-sm"></span>
                <span className="text-xs text-foreground font-medium">Completed</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-4 h-4 rounded-full bg-red-500 mr-2 shadow-sm"></span>
                <span className="text-xs text-foreground font-medium">Cancelled</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-4 h-4 rounded-full bg-purple-500 mr-2 shadow-sm"></span>
                <span className="text-xs text-foreground font-medium">Delayed</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-4 h-3 border-l-4 border-blue-600 mr-2 bg-muted"></span>
                <span className="text-xs text-foreground font-medium">Internal</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-4 h-3 border-l-4 border-red-600 mr-2 bg-muted"></span>
                <span className="text-xs text-foreground font-medium">External</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
        
        {/* Enhanced Event Details Modal */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border"
              >
                {/* Enhanced Modal Header */}
                <div className="px-8 py-6 bg-primary text-primary-foreground relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center">
                      <CalendarIcon size={24} className="mr-3" />
                      Audit Details
                    </h3>
                    <motion.button 
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedEvent(null)} 
                      className="text-primary-foreground/80 hover:text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                      <X size={20} />
                    </motion.button>
                  </div>
                </div>
                
                {/* Enhanced Modal Content */}
                <div className="px-8 py-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">{selectedEvent.title}</h2>
                      <div className="flex flex-wrap gap-2">
                        <span 
                          className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                            selectedEvent.auditType === 'INTERNAL' 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800' 
                              : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800'
                          }`}
                        >
                          {selectedEvent.auditType}
                        </span>
                        <span 
                          className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${
                            selectedEvent.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' :
                            selectedEvent.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800' :
                            selectedEvent.status === 'PLANNED' ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800' :
                            selectedEvent.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800' :
                            'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800'
                          }`}
                        >
                          {selectedEvent.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-8 py-6 bg-muted/50">
                  <div className="space-y-6">
                    {/* Date & Time */}
                    <div className="flex items-start">
                      <div className="p-2 bg-primary/10 rounded-lg mr-4">
                        <CalendarIcon size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-semibold mb-1">Date & Time</p>
                        <p className="text-sm text-foreground font-medium">
                          {format(new Date(selectedEvent.start), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(selectedEvent.start), 'HH:mm')}
                          {selectedEvent.end && ` - ${format(new Date(selectedEvent.end), 'HH:mm')}`}
                        </p>
                      </div>
                    </div>
                    
                    {/* Auditor */}
                    <div className="flex items-start">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg mr-4">
                        <User size={20} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-semibold mb-1">Auditor</p>
                        <p className="text-sm text-foreground font-medium flex items-center">
                          {selectedEvent.auditor.name}
                          {selectedEvent.auditor.isExternal && (
                            <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                              External
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* Auditee */}
                    {selectedEvent.auditee && (
                      <div className="flex items-start">
                        <div className="p-2 bg-secondary/10 rounded-lg mr-4">
                          <Users size={20} className="text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-semibold mb-1">Auditee</p>
                          <p className="text-sm text-foreground font-medium">{selectedEvent.auditee.name}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Department */}
                    {selectedEvent.department && (
                      <div className="flex items-start">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg mr-4">
                          <Building size={20} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-semibold mb-1">Department</p>
                          <p className="text-sm text-foreground font-medium">{selectedEvent.department}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Modal Footer */}
                <div className="px-8 py-6 bg-card border-t border-border flex justify-end gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedEvent(null)}
                    className="px-6 py-3 border border-border rounded-xl bg-card text-foreground hover:bg-muted text-sm font-medium transition-all shadow-sm"
                  >
                    Close
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={viewAuditDetails}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 text-sm font-medium transition-all shadow-lg flex items-center"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    View Full Details
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuditCalendar;
