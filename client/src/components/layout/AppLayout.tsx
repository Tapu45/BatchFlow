import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../ui/sidebar';
import HeaderBar from './Header';

const AppLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const [navStack, setNavStack] = useState<
    Array<{ title: string; path: string }>
  >([]);
  const location = useLocation();


  // This function will be passed to Sidebar to communicate its state
  const handleSidebarToggle = (
    expanded: boolean | ((prevState: boolean) => boolean)
  ) => {
    setIsSidebarExpanded(expanded);
  };

  // Update page title based on route
  useEffect(() => {
    const path = location.pathname;
    let title = 'BatchFlow';
    let currentNavStack = [{ title: 'Home', path: '/' }];

    if (path.includes('/dashboard')) {
      title = 'Dashboard';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Dashboard', path: '/dashboard' },
      ];
    } else if (path.includes('/batches')) {
      title = 'Batch Management';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Batches', path: '/batches' },
      ];
    } else if (path.includes('/standards')) {
      title = 'Standards';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Standards', path: '/standards' },
      ];
    } else if (path.includes('/units')) {
      title = 'Units';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Units', path: '/units' },
      ];
    } else if (path.includes('/activity-logs')) {
      title = 'Activity Logs';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Activity Logs', path: '/activity-logs' },
      ];
    } else if (path.includes('/settings')) {
      title = 'Settings';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Settings', path: '/settings' },
      ];
    }
    // Add breadcrumb for document-library
    else if (path.includes('/document-library')) {
      title = 'Document Library';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Document Library', path: '/document-library' },
      ];
    }
    // Add breadcrumbs for training paths
    else if (path.includes('/trainings')) {
      title = 'Training Management';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Trainings', path: '/trainings' },
      ];

      // Add specific training subpaths if needed
      if (path.includes('/create')) {
        currentNavStack.push({ title: 'Create', path: '/trainings/create' });
        title = 'Create Training';
      } else if (path.match(/\/trainings\/edit\/\w+/)) {
        const id = path.split('/').pop();
        currentNavStack.push({ title: 'Edit', path: `/trainings/edit/${id}` });
        title = 'Edit Training';
      } else if (path.match(/\/trainings\/\w+/)) {
        const id = path.split('/').pop();
        currentNavStack.push({ title: 'Details', path: `/trainings/${id}` });
        title = 'Training Details';
      }
    }
    // Add breadcrumbs for audit paths
    else if (path.includes('/audits')) {
      title = 'Audit Management';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Audits', path: '/audits' },
      ];

      if (path.includes('/checklist')) {
        currentNavStack.push({ title: 'Checklists', path: '/audits/checklist' });
      } else if (path.includes('/inspection')) {
        currentNavStack.push({ title: 'Inspections', path: '/audits/inspection-checklist' });
      }
    }
    // Add breadcrumbs for profile and access control
    else if (path.includes('/profile')) {
      title = 'User Profile';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Profile', path: '/profile' },
      ];
    }
    else if (path.includes('/access-control')) {
      title = 'Access Control';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Access Control', path: '/access-control' },
      ];
    }
    // Add calendar routes
    else if (path.includes('/training-calender')) {
      title = 'Training Calendar';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Training Calendar', path: '/training-calender' },
      ];
    }
    else if (path.includes('/audit/calender')) {
      title = 'Audit Calendar';
      currentNavStack = [
        { title: 'Home', path: '/' },
        { title: 'Audit Calendar', path: '/audit/calender' },
      ];
    }

    setPageTitle(title);
    setNavStack(currentNavStack);
  }, [location]);

  return (
    <div className="flex min-h-screen">
      {/* Background with subtle pattern */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25px 25px, rgba(255,255,255,0.2) 2px, transparent 0),
            radial-gradient(circle at 75px 75px, rgba(255,255,255,0.2) 2px, transparent 0)
          `,
          backgroundSize: '100px 100px',
          backgroundColor: 'var(--background)', // Use CSS variable instead of hardcoded color
        }}
      />

      {/* Fixed position header - static, no animations */}
      <header className="fixed top-0 right-0 left-0 z-50">
        <HeaderBar activeNavStack={navStack} />
      </header>

      {/* Sidebar */}
      <Sidebar onToggle={handleSidebarToggle} pageTitle={pageTitle} />

      {/* Main Content */}
      <motion.div
        className="flex-1 transition-all relative"
        style={{
          willChange: 'margin-left',
          overflow: 'hidden',
          marginTop: '64px',
        }}
        animate={{
          marginLeft: isSidebarExpanded ? '260px' : '80px',
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Content area - no top padding, use margin instead */}
        <div className="p-0">
          {/* Main Content Container */}
          <motion.div
            className="rounded-none p-6"
            style={{
              backgroundColor: 'transparent',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            key={location.pathname}
          >
            <Outlet />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AppLayout;
