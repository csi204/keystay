import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import {
  LayoutDashboard,
  BedDouble,
  BarChart3,
  FileDown,
  Users,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Clock,
  WifiOff,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
  ArrowLeftRight,
  ShoppingCart,
  Globe,
  Wrench,
  KeyRound,
} from 'lucide-react';

import { getAuthRole, getAuthUser, clearAuthSession, getAuthToken, apiUrl } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePath?: string;
  isBackendOffline?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activePath,
  isBackendOffline = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = activePath || location.pathname;
  const { t, language, setLanguage, toggleLanguage } = useTranslation();

  // Sidebar Collapsible state (remember in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('keystay_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('keystay_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Retrieve user & role from session (per tab)
  const currentRole = getAuthRole();
  const isOwner = currentRole === 'owner';

  const user = getAuthUser();

  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : 'เขต โสภณ';
  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'AD';

  // Live Clock (localized according to active language)
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      setCurrentTime(formatted);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, [language]);

  const handleLogout = async () => {
    try {
      const token = getAuthToken();
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => {});
    } finally {
      clearAuthSession();
      navigate('/login', { replace: true });
    }
  };

  const navItems = [
    {
      title: t('nav.overview'),
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: t('nav.roomsPricing'),
      path: '/admin/rooms',
      icon: BedDouble,
    },
    {
      title: t('nav.minibar'),
      path: '/admin/minibar',
      icon: ShoppingCart,
    },
    {
      title: t('nav.technicians'),
      path: '/admin/technicians',
      icon: Wrench,
    },
    {
      title: t('nav.reports'),
      path: '/admin/reports',
      icon: BarChart3,
    },
    {
      title: t('nav.usersRoles'),
      path: '/admin/users',
      icon: Users,
    },
  ];

  return (
    // Fixed viewport container: Sidebar never stretches with page content
    <div className="h-screen w-screen overflow-hidden bg-[#F7F9FB] text-slate-900 font-sans flex">
      {/* 1. ASIDE SIDEBAR: Fixed h-screen height, does NOT stretch with right-hand content */}
      <aside
        className={`${
          isCollapsed ? 'w-[72px]' : 'w-64'
        } h-screen bg-white text-slate-700 flex flex-col justify-between shrink-0 border-r border-slate-200/90 select-none z-20 transition-all duration-200 ease-in-out`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo & Section Title: Stacked logo on top & collapse button below when collapsed */}
          <div
            className={`border-b border-slate-200/80 bg-white transition-all shrink-0 ${
              isCollapsed
                ? 'py-3.5 px-2 flex flex-col items-center justify-center gap-2.5'
                : 'h-16 px-4 flex flex-row items-center justify-between'
            }`}
          >
            <div
              className={`flex items-center min-w-0 ${
                isCollapsed ? 'justify-center' : 'gap-2.5 overflow-hidden'
              }`}
            >
              <Logo size="md" showText={false} />
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="text-sm font-bold tracking-wider text-slate-900 truncate block">
                    KEYSTAY
                  </span>
                  <span className="block text-[9px] font-semibold tracking-widest text-[#F97316] uppercase -mt-0.5">
                    OWNER PORTAL
                  </span>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button */}
            <button
              onClick={toggleSidebar}
              title={isCollapsed ? 'ขยายเมนู (Expand)' : 'ย่อเมนู (Collapse)'}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
            >
              {isCollapsed ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Menu (Scrollable if lots of items, never stretches sidebar) */}
          <nav className="p-2 space-y-1 overflow-y-auto flex-1">
            {!isCollapsed && (
              <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                เมนูบริหารจัดการ
              </div>
            )}

            {navItems.map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path === '/admin/dashboard' && (currentPath === '/admin' || currentPath === '/admin/'));

              return (
                <Link
                  key={item.title}
                  to={item.path}
                  title={isCollapsed ? item.title : undefined}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                  } rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#F97316] text-white font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <item.icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`}
                    />
                    {!isCollapsed && <span>{item.title}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card at Bottom: Clock, Language Switcher (Orange) & Logout button */}
        <div className="p-3 border-t border-slate-200/80 bg-white shrink-0 space-y-2">
          {/* Live Monospace Clock */}
          {currentTime && (
            <div
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-1.5 px-2.5 py-1.5'
              } text-xs font-mono font-medium text-slate-700 tabular-nums bg-white rounded-md border border-slate-200 shadow-2xs`}
              title={currentTime}
            >
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{currentTime}</span>}
            </div>
          )}

          {/* Global Language Switcher (Matching FrontDesk layout with orange theme) */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleLanguage}
              title={`Switch language (${language.toUpperCase()})`}
              className="w-full flex items-center justify-center p-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-md border border-slate-200 shadow-2xs transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#F97316] mr-1" aria-hidden="true" />
              <span>{language.toUpperCase()}</span>
            </button>
          ) : (
            <div
              role="group"
              aria-label="Language Switcher"
              className="flex items-center bg-white p-0.5 rounded-md border border-slate-200 text-xs font-medium shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setLanguage('th')}
                className={`flex-1 py-1 rounded text-center transition-colors font-semibold ${
                  language === 'th'
                    ? 'bg-[#F97316] text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-pressed={language === 'th'}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 py-1 rounded text-center transition-colors font-semibold ${
                  language === 'en'
                    ? 'bg-[#F97316] text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-pressed={language === 'en'}
              >
                EN
              </button>
            </div>
          )}

          {/* User Profile Info & Logout (Matches FrontDesk Layout) */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            {isCollapsed ? (
              <div className="w-full flex flex-col items-center gap-1.5">
                <div
                  className="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xs font-bold text-orange-700"
                  title={userName}
                >
                  {userName.charAt(0)}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title={t('nav.logout')}
                  aria-label={t('nav.logout')}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md border border-rose-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <div className="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xs font-bold text-orange-700 shrink-0">
                    {userName.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                      {userName}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">Owner</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    to="/change-password"
                    title={t('nav.changePassword')}
                    aria-label={t('nav.changePassword')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    title={t('nav.logout')}
                    aria-label={t('nav.logout')}
                    className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md border border-rose-200 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA: Scrolls independently, NEVER stretches sidebar */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col min-w-0">
        {/* Top Header Bar */}
        {/* <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">ระบบจัดการ</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span>การดำเนินงานส่วนหน้าและจัดการ</span>
          </div>

          <div className="flex items-center gap-4">
            {isBackendOffline && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium animate-pulse">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Backend Offline — โหมดจำลองข้อมูล (ปิดการทำรายการ)</span>
              </div>
            )}

            User Name & Role Badge positioned on Top-Right
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <span className="text-xs text-slate-400">{userName}<span className='text-xs text-slate-400 lowercase'> - owner</span></span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime}</span>
            </div>
          </div>
        </header> */}

        {/* Backend Offline Warning Banner if Offline */}
        {isBackendOffline && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>ระบบเชื่อมต่อหลังบ้านไม่สำเร็จ:</strong> แสดงผลด้วย Mock Snapshot ชั่วคราว ปุ่มบันทึก/แก้ไขข้อมูลจะถูกปิดการใช้งานอัตโนมัติเพื่อป้องกันข้อมูลผิดพลาด
              </span>
            </div>
          </div>
        )}

        {/* Page Content Container */}
        <main className="bg-white flex-1 m-0">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
