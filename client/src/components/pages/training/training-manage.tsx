import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, GraduationCap } from 'lucide-react';
import TrainingList from '../../ui/training/TrainingList';
import CreateTraining from '../../ui/training/Createtraining';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

type ActiveTab = 'list' | 'create';

const TrainingManage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCreatePath = location.pathname.includes('/trainings/create');
  const [activeTab, setActiveTab] = useState<ActiveTab>(isCreatePath ? 'create' : 'list');

  useEffect(() => {
    const newTab = location.pathname.includes('/trainings/create') ? 'create' : 'list';
    setActiveTab(newTab);
  }, [location.pathname]);

  const handleTabChange = (tab: ActiveTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);

      if (tab === 'create') {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        navigate('/trainings/create');
      } else {
        queryClient.invalidateQueries({ queryKey: ['trainings'] });
        navigate('/trainings');
      }
    }
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  const tabs = [
    {
      id: 'list',
      label: 'Training List',
      icon: <BookOpen size={16} />,
    },
    {
      id: 'create',
      label: 'Create Training',
      icon: <GraduationCap size={16} />,
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="relative bg-card border border-border rounded-xl p-1.5 shadow-sm">
            {/* Background indicator */}
            <motion.div
              className="absolute inset-1.5 rounded-lg"
              animate={{
                x: activeTab === 'list' ? 0 : '100%',
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              style={{ width: 'calc(50% - 3px)' }}
            >
              <div className="w-full h-full rounded-lg bg-primary shadow-sm" />
            </motion.div>

            {/* Tab buttons */}
            <div className="relative flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as ActiveTab)}
                  className="relative px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {/* Icon */}
                  <div
                    className={`p-1.5 rounded-md transition-colors duration-200 ${activeTab === tab.id
                        ? 'bg-primary-foreground/20'
                        : 'bg-primary/10'
                      }`}
                  >
                    <div
                      className={`transition-colors duration-200 ${activeTab === tab.id
                          ? 'text-primary-foreground'
                          : 'text-primary'
                        }`}
                    >
                      {tab.icon}
                    </div>
                  </div>

                  {/* Label */}
                  <span
                    className={`font-medium text-sm transition-colors duration-200 ${activeTab === tab.id
                        ? 'text-primary-foreground'
                        : 'text-foreground'
                      }`}
                  >
                    {tab.label}
                  </span>

                  {/* Active indicator dot */}
                  {activeTab === tab.id && (
                    <motion.div
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
                    >
                      <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${location.key}`}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={contentVariants}
          >
            {activeTab === 'list' ? (
              <TrainingList />
            ) : (
              <CreateTraining />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TrainingManage;