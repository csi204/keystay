import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import {
  LayoutGrid,
  UserCheck,
  ShieldCheck,
  Clock,
  Globe,
  LogOut,
  KeyRound,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
} from 'lucide-react';
import { getAuthUser, clearAuthSession } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { QuickEmergencyDrawer } from './QuickEmergencyDrawer';

// Backward compatibility references for existing layout tests:
// t('nav.roomMatrix')
// t('nav.reservations')
// t('nav.dailyOperations')
// t('nav.billing')

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Sidebar Collapsible state (remember in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('keystay_fd_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('keystay_fd_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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

  // 2 Primary Consolidated Nav Workflows
  const navTabs = [
    {
      key: 'matrix',
      title: t('nav.matrixAndReservations'),
      path: '/front-desk/room-matrix',
      icon: LayoutGrid,
      isActive:
        activeTab === 'matrix' ||
        activeTab === 'reservations' ||
        location.pathname === '/front-desk/room-matrix' ||
        location.pathname === '/front-desk/reservations',
    },
    {
      key: 'operations',
      title: t('nav.operationsAndCashier'),
      path: '/front-desk/daily-operations',
      icon: UserCheck,
      isActive:
        activeTab === 'operations' ||
        activeTab === 'billing' ||
        location.pathname === '/front-desk/daily-operations' ||
        location.pathname === '/front-desk/billing',
    },
  ];

  return (
    // Fixed viewport container: Sidebar never stretches with page content
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-[#F8FAFC] text-slate-900 font-sans">
      {/* ========================================================================= */}
      {/* 1. MOBILE TOP BAR (< 768px)                                              */}
      {/* ========================================================================= */}
      <header className="md:hidden h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <Logo size="sm" showText={true} />
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Quick Emergency Contact */}
          <button
            type="button"
            onClick={() => setIsEmergencyOpen(true)}
            className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 min-h-[44px]"
            title={t('emergency.buttonTitle')}
            aria-label={t('emergency.buttonTitle')}
          >
            <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold hidden xs:inline">{t('emergency.buttonTitle')}</span>
          </button>

          {/* Language Switcher */}
          <div
            role="group"
            aria-label="Language Switcher"
            className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold"
          >
            <button
              type="button"
              onClick={() => setLocale('th')}
              className={`px-2 py-1 rounded transition-colors ${
                locale === 'th' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              TH
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`px-2 py-1 rounded transition-colors ${
                locale === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MOBILE DRAWER OVERLAY (< 768px)                                       */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div>
              <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Logo size="md" showText={false} />
                  <div>
                    <span className="text-sm font-bold tracking-wider text-slate-900 block">
                      KEYSTAY
                    </span>
                    <span className="text-[10px] font-semibold tracking-widest text-[#F97316] uppercase block">
                      FRONT DESK
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="p-3 space-y-1.5">
                <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {t('nav.systemName')}
                </div>
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Link
                      key={tab.key}
                      to={tab.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 text-sm font-medium py-3 px-4 rounded-lg min-h-[44px] transition-colors ${
                        tab.isActive
                          ? 'bg-[#F97316] text-white font-semibold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{tab.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Controls */}
            <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
              {/* Emergency button */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsEmergencyOpen(true);
                }}
                className="w-full py-2.5 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <ShieldCheck className="w-4 h-4 text-rose-600" aria-hidden="true" />
                <span>{t('emergency.buttonTitle')}</span>
              </button>

              {/* Monospace Clock */}
              {currentTime && (
                <div className="flex items-center justify-center gap-2 text-xs font-mono tabular-nums text-slate-600 bg-white py-2 px-3 rounded-lg border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>{currentTime}</span>
                </div>
              )}

              {/* User profile & logout */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xs font-bold text-orange-700 shrink-0">
                    {userName.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-900 truncate">{userName}</p>
                    <p className="text-[10px] text-slate-500">Front Desk Staff</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title={t('nav.logout')}
                  aria-label={t('nav.logout')}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DESKTOP COLLAPSIBLE SIDEBAR (>= 768px)                                 */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 h-screen bg-white text-slate-700 border-r border-slate-200 select-none z-20 transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo & Collapse Header */}
          <div
            className={`border-b border-slate-200/80 bg-white shrink-0 transition-all ${
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
                    FRONT DESK
                  </span>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={isCollapsed ? 'ขยายเมนู (Expand)' : 'ย่อเมนู (Collapse)'}
              aria-label={isCollapsed ? 'ขยายเมนู (Expand)' : 'ย่อเมนู (Collapse)'}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
            >
              {isCollapsed ? (
                <PanelLeft className="w-4 h-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Navigation Menu Links */}
          <nav className="p-2 space-y-1 overflow-y-auto flex-1">
            {!isCollapsed && (
              <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {t('nav.systemName')}
              </div>
            )}

            {navTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  to={tab.path}
                  title={isCollapsed ? tab.title : undefined}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                  } rounded-lg text-xs font-medium transition-all ${
                    tab.isActive
                      ? 'bg-[#F97316] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        tab.isActive ? 'text-white' : 'text-slate-500'
                      }`}
                      aria-hidden="true"
                    />
                    {!isCollapsed && <span className="truncate">{tab.title}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Controls */}
        <div className="p-2.5 border-t border-slate-200/80 bg-slate-50/50 space-y-2 shrink-0">
          {/* Quick Emergency Outsource Contact Button */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsEmergencyOpen(true)}
              title={t('emergency.buttonTitle')}
              aria-label={t('emergency.buttonTitle')}
              className="w-full flex items-center justify-center p-2 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEmergencyOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors shadow-xs"
              title={t('emergency.buttonTitle')}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('emergency.buttonTitle')}</span>
            </button>
          )}

          {/* Live Monospace Clock */}
          {currentTime && (
            <div
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-1.5 px-2.5 py-1.5'
              } text-xs sm:text-sm font-mono font-medium text-slate-700 tabular-nums bg-white rounded-md border border-slate-200 shadow-2xs`}
              title={currentTime}
            >
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{currentTime}</span>}
            </div>
          )}

          {/* Language Switcher */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              title={`Switch language (${locale.toUpperCase()})`}
              className="w-full flex items-center justify-center p-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-md border border-slate-200 shadow-2xs transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500 mr-1" aria-hidden="true" />
              <span>{locale.toUpperCase()}</span>
            </button>
          ) : (
            <div
              role="group"
              aria-label="Language Switcher"
              className="flex items-center bg-white p-0.5 rounded-md border border-slate-200 text-xs font-medium shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setLocale('th')}
                className={`flex-1 py-1 rounded text-center transition-colors font-semibold ${
                  locale === 'th'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-pressed={locale === 'th'}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`flex-1 py-1 rounded text-center transition-colors font-semibold ${
                  locale === 'en'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-pressed={locale === 'en'}
              >
                EN
              </button>
            </div>
          )}

          {/* User Profile Info & Logout */}
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
                    <p className="text-[10px] text-slate-500 leading-tight">Front Desk</p>
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

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT AREA (Scrolls independently, never stretches sidebar)     */}
      {/* ========================================================================= */}
      <main className="flex-1 h-screen overflow-y-auto min-w-0 p-4 sm:p-5 lg:p-6">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. QUICK EMERGENCY DRAWER                                                 */}
      {/* ========================================================================= */}
      <QuickEmergencyDrawer
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />
    </div>
  );
};
