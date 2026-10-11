import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { LoginFailedPage } from './pages/auth/LoginFailedPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { Forbidden403Page } from './pages/auth/Forbidden403Page';
import { Logo } from './components/common/Logo';
import { 
  Building2, 
  Sparkles, 
  BarChart3, 
  Database, 
  KeyRound, 
  AlertCircle, 
  Mail, 
  Lock, 
  ShieldX, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const HomeOverview: React.FC = () => {
  const authDesigns = [
    {
      title: 'เข้าสู่ระบบ (Staff Login)',
      path: '/login',
      desc: 'หน้าเข้าสู่ระบบพร้อมช่องกรอก พ่วง Fast Login Demo Account และเชื่อม API Gateway',
      icon: KeyRound,
      badge: 'Figma 1-3952',
    },
    {
      title: 'เข้าสู่ระบบล้มเหลว (Login Failed)',
      path: '/login-failed',
      desc: 'หน้าแสดง Error กรอบสีแดงและแจ้งเตือนชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      icon: AlertCircle,
      badge: 'Figma 1-4151',
    },
    {
      title: 'ตั้งรหัสผ่านใหม่ (Reset Password)',
      path: '/reset-password',
      desc: 'หน้ากำหนดรหัสผ่านใหม่พร้อม Checklist ตรวจสอบความปลอดภัย 4 ข้อ',
      icon: Lock,
      badge: 'Figma 1-4748',
    },
    {
      title: 'ลืมรหัสผ่าน (Forgot Password)',
      path: '/forgot-password',
      desc: 'หน้ากรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน พร้อมกล่องคำแนะนำ',
      icon: Mail,
      badge: 'Figma 1-4056',
    },
    {
      title: '403 ไม่มีสิทธิ์เข้าถึง (Forbidden)',
      path: '/403',
      desc: 'หน้า 403 ขนาดใหญ่ แจ้งเตือนสิทธิ์ RBAC พร้อมปุ่มกลับหน้าหลักและออกจากระบบ',
      icon: ShieldX,
      badge: 'Figma 1-4656',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-accent border border-orange-200">
              5 Figma Auth Designs
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Cloudflare D1 + API Gateway + shadcn/ui
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            KEYSTAY Authentication & Access Control Designs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ถอดแบบจาก Figma ทั้ง 5 หน้าจอ เชื่อมต่อ API Gateway จริง และมี Fast Login Demo Helper
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-8">
          {authDesigns.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-900 hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="p-2 rounded-lg bg-slate-50 text-slate-900 border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-xs mb-1 group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                    {item.desc}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-900 group-hover:text-accent pt-2 border-t border-slate-100">
                  <span>เปิดหน้าจอ</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ความปลอดภัย & การเชื่อมต่อ API Gateway</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            หน้าจอทั้งหมดส่ง Request ผ่าน Proxy ไปยัง API Gateway (<code className="bg-slate-100 px-1 py-0.5 rounded">http://localhost:8787/api/auth/*</code>) 
            ซึ่งถอดรหัสและออก JWT Token จาก D1 Database จริง และมีกล่อง Fast Login ช่วยกรอกบัญชีทดสอบทั้ง 4 Roles
          </p>
        </div>
      </main>
    </div>
  );
};

// Top Quick Switcher สำหรับสลับดูทั้ง 5 หน้าได้สะดวกรวดเร็ว
const QuickNavSwitcher: React.FC = () => {
  const location = useLocation();
  const routes = [
    { label: 'Overview', path: '/' },
    { label: 'Login', path: '/login' },
    { label: 'Failed', path: '/login-failed' },
    { label: 'Reset Pwd', path: '/reset-password' },
    { label: 'Forgot Pwd', path: '/forgot-password' },
    { label: '403', path: '/403' },
  ];

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-lg border border-slate-200/90 shadow-sm text-[11px]">
      {routes.map((r) => {
        const isActive = location.pathname === r.path;
        return (
          <Link
            key={r.path}
            to={r.path}
            className={`px-2 py-1 rounded transition-colors font-medium ${
              isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <QuickNavSwitcher />
      <Routes>
        <Route path="/" element={<HomeOverview />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login-failed" element={<LoginFailedPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/403" element={<Forbidden403Page />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
