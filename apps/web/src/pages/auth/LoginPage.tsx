import React, { useState } from 'react';
import { Logo } from '@/components/common/Logo';
import { Eye, EyeOff, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { apiUrl } from '@/lib/api';

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
    setErrorMessage(null);

    // ตรวจสอบข้อมูลก่อนส่ง เพื่อป้องกัน Browser Tooltip ป็อปอัปขัดจังหวะ
    if (!email.trim() || !password) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      let data: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      }

      if (response.ok && data?.token) {
        localStorage.setItem('keystay_token', data.token);
        if (data.user) {
          localStorage.setItem('keystay_user', JSON.stringify(data.user));
          localStorage.setItem('keystay_role', data.user.role);
        }
        navigate('/');
        return;
      }

      if (!response.ok && (response.status === 400 || response.status === 401)) {
        setErrorMessage(data?.message || data?.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setIsLoading(false);
        return;
      }

      // If gateway returned 500 or offline, throw to fallback
      throw new Error('Gateway offline');
    } catch {
      // Dev local fallback (เมื่อไม่ได้รัน Cloudflare Worker Backend แยก)
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
        localStorage.setItem('keystay_user', JSON.stringify({ email: email.trim(), role: inferredRole }));
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
          <h1 className="text-lg font-bold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
          <p className="text-xs text-slate-500 mt-0.5">ระบบจัดการโรงแรม (ENTERPRISE)</p>
        </div>

        <form noValidate onSubmit={handleLogin} className="space-y-4">
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
              className={`w-full h-9 px-3 text-xs rounded-md bg-white border transition-colors outline-none focus:ring-1 ${
                isFailed
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-950'
                  : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900/20 text-slate-900'
              }`}
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">รหัสผ่าน</label>
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

            {/* Error Message Alert (ตรงตาม Figma แสดงใต้ช่องรหัส) */}
            {isFailed && (
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 text-xs text-red-600 bg-red-50/70 border border-red-200/80 rounded-md font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Row: จดจำฉัน (ซ้าย) & ลืมรหัสผ่าน? (ขวา) อยู่ใต้ input รหัสผ่าน */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
              />
              <span>จำฉันไว้ในระบบ</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-slate-500 hover:text-slate-900 hover:underline"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>

          {/* Submit Button (สีดำสนิทตาม Figma ไม่มีลูกศร) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-9 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
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
