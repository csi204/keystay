import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
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

import { getAuthToken, getAuthRole, getAuthUser, clearAuthSession } from './lib/api';

// ============================================================================
// ENTERPRISE LAZY LOADING (Code Splitting ตามเอกสาร)
// ============================================================================
const ManagerDashboardPage = React.lazy(() => import('./pages/admin/ManagerDashboardPage'));
const RoomsPricingPage = React.lazy(() => import('./pages/admin/RoomsPricingPage'));
const UsersManagementPage = React.lazy(() => import('./pages/admin/UsersManagementPage'));
const ReportsAnalyticsPage = React.lazy(() => import('./pages/admin/ReportsAnalyticsPage'));

// ============================================================================
// ENTERPRISE ROUTE GUARDS (ความปลอดภัยระดับสูง แยกตาม Tab Session)
// ============================================================================

// Guard 1: ห้ามคนนอกแอบพิมพ์ URL เข้าหน้าภายในโดยตรง (ถ้าไม่มี token จะส่งไป 404 เสมือนไม่มีหน้านี้)
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getAuthToken();
  if (!token) {
    return <NotFound404Page />;
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

  // If user is Admin or Manager, seamlessly forward to their portal dashboard
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (role === 'manager') {
    return <Navigate to="/manager/dashboard" replace />;
  }

  const user = getAuthUser();

  const roleLabels: Record<string, string> = {
    admin: 'ผู้ดูแลระบบ (Admin)',
    manager: 'ผู้จัดการ (Manager)',
    front_desk: 'พนักงานต้อนรับ (Front Desk)',
    housekeeping: 'แผนกแม่บ้าน (Housekeeping)',
  };

  const handleLogout = () => {
    localStorage.removeItem('keystay_token');
    localStorage.removeItem('keystay_user');
    localStorage.removeItem('keystay_role');
    navigate('/login');
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
    <>
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
          {/* หน้าภายใน: ต้องล็อกอินเท่านั้น หากแอบพิมพ์ URL เข้ามาจะเจอหน้า 404 ทันที */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <AuthenticatedHome />
              </RequireAuth>
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

          {/* หน้า Manager Portal (สำหรับผู้จัดการ Manager) */}
          <Route
            path="/manager"
            element={<Navigate to="/manager/dashboard" replace />}
          />
          <Route
            path="/manager/dashboard"
            element={
              <RequireAuth>
                <ManagerDashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/manager/rooms"
            element={
              <RequireAuth>
                <RoomsPricingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/manager/reports"
            element={
              <RequireAuth>
                <ReportsAnalyticsPage />
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
    </>
  );
};

export default App;
