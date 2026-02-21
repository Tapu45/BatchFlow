import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";
import {
  Award,
  ChevronLeft,
  PackageOpen,
  Calendar,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  Shield,
  File,
  LucideLayoutDashboard,
  LayoutDashboardIcon,
  FileStack,
  ClipboardEdit,
  SwitchCamera,
  FileText
} from "lucide-react";
import { usePermissions } from "../../hooks/permission";

interface SidebarProps {
  onToggle: (expanded: boolean) => void;
  pageTitle?: string;
}

interface MenuItem {
  path: string;
  name: string;
  icon: React.ReactNode;
  permissionKey: string;
}

interface ParentGroup {
  key: string;
  name: string;
  icon: React.ReactNode;
  children: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ onToggle, pageTitle = 'Dashboard' }) => {

  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [openPopupGroup, setOpenPopupGroup] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const location = useLocation();
  const { hasPermission } = usePermissions();

  const userRole = localStorage.getItem("userRole");
  const isAdmin = userRole === "Admin";

  useEffect(() => {
    onToggle(isExpanded);
  }, []);

  // Handle popup menu for collapsed sidebar
  const handleGroupClick = (e: React.MouseEvent, groupKey: string) => {
    if (isExpanded) {
      // When expanded, toggle the dropdown normally
      setExpandedGroups(prev =>
        prev.includes(groupKey)
          ? prev.filter(k => k !== groupKey)
          : [...prev, groupKey]
      );
    } else {
      // When collapsed, show popup menu
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPopupPosition({
        top: rect.top,
        left: rect.right + 10
      });
      setOpenPopupGroup(openPopupGroup === groupKey ? null : groupKey);
    }
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setOpenPopupGroup(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---------------- TOGGLE ----------------
  const toggleSidebar = () => {

    if (isExpanded) {
      // When collapsing - simultaneous animations for snappier feel
      setIsExpanded(false);
      onToggle(false);

      // Hide text
      gsap.to(".sidebar-text", {
        opacity: 0,
        x: -8,
        duration: 0.15,
        ease: "power2.out"
      });

      // Shrink icons slightly
      gsap.to(".sidebar-icon", {
        scale: 0.9,
        duration: 0.15,
        ease: "power2.out"
      });

      // Shrink width (starts immediately with shorter duration)
      gsap.to(sidebarRef.current, {
        width: 80,
        duration: 0.25,
        ease: "power3.out"
      });

      setSidebarWidth(80);
    } else {
      // When expanding - fast and responsive
      setIsExpanded(true);
      onToggle(true);

      // Expand width first
      gsap.to(sidebarRef.current, {
        width: 260,
        duration: 0.25,
        ease: "power3.out"
      });

      setSidebarWidth(260);

      // Show text and scale icons simultaneously (no delay)
      gsap.to(".sidebar-text", {
        opacity: 1,
        x: 0,
        duration: 0.2,
        ease: "power2.out",
        delay: 0.05
      });

      gsap.to(".sidebar-icon", {
        scale: 1,
        duration: 0.2,
        ease: "power2.out",
        delay: 0.05
      });
    }
  };
  // ---------------- MENU DATA ----------------

  const parentGroups: ParentGroup[] = [
    {
      key: "raw-material",
      name: "Raw Material Managment",
      icon: <PackageOpen className="sidebar-icon" size={20} />,
      children: [
        {
          path: "/raw-dashboard",
          name: "Dashboard",
          icon: <LayoutDashboardIcon className="sidebar-icon" size={18} />,
          permissionKey: "manage_raw_dashboard"
        },
        {
          path: "/raw/purchase-history",
          name: "Order",
          icon: <FileStack className="sidebar-icon" size={18} />,
          permissionKey: "manage_purchase_order"
        },
          {
          path: "/raw/quality-report",
          name: "RM Quality Report",
          icon: <FileText className="sidebar-icon" size={18} />,
          permissionKey: "manage_rm_quality_report"
        },
        {
          path: "/raw/cleaning-raw-materials",
          name: "Cleaning",
          icon: <ClipboardEdit className="sidebar-icon" size={18} />,
          permissionKey: "manage_purchase_order"
        },
        {
          path: "/raw/processing-list",
          name: "Processing",
          icon: <SwitchCamera className="sidebar-icon" size={18} />,
          permissionKey: "manage_purchase_order"
        },
      
        {
          path: "/stock-distribution",
          name: "Stock Distribution",
          icon: <SwitchCamera className="sidebar-icon" size={18} />,
          permissionKey: "view_stock_distribution"
        }
      ]
    },

    {
      key: "batch-management",
      name: "FG Quality Report",
      icon: <PackageOpen className="sidebar-icon" size={20} />,
      children: [
        {
          path: "/operation-dashboard",
          name: "Dashboard",
          icon: <LucideLayoutDashboard className="sidebar-icon" size={18} />,
          permissionKey: "view_operation_dashboard"
        },
        {
          path: "/batches",
          name: "Batches",
          icon: <PackageOpen className="sidebar-icon" size={18} />,
          permissionKey: "view_batches"
        },
        {
          path: "/standards",
          name: "Standards",
          icon: <Award className="sidebar-icon" size={18} />,
          permissionKey: "manage_standards"
        },
        {
          path: "/batches/verification",
          name: "Batch Verification",
          icon: <Award className="sidebar-icon" size={18} />,
          permissionKey: "verify_batches"
        }
      ]
    },

    {
      key: "training",
      name: "Training",
      icon: <GraduationCap className="sidebar-icon" size={20} />,
      children: [
        {
          path: "/trainings-dashboard",
          name: "Dashboard",
          icon: <LucideLayoutDashboard className="sidebar-icon" size={18} />,
          permissionKey: "view_training_dashboard"
        },
        {
          path: "/trainings",
          name: "Training",
          icon: <Award className="sidebar-icon" size={18} />,
          permissionKey: "manage_trainings"
        },
        {
          path: "/training-calender",
          name: "Training Calendar",
          icon: <Calendar className="sidebar-icon" size={18} />,
          permissionKey: "view_training_calendar"
        }
      ]
    },

    {
      key: "audit-management",
      name: "Audit Management",
      icon: <Shield className="sidebar-icon" size={20} />,
      children: [
        {
          path: "/audit-dashboard",
          name: "Audit Dashboard",
          icon: <File className="sidebar-icon" size={18} />,
          permissionKey: "view_audit_dashboard"
        },
        {
          path: "/audits",
          name: "Audit management",
          icon: <File className="sidebar-icon" size={18} />,
          permissionKey: "manage_audits"
        },
        {
          path: "/audit/calender",
          name: "Audit Calendar",
          icon: <Calendar className="sidebar-icon" size={18} />,
          permissionKey: "view_audit_calendar"
        }
      ]
    }
  ];

  const authorizedParentGroups = parentGroups
    .map(group => ({
      ...group,
      children: isAdmin
        ? group.children
        : group.children.filter(child => hasPermission(child.permissionKey))
    }))
    .filter(group => group.children.length > 0);

  const isGroupActive = (group: ParentGroup) =>
    group.children.some(child => location.pathname === child.path);

  useEffect(() => {
    const activeGroups = authorizedParentGroups
      .filter(group => isGroupActive(group))
      .map(group => group.key);

    setExpandedGroups(prev => [...new Set([...prev, ...activeGroups])]);
  }, [location.pathname]);

  // ---------------- UI ----------------
  return (

    <div
      ref={sidebarRef}
      className="h-screen fixed top-0 left-0 flex flex-col z-10 overflow-hidden bg-gradient-to-b from-background to-background/95 pt-20"
      style={{
        width: sidebarWidth,
        background: "var(--background)",
        borderRight: "1px solid var(--sidebar-border)"
      }}
    >

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-border/30 bg-gradient-to-r from-primary/10 to-transparent dark:from-primary/5">

        {isExpanded && (
          <div className="flex items-center gap-2 flex-1">
            <h2 className="text-lg md:text-xl font-bold sidebar-text text-foreground line-clamp-2">
              {pageTitle}
            </h2>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-primary/20 dark:hover:bg-primary/10 rounded-lg transition-all duration-200 group"
        >
          {isExpanded ? (
            <ChevronLeft className="group-hover:scale-110 transition-transform" color="var(--primary)" size={22} />
          ) : (
            <ChevronRight className="group-hover:scale-110 transition-transform" color="var(--primary)" size={22} />
          )}
        </button>
      </div>

      {/* MENU */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">

        {authorizedParentGroups.map(group => {

          const isActive = expandedGroups.includes(group.key);

          return (
            <div key={group.key} className="mb-3">

              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group
                  ${isActive ? "text-primary bg-primary/10 dark:bg-primary/5" : "text-foreground hover:bg-primary/5 dark:hover:bg-primary/10"}`}
                onClick={(e) => handleGroupClick(e, group.key)}
              >
                <div className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                  {group.icon}
                </div>

                {isExpanded && (
                  <>
                    <span className="sidebar-text font-medium flex-1">
                      {group.name}
                    </span>
                    <div className={`transition-transform duration-300 ${isActive ? "text-primary" : ""}`}>
                      <ChevronDown
                        size={18}
                        className="sidebar-text group-hover:text-primary transition-colors"
                        style={{
                          transform: isActive ? "rotate(0deg)" : "rotate(-90deg)"
                        }}
                      />
                    </div>
                  </>
                )}

              </div>

              {isExpanded && isActive && (
                <div className="ml-4 mt-2 space-y-1 border-l-2 border-primary/30 pl-3">

                  {group.children.map((child) => {

                    const active = location.pathname === child.path;

                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group/child
                          ${active
                            ? "bg-primary text-primary-foreground font-semibold shadow-md"
                            : "text-foreground hover:bg-primary/10 dark:hover:bg-primary/15"
                          }`}
                      >

                        <div className={`transition-transform duration-200 ${active ? "scale-110" : "group-hover/child:scale-105"}`}>
                          {child.icon}
                        </div>

                        <span className="sidebar-text text-sm">
                          {child.name}
                        </span>

                        {active && (
                          <div className="ml-auto w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                        )}

                      </Link>
                    );
                  })}

                </div>
              )}

            </div>
          );
        })}

      </div>      <div className="border-t border-border/30 bg-gradient-to-r from-primary/10 to-transparent dark:from-primary/5 mt-auto">
        <div className="text-center py-4 text-xs text-muted-foreground hover:text-primary transition-colors duration-200 px-2">
          {isExpanded ? (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">Developed by</div>
              <div className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent font-bold">
                Nexus InfoTech
              </div>
            </div>
          ) : (
            <div className="font-semibold text-primary text-xs" title="Nexus InfoTech">
              NI
            </div>
          )}
        </div>
      </div>

      {/* POPUP MENU FOR COLLAPSED SIDEBAR */}
      {openPopupGroup && !isExpanded && (
        <div
          ref={popupRef}
          className="fixed bg-card rounded-2xl shadow-2xl border border-border/50 backdrop-blur-md p-2 animate-in fade-in slide-in-from-left-2 duration-200"
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            minWidth: "260px",
            zIndex: 9999
          }}
        >
          <div className="mb-2 px-3 py-2 border-b border-border/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {authorizedParentGroups.find(g => g.key === openPopupGroup)?.name}
            </p>
          </div>
          <div className="space-y-1">
            {authorizedParentGroups
              .find(g => g.key === openPopupGroup)
              ?.children.map((child) => {
                const active = location.pathname === child.path;
                return (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={() => setOpenPopupGroup(null)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                      ${active
                        ? "bg-primary text-primary-foreground font-semibold shadow-md"
                        : "text-foreground hover:bg-primary/15 dark:hover:bg-primary/20"
                      }`}
                  >
                    <div className={`transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-105"}`}>
                      {child.icon}
                    </div>
                    <span className="text-sm font-medium">{child.name}</span>
                    {active && (
                      <div className="ml-auto w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                    )}
                  </Link>
                );
              })}
          </div>
        </div>
      )}    </div>
  );
};

export default Sidebar;
