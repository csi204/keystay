import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { I18nProvider } from './lib/i18n';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { NotFound404Page } from './pages/auth/NotFound404Page';
import { SplashScreen } from './components/common/SplashScreen';
import { Logo } from './components/common/Logo';
import { ShieldCheck, LogOut, KeyRound, UserCheck } from 'lucide-react';

// ============================================================================
// ENTERPRISE ROUTE GUARDS (ความปลอดภัยระดับสูง)
// ============================================================================

import { getAuthToken, getAuthRole, getAuthUser, clearAuthSession, apiUrl } from './lib/api';

// ============================================================================
// ENTERPRISE LAZY LOADING (Code Splitting ตามเอกสาร)
// ============================================================================
const ManagerDashboardPage = React.lazy(() => import('./pages/admin/ManagerDashboardPage'));
const RoomsPricingPage = React.lazy(() => import('./pages/admin/RoomsPricingPage'));
const UsersManagementPage = React.lazy(() => import('./pages/admin/UsersManagementPage'));
const ReportsAnalyticsPage = React.lazy(() => import('./pages/admin/ReportsAnalyticsPage'));
const HousekeepingPortalPage = React.lazy(() => import('./pages/housekeeping/HousekeepingPortalPage'));
const MinibarCatalogPage = React.lazy(() => import('./pages/admin/MinibarCatalogPage'));

// ============================================================================
// ENTERPRISE ROUTE GUARDS (ความปลอดภัยระดับสูง แยกตาม Tab Session)
// ============================================================================

// Guard 1: ตรวจสอบการยืนยันตัวตน (ถ้าไม่มี token จะส่งไปหน้า /login ตั้งแต่เริ่มโหลดเพจทันที)
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getAuthToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Guard 2: ห้ามคนที่ล็อกอินแล้วแอบพิมพ์ URL ย้อนกลับไปหน้า Login/Forgot (ให้ดีดกลับไปหน้าหลักทันที)
const GuestOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getAuthToken();
  if (token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// ============================================================================
// Authenticated Home Layout (หน้าชั่วคราวสำหรับยืนยัน Session)
// ============================================================================
const AuthenticatedHome: React.FC = () => {
  const navigate = useNavigate();
  const role = getAuthRole();

  // If user is Owner, seamlessly forward to owner portal dashboard
  if (role === 'owner') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (role === 'housekeeping') {
    return <Navigate to="/housekeeping" replace />;
  }

  const user = getAuthUser();

  const roleLabels: Record<string, string> = {
    owner: 'เจ้าของ (Owner)',
    front_desk: 'พนักงานต้อนรับ (Front Desk)',
    housekeeping: 'แผนกแม่บ้าน (Housekeeping)',
  };

  const handleLogout = async () => {
    try {
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        },
      }).catch(() => {});
    } finally {
      clearAuthSession();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={true} />
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {roleLabels[role] || role}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/change-password"
              className="px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors flex items-center gap-1.5 font-medium"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>เปลี่ยนรหัสผ่าน</span>
            </Link>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-red-200 transition-colors flex items-center gap-1.5 font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                ยินดีต้อนรับสู่ระบบ KEYSTAY
              </h1>
              <p className="text-xs text-slate-500">
                เข้าสู่ระบบสำเร็จในฐานะ <span className="font-semibold text-slate-800">{roleLabels[role] || role}</span> ({user?.email || 'Authenticated User'})
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>สถานะการยืนยันตัวตน (RBAC Session Active)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              บัญชีของคุณผ่านการตรวจสอบสิทธิ์ JWT จาก Cloudflare API Gateway เรียบร้อยแล้ว
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  // Splash Screen State: แสดงตอนเข้าใช้งานครั้งแรก (คลิกเพื่อข้ามได้)
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    return !sessionStorage.getItem('keystay_splash_shown');
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('keystay_splash_shown', 'true');
    setShowSplash(false);
  };

  return (
    <I18nProvider>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <React.Suspense
          fallback={
            <div className="min-h-screen bg-[#F7F9FB] flex flex-col items-center justify-center p-8 text-slate-500">
              <div className="w-9 h-9 rounded-full border-2 border-[#F97316] border-t-transparent animate-spin mb-3" />
              <span className="text-xs font-medium">กำลังโหลดโมดูลระบบ...</span>
            </div>
          }
        >
          <Routes>
          {/* หน้าแรก: ถ้ามี token ให้ส่งต่อไปยังหน้าตามบทบาท ถ้าไม่มี token ส่งไป /login ตั้งแต่เริ่มโหลดเพจทันที */}
          <Route
            path="/"
            element={
              getAuthToken() ? (
                <AuthenticatedHome />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {/* หน้า Admin Portal (สำหรับผู้ดูแลระบบ Admin) */}
          <Route
            path="/admin"
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth>
                <ManagerDashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/rooms"
            element={
              <RequireAuth>
                <RoomsPricingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireAuth>
                <ReportsAnalyticsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAuth>
                <UsersManagementPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/minibar"
            element={
              <RequireAuth>
                <MinibarCatalogPage />
              </RequireAuth>
            }
          />

          {/* Housekeeping Portal */}
          <Route
            path="/housekeeping"
            element={
              <RequireAuth>
                <HousekeepingPortalPage />
              </RequireAuth>
            }
          />

          <Route
            path="/change-password"
            element={
              <RequireAuth>
                <ResetPasswordPage mode="change" />
              </RequireAuth>
            }
          />

          {/* หน้า Auth: สำหรับผู้ใช้ที่ยังไม่ล็อกอิน หากล็อกอินแล้วแอบพิมพ์มา จะดีดกลับหน้า / ทันที */}
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestOnly>
                <ForgotPasswordPage />
              </GuestOnly>
            }
          />
          <Route
            path="/reset-password"
            element={
              <GuestOnly>
                <ResetPasswordPage mode="reset" />
              </GuestOnly>
            }
          />

          {/* URL อื่นๆ ทั้งหมดที่ไม่มีในระบบ: แสดง 404 พร้อมปุ่มย้อนกลับ */}
          <Route path="*" element={<NotFound404Page />} />
        </Routes>
        </React.Suspense>
      </BrowserRouter>
    </I18nProvider>
  );
};

export default App;
