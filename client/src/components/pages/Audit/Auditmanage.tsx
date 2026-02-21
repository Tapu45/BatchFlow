import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { List, Plus } from 'lucide-react';
import AuditList from '../../ui/Audit/AuditList';
import CreateAudit from '../../ui/Audit/createAudit';

type TabType = 'list' | 'create';

const Auditmanage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // Determine active tab based on URL with better logic
  const getInitialTab = (): TabType => {
    // Check if we're on the audit list page (exact match or just /audits)
    if (path === '/audits' || path === '/audits/') return 'list';
    // Check if we're on the create audit page
    if (path.includes('/audits/new')) return 'create';
    // Default to list for any other audit-related pages
    return 'list';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());

  // Update tab when URL changes with more specific logic
  useEffect(() => {
    const newTab = getInitialTab();
    setActiveTab(newTab);
  }, [path]);

  // Force re-render when coming back to audit pages
  useEffect(() => {
    // Only update if we're actually on an audit management page
    if (path.startsWith('/audits') && !path.includes('/audits/') && path !== '/audits/new') {
      setActiveTab('list');
    }
  }, [location.key, path]); // location.key changes on navigation

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    // Update URL without refreshing page
    switch (tab) {
      case 'list':
        navigate('/audits');
        break;
      case 'create':
        navigate('/audits/new');
        break;
    }
  };

  // Only render tabs if we're on the main audit management pages
  const shouldShowTabs = path === '/audits' || path === '/audits/' || path === '/audits/new';

  // Tab definitions with theme-aware styling
  const tabs = [
    {
      id: 'list',
      label: 'Audit List',
      icon: <List size={20} />,
    },
    {
      id: 'create',
      label: 'Create Audit',
      icon: <Plus size={20} />,
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'list':
        return <AuditList />;
      case 'create':
        return <CreateAudit />;
      default:
        return <AuditList />;
    }
  };

  // Don't render anything if we're not on the main audit management pages
  if (!shouldShowTabs) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Beautiful Tab Navigation */}
      <div className="container mx-auto px-6 pt-4 pb-2">
        <div className="flex justify-center">
          <div className="relative bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-border">
            <div className="flex space-x-1">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as TabType)}
                  className="relative px-8 py-4 rounded-xl transition-all duration-300 group overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Active tab background */}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-primary rounded-xl shadow-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  {/* Hover effect */}
                  <motion.div
                    className="absolute inset-0 bg-primary rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  />
                  
                  {/* Tab content */}
                  <div className="relative flex items-center space-x-3">
                    <motion.div
                      className={`transition-all duration-300 ${
                        activeTab === tab.id 
                          ? 'text-primary-foreground drop-shadow-sm' 
                          : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                      animate={{ 
                        rotate: activeTab === tab.id ? [0, 10, 0] : 0,
                        scale: activeTab === tab.id ? 1.1 : 1
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {tab.icon}
                    </motion.div>
                    <span
                      className={`font-medium text-sm transition-all duration-300 ${
                        activeTab === tab.id 
                          ? 'text-primary-foreground drop-shadow-sm' 
                          : 'text-foreground group-hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </div>

                  {/* Active indicator dots */}
                  {activeTab === tab.id && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="w-2 h-2 bg-primary-foreground rounded-full shadow-lg"></div>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content with enhanced animations */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${location.key}`} // Include location.key to force re-render
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 30
            }
          }}
          exit={{ 
            opacity: 0, 
            y: -20, 
            scale: 0.95,
            transition: { duration: 0.2 }
          }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Auditmanage;
