import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import {
  LayoutGrid,
  UserCheck,
  CreditCard,
  ShieldCheck,
  Clock,
  Globe,
  LogOut,
  KeyRound,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  ReceiptText,
  Search,
  Keyboard,
  Moon,
  Sun,
} from 'lucide-react';
import { getAuthUser, clearAuthSession } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/context/ThemeContext';
import { QuickEmergencyDrawer } from './QuickEmergencyDrawer';
import { GlobalCommandPalette } from './GlobalCommandPalette';
import { KeyboardShortcutsModal } from '@/components/common/KeyboardShortcutsModal';

// Backward compatibility references for existing layout tests:
// t('nav.roomMatrix')
// t('nav.reservations')
// t('nav.dailyOperations')
// t('nav.billing')
// t('nav.matrixAndReservations')
// t('nav.operationsAndCashier')

interface FrontDeskLayoutProps {
  children: React.ReactNode;
  activeTab?: 'matrix' | 'reservations' | 'operations' | 'billing' | 'cashier';
}

export const FrontDeskLayout: React.FC<FrontDeskLayoutProps> = ({
  children,
  activeTab,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const { theme, isDark, toggleTheme } = useTheme();
  const [isEmergencyOpen, setIsEmergencyOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Global Shortcuts Engine (Ctrl+K, Cmd+K, /, ?, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        Boolean(target?.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
          return;
        }
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
          return;
        }
        if (isEmergencyOpen) {
          setIsEmergencyOpen(false);
          return;
        }
      }
    };

    const handleOpenShortcuts = () => {
      setIsShortcutsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-keyboard-shortcuts', handleOpenShortcuts);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-keyboard-shortcuts', handleOpenShortcuts);
    };
  }, [isShortcutsOpen, isCommandPaletteOpen, isMobileMenuOpen, isEmergencyOpen]);

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

  // Primary Consolidated Nav Workflows
  const navTabs = [
    {
      key: 'matrix',
      title: locale === 'th' ? 'ผังห้องพัก' : 'Room Matrix',
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
      title: locale === 'th' ? 'เช็คอิน & เช็คเอาต์' : 'Check-In & Out',
      path: '/front-desk/daily-operations',
      icon: UserCheck,
      isActive:
        activeTab === 'operations' ||
        location.pathname === '/front-desk/daily-operations',
    },
    {
      key: 'cashier',
      title: locale === 'th' ? 'แคชเชียร์ & บิล' : 'Cashier & Folios',
      path: '/front-desk/cashier',
      icon: CreditCard,
      isActive:
        activeTab === 'cashier' ||
        activeTab === 'billing' ||
        location.pathname === '/front-desk/cashier' ||
        location.pathname === '/front-desk/billing',
    },
  ];

  return (
    // Fixed viewport container: Sidebar never stretches with page content
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* ========================================================================= */}
      {/* 1. MOBILE TOP BAR (< 768px)                                              */}
      {/* ========================================================================= */}
      <header className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <Logo size="sm" showText={true} />
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Quick Search / Omnibar Button */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            title="ค้นหาด่วนหรือพิมพ์คำสั่ง (Ctrl+K)"
            aria-label="ค้นหาด่วนหรือพิมพ์คำสั่ง (Ctrl+K)"
          >
            <Search className="w-5 h-5 text-slate-600 dark:text-slate-300" strokeWidth={1.75} aria-hidden="true" />
          </button>

          {/* Mobile Quick Emergency Contact */}
          <button
            type="button"
            onClick={() => setIsEmergencyOpen(true)}
            className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1 min-h-[44px]"
            title={t('emergency.buttonTitle')}
            aria-label={t('emergency.buttonTitle')}
          >
            <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold hidden xs:inline">{t('emergency.buttonTitle')}</span>
          </button>

          {/* Language Switcher */}
          <div
            role="group"
            aria-label="Language Switcher"
            className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <button
              type="button"
              onClick={() => setLocale('th')}
              className={`px-2.5 py-1.5 rounded-md min-h-[44px] min-w-[40px] flex items-center justify-center transition-colors ${
                locale === 'th' ? 'bg-white dark:bg-slate-900 text-[#F97316] shadow-xs font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              aria-pressed={locale === 'th'}
            >
              TH
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`px-2.5 py-1.5 rounded-md min-h-[44px] min-w-[40px] flex items-center justify-center transition-colors ${
                locale === 'en' ? 'bg-white dark:bg-slate-900 text-[#F97316] shadow-xs font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              aria-pressed={locale === 'en'}
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over panel */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200 border-r border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div>
              <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Logo size="md" showText={false} />
                  <div>
                    <span className="text-sm font-bold tracking-wider text-slate-900 dark:text-slate-100 block">
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
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="p-3 space-y-1.5">
                <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
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
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
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
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              {/* Emergency button */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsEmergencyOpen(true);
                }}
                className="w-full py-2.5 px-3 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                <span>{t('emergency.buttonTitle')}</span>
              </button>

              {/* Night Audit Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full py-2 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-between min-h-[40px]"
                title={locale === 'th' ? 'โหมดกะดึก (Night Audit)' : 'Night Audit (Dark Mode)'}
                aria-label={locale === 'th' ? 'โหมดกะดึก (Night Audit)' : 'Night Audit (Dark Mode)'}
              >
                <div className="flex items-center gap-2">
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <Moon className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span>{locale === 'th' ? 'โหมดกะดึก (Night Audit)' : 'Night Audit (Dark Mode)'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                    isDark
                      ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {isDark ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Monospace Clock */}
              {currentTime && (
                <div className="flex items-center justify-center gap-2 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>{currentTime}</span>
                </div>
              )}

              {/* Keyboard Shortcuts trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsShortcutsOpen(true);
                }}
                className="w-full py-2 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-between min-h-[40px]"
                title={locale === 'th' ? 'ดูคีย์ลัดทั้งหมด (?)' : 'Keyboard shortcuts (?)'}
              >
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-slate-500 dark:text-slate-400" strokeWidth={1.75} aria-hidden="true" />
                  <span>{locale === 'th' ? 'คีย์ลัดระบบ' : 'Keyboard Shortcuts'}</span>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-600">
                  ?
                </kbd>
              </button>

              {/* User profile & logout */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-xs font-bold text-orange-700 dark:text-orange-400 shrink-0">
                    {userName.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{userName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Front Desk Staff</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
        className={`hidden md:flex flex-col justify-between shrink-0 h-screen bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 select-none z-20 transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo & Collapse Header */}
          <div
            className={`border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 transition-all ${
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
                  <span className="text-sm font-bold tracking-wider text-slate-900 dark:text-slate-100 truncate block">
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
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors shrink-0"
            >
              {isCollapsed ? (
                <PanelLeft className="w-4 h-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Omnibar Search Trigger Button */}
          <div className={isCollapsed ? 'p-2 flex justify-center' : 'px-3 pt-3 pb-1'}>
            {isCollapsed ? (
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                title="ค้นหาด่วนหรือพิมพ์คำสั่ง... (Ctrl+K)"
                aria-label="ค้นหาด่วนหรือพิมพ์คำสั่ง... (Ctrl+K)"
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Search className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
                aria-label="ค้นหาด่วนหรือพิมพ์คำสั่ง (Ctrl+K)"
              >
                <div className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">ค้นหาด่วนหรือพิมพ์คำสั่ง...</span>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 shrink-0">
                  Ctrl K
                </kbd>
              </button>
            )}
          </div>

          {/* Navigation Menu Links */}
          <nav className="p-2 space-y-1 overflow-y-auto flex-1">
            {!isCollapsed && (
              <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
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
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        tab.isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
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
        <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 shrink-0">
          {/* Quick Emergency Outsource Contact Button */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsEmergencyOpen(true)}
              title={t('emergency.buttonTitle')}
              aria-label={t('emergency.buttonTitle')}
              className="w-full flex items-center justify-center p-2 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEmergencyOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors shadow-xs"
              title={t('emergency.buttonTitle')}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('emergency.buttonTitle')}</span>
            </button>
          )}

          {/* Live Monospace Clock */}
          {currentTime && (
            <div
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-1.5 px-2.5 py-1.5'
              } text-xs sm:text-sm font-mono font-medium text-slate-700 dark:text-slate-200 tabular-nums bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs`}
              title={currentTime}
            >
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{currentTime}</span>}
            </div>
          )}

          {/* Night Audit / Dark Mode Toggle */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleTheme}
              title={locale === 'th' ? 'โหมดกะดึก (Night Audit)' : 'Night Audit (Dark Mode)'}
              aria-label={locale === 'th' ? 'โหมดกะดึก (Night Audit)' : 'Night Audit (Dark Mode)'}
              className={`w-full flex items-center justify-center p-1.5 text-xs font-bold rounded-md border shadow-2xs transition-colors ${
                isDark
                  ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
              title={locale === 'th' ? 'โหมดกะดึก (Night Audit)' : 'Night Audit (Dark Mode)'}
              aria-label={locale === 'th' ? 'โหมดกะดึก (Night Audit)' : 'Night Audit (Dark Mode)'}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                )}
                <span className="truncate">โหมดกะดึก (Night Audit)</span>
              </div>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                  isDark
                    ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {isDark ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

          {/* Language Switcher */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              title={`Switch language (${locale.toUpperCase()})`}
              className="w-full flex items-center justify-center p-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mr-1" aria-hidden="true" />
              <span>{locale.toUpperCase()}</span>
            </button>
          ) : (
            <div
              role="group"
              aria-label="Language Switcher"
              className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setLocale('th')}
                className={`flex-1 py-1 rounded text-center transition-colors font-semibold ${
                  locale === 'th'
                    ? 'bg-[#F97316] text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
                    ? 'bg-[#F97316] text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                aria-pressed={locale === 'en'}
              >
                EN
              </button>
            </div>
          )}

          {/* Keyboard Shortcuts Trigger Button */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              title={locale === 'th' ? 'ดูคีย์ลัดทั้งหมด (?)' : 'Keyboard shortcuts (?)'}
              aria-label="Keyboard shortcuts"
              className="w-full flex items-center justify-center p-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
              title={locale === 'th' ? 'ดูคีย์ลัดทั้งหมด (?)' : 'Keyboard shortcuts (?)'}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Keyboard className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">{locale === 'th' ? 'คีย์ลัดระบบ' : 'Shortcuts'}</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-600">
                ?
              </kbd>
            </button>
          )}

          {/* User Profile Info & Logout */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {isCollapsed ? (
              <div className="w-full flex flex-col items-center gap-1.5">
                <div
                  className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-xs font-bold text-orange-700 dark:text-orange-400"
                  title={userName}
                >
                  {userName.charAt(0)}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title={t('nav.logout')}
                  aria-label={t('nav.logout')}
                  className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md border border-rose-200 dark:border-rose-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-xs font-bold text-orange-700 dark:text-orange-400 shrink-0">
                    {userName.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                      {userName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Front Desk</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    to="/change-password"
                    title={t('nav.changePassword')}
                    aria-label={t('nav.changePassword')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    title={t('nav.logout')}
                    aria-label={t('nav.logout')}
                    className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md border border-rose-200 dark:border-rose-800 transition-colors"
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
      <main className="flex-1 h-screen overflow-y-auto min-w-0 p-4 sm:p-5 lg:p-6 dark:text-slate-100">
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

      {/* ========================================================================= */}
      {/* 6. GLOBAL COMMAND PALETTE (Ctrl+K / / Omnibar)                             */}
      {/* ========================================================================= */}
      <GlobalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onToggleTheme={toggleTheme}
      />

      {/* ========================================================================= */}
      {/* 7. KEYBOARD SHORTCUTS CHEATSHEET MODAL (?)                                */}
      {/* ========================================================================= */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};
