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
} from 'lucide-react';

import { getAuthRole, getAuthUser, clearAuthSession } from '@/lib/api';

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
  const isManager = currentRole === 'manager';
  const isAdmin = currentRole === 'admin';
  const roleBase = isManager ? '/manager' : '/admin';

  const user = getAuthUser();

  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : 'เขต โสภณ';
  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'AD';

  // Live Clock for Header
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      setCurrentTime(formatted.replace(',', ' ·'));
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const navItems = [
    {
      title: 'ภาพรวม',
      path: `${roleBase}/dashboard`,
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      title: 'ห้องและราคา',
      path: `${roleBase}/rooms`,
      icon: BedDouble,
      adminOnly: false,
    },
    {
      title: 'รายงาน',
      path: `${roleBase}/reports`,
      icon: BarChart3,
      adminOnly: false,
    },
    {
      title: 'ผู้ใช้และสิทธิ์',
      path: `/admin/users`,
      icon: Users,
      adminOnly: true,
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
                    {isAdmin ? 'ADMIN PORTAL' : 'MANAGER PORTAL'}
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
              // Rule: For Manager, completely HIDE Admin-only items (No Lock badge!)
              if (isManager && item.adminOnly) {
                return null;
              }

              const isActive =
                currentPath === item.path ||
                (item.path.includes('dashboard') && currentPath === roleBase) ||
                (item.path.includes('dashboard') && currentPath === `${roleBase}/`);

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

        {/* User Card at Bottom: Only Logout button */}
        <div className="p-3 border-t border-slate-200/80 bg-white shrink-0">
          {isCollapsed ? (
            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="w-full flex items-center justify-center p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4 text-red-500" />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50/70 hover:bg-red-100/70 rounded-lg border border-red-200/80 transition-colors shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              <span>ออกจากระบบ</span>
            </button>
          )}
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA: Scrolls independently, NEVER stretches sidebar */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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

            {/* User Name & Role Badge positioned on Top-Right */}
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
              <span className="text-xs text-slate-400">{userName}<span className='text-xs text-slate-400 lowercase'> - {isAdmin ? 'ADMIN' : 'MANAGER'}</span></span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime}</span>
            </div>
          </div>
        </header>

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
        <main className="p-6 md:p-8 flex-1">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
