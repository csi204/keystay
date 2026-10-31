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
import { useI18n } from '@/lib/i18n';
import { QuickEmergencyDrawer } from './QuickEmergencyDrawer';

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
  const { locale, setLocale, t } = useI18n();
  const [isEmergencyOpen, setIsEmergencyOpen] = useState<boolean>(false);

  // Retrieve user
  const user = getAuthUser();
  const userName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : 'เดียร์ (ธีรภัทร)';

  // Live Clock (localized according to active language)
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', {
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
  }, [locale]);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const navTabs = [
    {
      key: 'matrix',
      title: t('nav.roomMatrix'),
      path: '/front-desk/room-matrix',
      icon: LayoutGrid,
    },
    {
      key: 'reservations',
      title: t('nav.reservations'),
      path: '/front-desk/reservations',
      icon: CalendarDays,
    },
    {
      key: 'operations',
      title: t('nav.dailyOperations'),
      path: '/front-desk/daily-operations',
      icon: UserCheck,
    },
    {
      key: 'billing',
      title: t('nav.billing'),
      path: '/front-desk/billing',
      icon: ReceiptText,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      {/* Top Main Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          {/* Logo & Section Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <Logo size="md" showText={true} />
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {t('nav.systemName')}
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Quick Emergency Outsource Contact Button */}
            <button
              type="button"
              onClick={() => setIsEmergencyOpen(true)}
              className="px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/90 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 shadow-xs"
              title={t('emergency.buttonTitle')}
              aria-label={t('emergency.buttonTitle')}
            >
              <span role="img" aria-label="alert">🚨</span>
              <span className="hidden sm:inline">{t('emergency.buttonTitle')}</span>
            </button>

            {/* Segmented Language Switcher [ TH | EN ] */}
            <div
              role="group"
              aria-label="Language Switcher"
              className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/90 text-xs font-medium"
            >
              <button
                type="button"
                onClick={() => setLocale('th')}
                className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                  locale === 'th'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-pressed={locale === 'th'}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                  locale === 'en'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-pressed={locale === 'en'}
              >
                EN
              </button>
            </div>

            {/* Live Clock */}
            {currentTime && (
              <div className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-mono font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* User Profile Indicator */}
            <div className="hidden lg:flex items-center gap-2 pl-1">
              <div className="w-7 h-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xs font-semibold text-orange-700">
                {userName.charAt(0)}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-slate-900 leading-tight">{userName}</span>
                <span className="text-[10px] text-slate-500 leading-tight">Front Desk</span>
              </div>
            </div>

            {/* Change Password */}
            <Link
              to="/change-password"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title={t('nav.changePassword')}
              aria-label={t('nav.changePassword')}
            >
              <KeyRound className="w-3.5 h-3.5" />
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 font-medium"
              title={t('nav.logout')}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </div>

        {/* Secondary Navigation Tabs */}
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto no-scrollbar">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                activeTab === tab.key || location.pathname === tab.path;
              return (
                <Link
                  key={tab.key}
                  to={tab.path}
                  className={`flex items-center gap-2 text-sm font-medium py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-slate-900 text-slate-900 bg-white shadow-xs font-semibold'
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
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Quick Emergency Outsource Contact Drawer */}
      <QuickEmergencyDrawer
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />
    </div>
  );
};
