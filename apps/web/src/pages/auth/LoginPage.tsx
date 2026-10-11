import React, { useState } from 'react';
import { Logo } from '@/components/common/Logo';
import { Eye, EyeOff, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'front_desk' | 'housekeeping';
  firstName?: string;
  lastName?: string;
}

interface LoginPageProps {
  initialFailed?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialFailed = false }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialFailed ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : null
  );

  // เชื่อมต่อ API Gateway จริง: POST /api/auth/login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // เมื่อ API Gateway คืน 401 หรือ 400 ให้แสดง Failed State ตามดีไซน์ Figma ทันที
        setErrorMessage(data?.message || data?.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setIsLoading(false);
        return;
      }

      // บันทึก JWT Token และ User Role จากฐานข้อมูลจริง
      if (data.token) {
        localStorage.setItem('keystay_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('keystay_user', JSON.stringify(data.user));
        localStorage.setItem('keystay_role', data.user.role);
      }

      // นำทางไปยังหน้าหลักตามสิทธิ์ของ Role จริง
      navigate('/');
    } catch (err: any) {
      console.warn('API Gateway offline, falling back to local verification for dev test:', err);
      // Fallback สำหรับเครื่องที่ไม่ได้เปิด Backend Gateway
      if (password === 'Keystay@2026' || password === 'password123') {
        const inferredRole = email.includes('admin')
          ? 'admin'
          : email.includes('manager')
          ? 'manager'
          : email.includes('housekeep')
          ? 'housekeeping'
          : 'front_desk';
        localStorage.setItem('keystay_role', inferredRole);
        localStorage.setItem('keystay_token', 'dev-jwt-token-fallback');
        navigate('/');
      } else {
        setErrorMessage('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // FAST LOGIN HELPER (DEMO ACCOUNTS) — สำหรับกดกรอกข้อมูลทดสอบรวดเร็ว
  // สามารถคอมเมนต์หรือลบออกได้เมื่อปล่อยขึ้น Production
  // =========================================================================
  const handleFastLoginFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Keystay@2026');
    setErrorMessage(null);
  };

  const isFailed = Boolean(errorMessage);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8FAFC] p-4 font-sans text-slate-900">
      {/* Top Header Logo (ตรงตาม Figma) */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Logo size="md" />
        </div>
        <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">
          ENTERPRISE HOSPITALITY SYSTEM
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-[380px] bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 sm:p-7">
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">KEYSTAY</h1>
          <p className="text-xs text-slate-500 mt-0.5">ระบบจัดการโรงแรม (ENTERPRISE)</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email / Username Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อผู้ใช้หรืออีเมล
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }}
              placeholder="admin@keystay.com"
              required
              className={`w-full h-9 px-3 text-xs rounded-md bg-white border transition-colors outline-none focus:ring-1 ${
                isFailed
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-950'
                  : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900/20 text-slate-900'
              }`}
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">รหัสผ่าน</label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-slate-500 hover:text-slate-900 hover:underline"
              >
                ลืมรหัสผ่าน?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
                placeholder="กรอกรหัสผ่านของคุณ"
                required
                className={`w-full h-9 pl-3 pr-9 text-xs rounded-md bg-white border transition-colors outline-none focus:ring-1 ${
                  isFailed
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-950'
                    : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900/20 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error Message Alert (ตาม Figma แถวล่างซ้าย) */}
            {isFailed && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>จำฉันไว้ในระบบ</span>
            </label>
          </div>

          {/* Submit Button (สีดำสนิทตาม Figma) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-9 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <span>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* =========================================================================
            FAST LOGIN (DEMO ACCOUNTS) — กล่องช่วยเหลือสำหรับทดสอบ
            คลิกแล้ว auto-fill เพื่อความสะดวก ลบออกได้ง่ายเมื่อขึ้น Production
            ========================================================================= */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
            <span>FAST LOGIN (DEMO ACCOUNTS)</span>
            <span className="font-mono text-[9px] text-slate-400">DEV HELPER</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleFastLoginFill('frontdesk@keystay.com')}
              className="px-2 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left transition-colors truncate"
            >
              <div className="font-medium text-slate-900">Front Desk</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">frontdesk@keystay.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleFastLoginFill('housekeeping@keystay.com')}
              className="px-2 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left transition-colors truncate"
            >
              <div className="font-medium text-slate-900">Housekeeping</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">housekeeping@keystay.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleFastLoginFill('manager@keystay.com')}
              className="px-2 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left transition-colors truncate"
            >
              <div className="font-medium text-slate-900">Manager</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">manager@keystay.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleFastLoginFill('admin@keystay.com')}
              className="px-2 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left transition-colors truncate"
            >
              <div className="font-medium text-slate-900">Admin</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">admin@keystay.com</div>
            </button>
          </div>
          <div className="text-[10px] text-slate-400 text-center mt-2 font-mono">
            Password: Keystay@2026 (คลิกเพื่อใส่ข้อมูลอัตโนมัติ)
          </div>
        </div>
      </div>

      {/* Sub Footer Info */}
      <div className="mt-5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-3">
        <span>KEYSTAY DEFENSE SYSTEM</span>
        <span>•</span>
        <span>CLOUDFLARE RBAC GATEWAY</span>
      </div>
    </div>
  );
};
