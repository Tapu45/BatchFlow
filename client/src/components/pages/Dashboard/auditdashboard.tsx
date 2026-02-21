import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  FileText,
  AlertCircle,
  RefreshCw,
  Download,
  Activity,
  Target,
  ArrowUp,
  ArrowDown,
  Settings,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import axios from 'axios';
import { API_ROUTES } from '../../../utils/api';

// Types
interface OverviewData {
  totalAudits: number;
  activeAudits: number;
  completedAudits: number;
  plannedAudits: number;
  totalFindings: number;
  openFindings: number;
  criticalFindings: number;
  overdueActions: number;
  auditCompletionRate: string;
}

interface StatusDistribution {
  status: string;
  count: number;
}

interface FindingsDistribution {
  type: string;
  count: number;
}

interface RecentAudit {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  auditor: { name: string; email: string };
  department: { name: string };
  _count: { findings: number; actions: number };
}

interface OverdueAction {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  audit: { name: string; id: string };
  finding: { title: string; priority: string };
  assignedTo: { name: string; email: string };
}

interface CriticalFinding {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  audit: { name: string; id: string };
  assignedTo: { name: string; email: string };
  actions: Array<{
    id: string;
    title: string;
    dueDate: string;
    status: string;
  }>;
}

// API Service
const auditDashboardService = {
  getOverview: async (): Promise<OverviewData> => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(API_ROUTES.AUDIT_DASHBOARD.OVERVIEW, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  getStatusDistribution: async (): Promise<StatusDistribution[]> => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_ROUTES.AUDIT_DASHBOARD.OVERVIEW.replace('/overview', '/status-distribution')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  getFindingsDistribution: async (): Promise<FindingsDistribution[]> => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_ROUTES.AUDIT_DASHBOARD.OVERVIEW.replace('/overview', '/findings-distribution')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  getRecentAudits: async (): Promise<RecentAudit[]> => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_ROUTES.AUDIT_DASHBOARD.OVERVIEW.replace('/overview', '/recent-audits')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  getOverdueActions: async (): Promise<OverdueAction[]> => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_ROUTES.AUDIT_DASHBOARD.OVERVIEW.replace('/overview', '/overdue-actions')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  getCriticalFindings: async (): Promise<CriticalFinding[]> => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_ROUTES.AUDIT_DASHBOARD.OVERVIEW.replace('/overview', '/critical-findings')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  getDashboardData: async () => {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_ROUTES.AUDIT_DASHBOARD.OVERVIEW.replace('/overview', '/all')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  }
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
};

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  }
};

// Status color mapping - theme aware
const getStatusColor = (status: string) => {
  const colors = {
    'COMPLETED': 'text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300',
    'IN_PROGRESS': 'text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300',
    'PLANNED': 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300',
    'DRAFT': 'text-gray-700 bg-gray-100 dark:bg-gray-700/40 dark:text-gray-300',
    'CANCELLED': 'text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300'
  };
  return colors[status as keyof typeof colors] || 'text-gray-700 bg-gray-100 dark:bg-gray-700/40 dark:text-gray-300';
};

const getPriorityColor = (priority: string) => {
  const colors = {
    'CRITICAL': 'text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300',
    'HIGH': 'text-orange-700 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300',
    'MEDIUM': 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300',
    'LOW': 'text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300'
  };
  return colors[priority as keyof typeof colors] || 'text-gray-700 bg-gray-100 dark:bg-gray-700/40 dark:text-gray-300';
};

// Components
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'increase' | 'decrease';
  colorClass: string;
  iconColorClass: string;
}> = ({ title, value, icon, change, changeType, colorClass, iconColorClass }) => (
  <motion.div
    variants={cardVariants}
    whileHover="hover"
    className={`bg-card rounded-xl shadow-lg p-6 border-l-4 ${colorClass} relative overflow-hidden group border border-border`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative z-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {changeType === 'increase' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              <span className="ml-1">{change}</span>
            </div>
          )}
        </div>
        <div className={`${iconColorClass} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  </motion.div>
);

const ChartCard: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => (
  <motion.div
    variants={cardVariants}
    whileHover="hover"
    className={`bg-card rounded-xl shadow-lg p-6 border border-border ${className}`}
  >
    <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
    {children}
  </motion.div>
);

const ListCard: React.FC<{
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, children, action }) => (
  <motion.div
    variants={cardVariants}
    whileHover="hover"
    className="bg-card rounded-xl shadow-lg p-6 border border-border"
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {action}
    </div>
    {children}
  </motion.div>
);

const AuditDashboard: React.FC = () => {
  const [] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // Queries
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['audit-overview', refreshKey],
    queryFn: auditDashboardService.getOverview,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: statusDistribution, isLoading: statusLoading } = useQuery({
    queryKey: ['audit-status-distribution', refreshKey],
    queryFn: auditDashboardService.getStatusDistribution,
  });

  const { data: findingsDistribution, isLoading: findingsLoading } = useQuery({
    queryKey: ['audit-findings-distribution', refreshKey],
    queryFn: auditDashboardService.getFindingsDistribution,
  });

  const { data: recentAudits, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-audits', refreshKey],
    queryFn: auditDashboardService.getRecentAudits,
  });

  const { data: overdueActions } = useQuery({
    queryKey: ['overdue-actions', refreshKey],
    queryFn: auditDashboardService.getOverdueActions,
  });

  const { data: criticalFindings } = useQuery({
    queryKey: ['critical-findings', refreshKey],
    queryFn: auditDashboardService.getCriticalFindings,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isLoading = overviewLoading || statusLoading || findingsLoading || recentLoading;

  if (overviewError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Error loading dashboard</h3>
          <p className="text-muted-foreground mb-4">Please try refreshing the page</p>
          <button
            onClick={handleRefresh}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card shadow-sm border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-2xl font-bold text-foreground">Audit Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="h-5 w-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-64"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <RefreshCw className="h-8 w-8 text-primary" />
                </motion.div>
                <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Overview Stats */}
              {overview && (
                <motion.div variants={itemVariants}>
                  <h2 className="text-xl font-semibold text-foreground mb-6">Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Total Audits"
                      value={overview.totalAudits}
                      icon={<FileText size={24} />}
                      colorClass="border-primary"
                      iconColorClass="text-primary"
                    />
                    <StatCard
                      title="Active Audits"
                      value={overview.activeAudits}
                      icon={<Activity size={24} />}
                      colorClass="border-secondary"
                      iconColorClass="text-secondary"
                    />
                    <StatCard
                      title="Completion Rate"
                      value={`${overview.auditCompletionRate}%`}
                      icon={<Target size={24} />}
                      colorClass="border-purple-500"
                      iconColorClass="text-purple-500 dark:text-purple-400"
                    />
                    <StatCard
                      title="Critical Findings"
                      value={overview.criticalFindings}
                      icon={<AlertTriangle size={24} />}
                      colorClass="border-destructive"
                      iconColorClass="text-destructive"
                    />
                  </div>
                </motion.div>
              )}

              {/* Status Distribution */}
              {statusDistribution && (
                <motion.div variants={itemVariants}>
                  <ChartCard title="Audit Status Distribution">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {statusDistribution.map((item, index) => (
                        <motion.div
                          key={item.status}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="text-center p-4 rounded-lg bg-muted"
                        >
                          <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-2 ${getStatusColor(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </div>
                          <p className="text-2xl font-bold text-foreground">{item.count}</p>
                        </motion.div>
                      ))}
                    </div>
                  </ChartCard>
                </motion.div>
              )}

              {/* Findings Distribution */}
              {findingsDistribution && (
                <motion.div variants={itemVariants}>
                  <ChartCard title="Findings by Type">
                    <div className="space-y-3">
                      {findingsDistribution.map((item, index) => (
                        <motion.div
                          key={item.type}
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted"
                        >
                          <span className="font-medium text-foreground">{item.type.replace('_', ' ')}</span>
                          <span className="bg-secondary/20 text-secondary px-3 py-1 rounded-full text-sm font-medium">
                            {item.count}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </ChartCard>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Audits */}
                {recentAudits && (
                  <motion.div variants={itemVariants}>
                    <ListCard
                      title="Recent Audits"
                      action={
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="text-primary hover:text-primary/80 font-medium text-sm flex items-center"
                        >
                          View All
                          <ChevronRight size={16} className="ml-1" />
                        </motion.button>
                      }
                    >
                      <div className="space-y-3">
                        {recentAudits.slice(0, 5).map((audit, index) => (
                          <motion.div
                            key={audit.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                                {audit.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {audit.department.name} • {audit.auditor.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(audit.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(audit.status)}`}>
                                {audit.status.replace('_', ' ')}
                              </span>
                              {/* <ExternalLink size={16} className="text-muted-foreground group-hover:text-primary transition-colors" /> */}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ListCard>
                  </motion.div>
                )}

                {/* Critical Findings */}
                {criticalFindings && (
                  <motion.div variants={itemVariants}>
                    <ListCard
                      title="Critical Findings"
                      action={
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="text-destructive hover:text-destructive/80 font-medium text-sm flex items-center"
                        >
                          View All
                          <ChevronRight size={16} className="ml-1" />
                        </motion.button>
                      }
                    >
                      <div className="space-y-3">
                        {criticalFindings.slice(0, 5).map((finding, index) => (
                          <motion.div
                            key={finding.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 rounded-lg border-l-4 border-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">{finding.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{finding.audit.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Assigned to: {finding.assignedTo.name}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(finding.priority)}`}>
                                  {finding.priority}
                                </span>
                                <AlertTriangle size={16} className="text-destructive" />
                              </div>
                            </div>
                            {finding.actions.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-destructive/20">
                                <p className="text-xs text-muted-foreground">
                                  {finding.actions.length} action(s) • Due: {formatDate(finding.actions[0].dueDate)}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </ListCard>
                  </motion.div>
                )}
              </div>

              {/* Overdue Actions */}
              {overdueActions && overdueActions.length > 0 && (
                <motion.div variants={itemVariants}>
                  <ListCard
                    title={`Overdue Actions (${overdueActions.length})`}
                    action={
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
                      >
                        Manage All
                      </motion.button>
                    }
                  >
                    <div className="space-y-3">
                      {overdueActions.slice(0, 3).map((action, index) => (
                        <motion.div
                          key={action.id}
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">{action.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{action.audit.name}</p>
                              <p className="text-sm text-muted-foreground">Finding: {action.finding.title}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-destructive">
                                Overdue by {Math.ceil((new Date().getTime() - new Date(action.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Assigned to: {action.assignedTo.name}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ListCard>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AuditDashboard;
