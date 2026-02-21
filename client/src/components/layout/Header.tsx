import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import logo from "../../assets/logo1.png";

import {
  User,
  ChevronDown,
  Shield,
  Settings,
  LogOut,
  History,
  FileText,
  Clock,
  ExternalLink,
  Library,
  Search,
  Zap,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { API_ROUTES } from '../../utils/api';

interface HeaderBarProps {
  // ...existing code...
  activeNavStack?: Array<{ title: string; path: string }>;
}

type ActivityLogType = {
  id: string;
  User: { name: string; email: string } | null;
  action: string;
  details: string;
  createdAt: string;
};

const HeaderBar: React.FC<HeaderBarProps> = ({
  // ...existing code...
  // activeNavStack = [],
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const brandRef = useRef<HTMLDivElement>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await api.get(API_ROUTES.AUTH.CURRENT_USER, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.user;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: activityLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['recentActivityLogs'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await api.get(API_ROUTES.BATCH.GET_ACTIVITY_LOGS, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 6 },
      });
      return response.data.activityLogs || [];
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
      setShowActivityLogs(false);
      setShowSearchPanel(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Toggle functions
  const toggleUserMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUserMenu((prev) => !prev);
    setShowActivityLogs(false);
    setShowSearchPanel(false);
  };

  // Theme toggle disabled
  // const toggleTheme = () => {
  //   if (theme === 'light') {
  //     document.body.classList.add('dark');
  //     setTheme('dark');
  //     localStorage.setItem('theme', 'dark');
  //   } else {
  //     document.body.classList.remove('dark');
  //     setTheme('light');
  //     localStorage.setItem('theme', 'light');
  //   }
  // };

  // Theme initialization and system preference listener disabled
  // useEffect(() => {
  //   // Check for saved theme preference, default to light
  //   const savedTheme = localStorage.getItem('theme');
  //
  //   if (savedTheme === 'dark') {
  //     document.body.classList.add('dark');
  //     setTheme('dark');
  //   } else {
  //     document.body.classList.remove('dark');
  //     setTheme('light');
  //     // Set default if not already set
  //     if (!savedTheme) {
  //       localStorage.setItem('theme', 'light');
  //     }
  //   }
  //
  //   // Listen for system theme changes if no manual preference is set
  //   const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  //   const handleChange = (e: MediaQueryListEvent) => {
  //     const currentSavedTheme = localStorage.getItem('theme');
  //     if (!currentSavedTheme) {
  //       if (e.matches) {
  //         document.body.classList.add('dark');
  //         setTheme('dark');
  //       } else {
  //         document.body.classList.remove('dark');
  //         setTheme('light');
  //       }
  //     }
  //   };
  //
  //   mediaQuery.addEventListener('change', handleChange);
  //   return () => mediaQuery.removeEventListener('change', handleChange);
  // }, []);

  // GSAP animation for brand name on mount
  useEffect(() => {
    if (brandRef.current) {
      // Initial entrance animation
      gsap.fromTo(
        brandRef.current,
        { opacity: 0, scale: 0.8, rotateY: -90 },
        {
          opacity: 1,
          scale: 1,
          rotateY: 0,
          duration: 0.8,
          ease: 'back.out(1.7)',
        }
      );

      // Create a timeline for continuous animations
      const tl = gsap.timeline({ repeat: -1 });

      // Floating animation with slight rotation
      tl.to(
        brandRef.current,
        {
          y: -4,
          rotateZ: 1,
          duration: 3,
          ease: 'sine.inOut',
        },
        0
      );

      // Scale pulse effect (very subtle)
      tl.to(
        brandRef.current,
        {
          scale: 1.02,
          duration: 2.5,
          ease: 'sine.inOut',
        },
        0
      );

      return () => {
        tl.kill();
      };
    }
  }, []);

  const toggleActivityLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActivityLogs((prev) => !prev);
    setShowUserMenu(false);
    setShowSearchPanel(false);
  };

  const toggleSearchPanel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSearchPanel((prev) => !prev);
    setShowUserMenu(false);
    setShowActivityLogs(false);
  };

  const navigateToMediaLibrary = () => {
    navigate('/document-library');
  };

  // Enhanced quick search suggestions
  const quickSearchSuggestions = [
    {
      icon: '📊',
      title: 'Audit Dashboard',
      path: '/audits',
      category: 'Audits',
    },
    {
      icon: '📚',
      title: 'Training Modules',
      path: '/trainings',
      category: 'Training',
    },
    {
      icon: '📋',
      title: 'Batch Records',
      path: '/batches',
      category: 'Production',
    },
    {
      icon: '👥',
      title: 'Team Management',
      path: '/access-control',
      category: 'Admin',
    },
    {
      icon: '📁',
      title: 'Document Library',
      path: '/document-library',
      category: 'Resources',
    },
    {
      icon: '⚙️',
      title: 'System Settings',
      path: '/settings',
      category: 'Settings',
    },
  ];

  const filteredSuggestions = quickSearchSuggestions.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const getActivityIcon = (action: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      BATCH_CREATED: <Zap size={12} style={{ color: 'var(--primary)' }} />,
      AUDIT_COMPLETED: (
        <Shield size={12} style={{ color: 'var(--sidebar-primary)' }} />
      ),
      TRAINING_ENROLLED: (
        <FileText size={12} style={{ color: 'var(--accent)' }} />
      ),
      DOCUMENT_UPLOADED: (
        <Library size={12} style={{ color: 'var(--sidebar-accent)' }} />
      ),
      USER_LOGIN: (
        <User size={12} style={{ color: 'var(--sidebar-accent-foreground)' }} />
      ),
      default: (
        <Activity size={12} style={{ color: 'var(--muted-foreground)' }} />
      ),
    };
    return iconMap[action] || iconMap['default'];
  };

  return (
    <header
      className="w-full overflow-visible border-b border-border backdrop-blur-sm z-50 h-16"
      style={{
        background: 'linear-gradient(90deg, rgba(83, 23, 170, 0.09) 0%, rgba(83, 23, 170, 0.06) 50%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        className="w-full relative"
      >
        <div className="px-4 md:px-8 relative z-10 flex items-center justify-between h-16">
          {/* Brand Logo and Name */}
          {/* Brand Logo and Name */}
          <div
            ref={brandRef}
            className="flex items-center gap-3 md:gap-4 hover:scale-105 transition-transform duration-300 cursor-pointer"
            style={{ perspective: "1000px" }}
            tabIndex={0}
            aria-label="Home"
          >
            <img
              src={logo}
              alt="NexInventory Logo"
              className="h-12 md:h-14 object-contain drop-shadow-sm"
              style={{ marginRight: 0 }}
            />
          </div>
          {/* Action Buttons */}
          <div className="flex items-center gap-2 md:gap-2.5">
            {/* Theme toggle hidden (disabled) */}
            {/* <motion.button
              className="p-2 md:p-2.5 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={toggleTheme}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              style={{
                color: 'var(--muted-foreground)',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                minWidth: 40,
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="transition-colors" style={{ color: 'var(--primary)' }} />
              ) : (
                <Moon size={20} className="transition-colors" style={{ color: 'var(--primary)' }} />
              )}
            </motion.button> */}
            {/* Search Button */}
            <div className="relative">
              <motion.button
                className="p-2 md:p-2.5 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={toggleSearchPanel}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                title="Quick Search"
                aria-label="Quick Search"
                style={{
                  color: 'var(--muted-foreground)',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  minWidth: 40,
                  minHeight: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Search size={20} className="transition-colors" style={{ color: 'var(--primary)' }} />
              </motion.button>
              {/* Search Panel */}
              <AnimatePresence>
                {showSearchPanel && (
                  <motion.div
                    className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl overflow-hidden z-40"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      backdropFilter: 'blur(20px)',
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',

                    }}
                  >
                    <div
                      className="p-3 border-b"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--popover)',
                      }}
                    >
                      <div className="relative">
                        <Search
                          size={16}
                          className="absolute left-2.5 top-1/2 transform -translate-y-1/2"
                          style={{ color: 'var(--sidebar-primary)' }}
                        />
                        <input
                          type="text"
                          placeholder="Search anything..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all text-sm"
                          style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            color: 'var(--foreground)',
                          }}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="p-1">
                        <p
                          className="text-xs font-semibold mb-1 px-2"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          Quick Access
                        </p>
                        {filteredSuggestions.map((item, index) => (
                          <motion.button
                            key={item.path}
                            className="w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all group text-left"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ x: 3, scale: 1.01 }}
                            onClick={() => {
                              navigate(item.path);
                              setShowSearchPanel(false);
                              setSearchQuery('');
                            }}
                            style={{
                              background: 'transparent',
                              color: 'var(--foreground)',
                            }}
                          >
                            <span className="text-sm">{item.icon}</span>
                            <div className="flex-1">
                              <p
                                className="font-medium group-hover"
                                style={{ color: 'var(--primary)' }}
                              >
                                {item.title}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: 'var(--muted-foreground)' }}
                              >
                                {item.category}
                              </p>
                            </div>
                            <ExternalLink
                              size={12}
                              style={{ color: 'var(--muted-foreground)' }}
                            />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Media Library */}
            <motion.button
              className="p-2 md:p-2.5 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={navigateToMediaLibrary}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              title="Media Library"
              aria-label="Media Library"
              style={{
                color: 'var(--sidebar-primary)',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                minWidth: 40,
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Library size={20} className="transition-colors" style={{ color: 'var(--primary)' }} />
            </motion.button>
            {/* Activity Logs */}
            <div className="relative">
              <motion.button
                className="p-2 md:p-2.5 rounded-lg transition-all duration-200 group relative focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={toggleActivityLogs}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                title="Recent Activity"
                aria-label="Recent Activity"
                style={{
                  color: 'var(--sidebar-primary)',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  minWidth: 40,
                  minHeight: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <History size={20} className="transition-colors" style={{ color: 'var(--primary)' }} />
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    background: 'var(--primary)',
                  }}
                />
              </motion.button>
              {/* Activity logs dropdown */}
              <AnimatePresence>
                {showActivityLogs && (
                  <motion.div
                    className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl overflow-hidden z-40"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      backdropFilter: 'blur(20px)',
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      className="p-3 border-b"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--popover)',
                      }}
                    >
                      <motion.h3
                        className="font-semibold text-md flex items-center"
                        style={{
                          background:
                            'linear-gradient(90deg, var(--sidebar-primary), var(--primary))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          className="mr-2 p-1.5 rounded-lg"
                          style={{ background: 'var(--sidebar-accent)' }}
                        >
                          <Activity
                            size={14}
                            style={{ color: 'var(--sidebar-primary)' }}
                          />
                        </motion.div>
                        Recent Activity
                      </motion.h3>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        Latest system activities
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {isLoadingLogs ? (
                        <div className="p-6 text-center">
                          <motion.div
                            className="animate-spin h-6 w-6 border-2 border-t-transparent rounded-full mx-auto"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                            style={{
                              borderColor: 'var(--primary)',
                            }}
                          />
                          <p
                            className="text-xs mt-2"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            Loading activities...
                          </p>
                        </div>
                      ) : activityLogs.length === 0 ? (
                        <div
                          className="p-8 text-center"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          <History
                            size={24}
                            style={{ color: 'var(--border)' }}
                            className="mx-auto mb-2"
                          />
                          <p className="text-sm font-medium">
                            No recent activities
                          </p>
                          <p className="text-xs mt-1">
                            Activities will appear here when available
                          </p>
                        </div>
                      ) : (
                        <div className="p-1">
                          {activityLogs.map(
                            (log: ActivityLogType, index: number) => (
                              <motion.div
                                key={log.id}
                                className="p-2.5 mb-1 rounded-lg border hover:shadow-sm transition-all cursor-pointer group"
                                initial={{ opacity: 0, y: 10, x: -5 }}
                                animate={{ opacity: 1, y: 0, x: 0 }}
                                transition={{
                                  delay: 0.03 * index,
                                  duration: 0.3,
                                }}
                                whileHover={{ scale: 1.01, x: 2 }}
                                style={{
                                  borderColor: 'var(--border)',
                                  background: 'var(--card)',
                                }}
                              >
                                <div className="flex items-start gap-2.5">
                                  <motion.div
                                    className="rounded-lg p-1.5 shrink-0 group-hover:shadow-sm transition-shadow"
                                    whileHover={{ scale: 1.05 }}
                                    style={{
                                      background: 'var(--sidebar-accent)',
                                    }}
                                  >
                                    {getActivityIcon(log.action)}
                                  </motion.div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                      <p
                                        className="text-xs font-semibold group-hover"
                                        style={{ color: 'var(--primary)' }}
                                      >
                                        {log.action.replace(/_/g, ' ')}
                                      </p>
                                      <div
                                        className="flex items-center text-xs px-1.5 py-0.5 rounded-full"
                                        style={{
                                          color: 'var(--muted-foreground)',
                                          background: 'var(--muted)',
                                        }}
                                      >
                                        <Clock size={8} className="mr-0.5" />
                                        {formatDate(log.createdAt)}
                                      </div>
                                    </div>
                                    <p
                                      className="text-xs mb-1 group-hover"
                                      style={{ color: 'var(--foreground)' }}
                                    >
                                      {log.details}
                                    </p>
                                    <div className="flex items-center text-xs">
                                      <div
                                        className="flex items-center px-1.5 py-0.5 rounded-full"
                                        style={{
                                          background: 'var(--sidebar-accent)',
                                          color:
                                            'var(--sidebar-accent-foreground)',
                                        }}
                                      >
                                        <User size={8} className="mr-0.5" />
                                        {log.User?.name || 'System'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      className="p-2 border-t"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--popover)',
                      }}
                    >
                      <motion.button
                        className="w-full py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => navigate('/activity-logs')}
                        style={{
                          background: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                        }}
                      >
                        <span>View All Activities</span>
                        <ExternalLink size={12} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* User profile */}
            <div className="relative ml-1">
              <motion.div
                className="flex items-center gap-2 rounded-xl pl-3 pr-1.5 py-1.5 cursor-pointer transition-all duration-300 group"
                onClick={toggleUserMenu}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="hidden sm:block">
                  <p
                    className="text-xs font-semibold"
                    style={{
                      background:
                        'linear-gradient(90deg, var(--foreground), var(--primary))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {isLoading ? 'Loading...' : user?.name || 'User'}
                  </p>
                  <p
                    className="text-xs truncate max-w-20"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {isLoading
                      ? '...'
                      : user?.email?.split('@')[0] || 'guest'}
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: showUserMenu ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown
                    size={12}
                    style={{ color: 'var(--primary)' }}
                    className="hidden sm:block"
                  />
                </motion.div>
                <motion.div
                  className="relative w-8 h-8 rounded-full flex items-center justify-center text-white transition-shadow overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--primary), var(--sidebar-primary))',
                    boxShadow: '0 2px 8px 0 var(--sidebar-primary)',
                  }}
                >
                  <User size={18} style={{ color: 'white' }} />
                  <motion.div
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      background: 'var(--primary)',
                      borderColor: 'var(--card)',
                    }}
                  />
                </motion.div>
              </motion.div>
              {/* User dropdown menu */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    className="absolute right-0 mt-2 w-60 rounded-xl shadow-xl overflow-hidden z-40"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      backdropFilter: 'blur(20px)',
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      className="p-4 border-b relative overflow-hidden"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--popover)',
                      }}
                    >
                      <div className="relative flex items-center gap-3">
                        <motion.div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white relative overflow-hidden"
                          whileHover={{ scale: 1.05 }}
                          style={{
                            background:
                              'linear-gradient(135deg, var(--primary), var(--sidebar-primary))',
                          }}
                        >
                          <User size={18} />
                        </motion.div>
                        <div className="flex-1">
                          <p
                            className="font-semibold text-md"
                            style={{
                              background:
                                'linear-gradient(90deg, var(--primary), var(--sidebar-primary))',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            {isLoading
                              ? 'Loading...'
                              : user?.name || 'Guest User'}
                          </p>
                          <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            {isLoading
                              ? 'Loading...'
                              : user?.email || 'guest@example.com'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      {[
                        {
                          icon: User,
                          label: 'Profile',
                          path: '/profile',
                          color: 'var(--primary)',
                        },
                        {
                          icon: Settings,
                          label: 'Settings',
                          path: '/settings',
                          color: 'var(--sidebar-primary)',
                        },
                        {
                          icon: Shield,
                          label: 'Access Control',
                          path: '/access-control',
                          color: 'var(--sidebar-accent)',
                        },
                      ].map((item, index) => (
                        <motion.button
                          key={item.path}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all group relative overflow-hidden"
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.05 * (index + 1) }}
                          whileHover={{ x: 3, scale: 1.01 }}
                          onClick={() => navigate(item.path)}
                          style={{
                            color: 'var(--foreground)',
                            background: 'transparent',
                          }}
                        >
                          <motion.div
                            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm"
                            whileHover={{ scale: 1.05 }}
                            style={{
                              background: item.color,
                              color: 'var(--primary-foreground)',
                            }}
                          >
                            <item.icon size={14} />
                          </motion.div>
                          <span
                            className="font-medium group-hover"
                            style={{ color: 'var(--primary)' }}
                          >
                            {item.label}
                          </span>
                          <motion.div
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                            whileHover={{ x: 2 }}
                          >
                            <ExternalLink
                              size={12}
                              style={{ color: 'var(--muted-foreground)' }}
                            />
                          </motion.div>
                        </motion.button>
                      ))}
                    </div>
                    <div
                      className="py-1 border-t"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--popover)',
                      }}
                    >
                      <motion.button
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all group relative overflow-hidden"
                        whileHover={{ x: 3, scale: 1.01 }}
                        onClick={handleLogout}
                        style={{
                          color: 'var(--destructive)',
                          background: 'transparent',
                        }}
                      >
                        <motion.div
                          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm"
                          whileHover={{ scale: 1.05 }}
                          style={{
                            background: 'var(--destructive)',
                            color: 'var(--destructive-foreground)',
                          }}
                        >
                          <LogOut size={14} />
                        </motion.div>
                        <span
                          className="font-semibold group-hover"
                          style={{ color: 'var(--destructive)' }}
                        >
                          Logout
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
