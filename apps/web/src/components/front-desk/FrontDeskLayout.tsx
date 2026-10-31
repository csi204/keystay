import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import {
  LayoutGrid,
  CalendarDays,
  UserCheck,
  ReceiptText,
  LogOut,
  Clock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { getAuthRole, getAuthUser, clearAuthSession } from '@/lib/api';

interface FrontDeskLayoutProps {
  children: React.ReactNode;
  activeTab?: 'matrix' | 'reservations' | 'operations' | 'billing';
}

export const FrontDeskLayout: React.FC<FrontDeskLayoutProps> = ({
  children,
  activeTab,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve user
  const user = getAuthUser();
  const userName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : 'เดียร์ (ธีรภัทร)';

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('th-TH', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      setCurrentTime(formatted);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const navTabs = [
    {
      key: 'matrix',
      title: 'ผังห้องพัก (Room Matrix)',
      path: '/front-desk/room-matrix',
      icon: LayoutGrid,
    },
    {
      key: 'reservations',
      title: 'รายการจอง (Reservations)',
      path: '/front-desk/reservations',
      icon: CalendarDays,
    },
    {
      key: 'operations',
      title: 'เช็คอิน / เช็คเอาท์ วันนี้',
      path: '/front-desk/daily-operations',
      icon: UserCheck,
    },
    {
      key: 'billing',
      title: 'แคชเชียร์และบิล (Bills & Cashier)',
      path: '/front-desk/billing',
      icon: ReceiptText,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      {/* Top Main Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={true} />
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Front Desk & Cashier
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock */}
            {currentTime && (
              <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* User Badge */}
            <div className="text-xs text-slate-700 font-medium hidden lg:block">
              {userName}
            </div>

            {/* Change Password */}
            <Link
              to="/change-password"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
              title="เปลี่ยนรหัสผ่าน"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-red-200 transition-colors flex items-center gap-1 font-medium"
              title="ออกจากระบบ"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* Secondary Navigation Tabs */}
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                activeTab === tab.key || location.pathname === tab.path;
              return (
                <Link
                  key={tab.key}
                  to={tab.path}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-slate-900 text-slate-900 bg-white shadow-sm font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  />
                  <span>{tab.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
};
