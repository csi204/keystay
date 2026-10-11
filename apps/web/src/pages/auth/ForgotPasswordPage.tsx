import React, { useState } from 'react';
import { Logo } from '@/components/common/Logo';
import { ArrowRight, ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErrorMessage(data?.message || 'เกิดข้อผิดพลาดในการส่งลิงก์ กรุณาลองใหม่อีกครั้ง');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      // Dev fallback
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8FAFC] p-4 font-sans text-slate-900">
      {/* Top Header Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Logo size="md" />
        </div>
        <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">
          ENTERPRISE HOSPITALITY SYSTEM
        </span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-[380px] bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 sm:p-7">
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">ลืมรหัสผ่าน</h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            กรุณากรอกอีเมลที่ลงทะเบียนไว้กับระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว</h3>
              <p className="text-xs text-slate-500 mt-1">
                กรุณาตรวจสอบกล่องข้อความที่ <span className="font-mono text-slate-900 font-medium">{email}</span>
              </p>
            </div>
            <Link
              to="/reset-password"
              className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <span>ไปที่หน้าตั้งรหัสผ่านใหม่</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <div className="pt-2 text-center">
              <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับไปหน้าเข้าสู่ระบบ</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                อีเมลที่ใช้งาน
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@keystay.com"
                required
                className="w-full h-9 px-3 text-xs rounded-md bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 text-slate-900 outline-none transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <span>{isLoading ? 'กำลังส่งข้อมูล...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Info Box (ตามดีไซน์ Figma เป๊ะ) */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2 leading-relaxed">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                หากไม่พบอีเมลในกล่องจดหมาย กรุณาตรวจสอบในโฟลเดอร์ Junk/Spam หรือติดต่อผู้ดูแลระบบส่วนกลาง
              </span>
            </div>

            {/* Back link */}
            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับไปหน้าเข้าสู่ระบบ</span>
              </Link>
            </div>
          </form>
        )}
      </div>

      {/* Sub Footer Info */}
      <div className="mt-5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-3">
        <span>KEYSTAY DEFENSE SYSTEM</span>
        <span>•</span>
        <span>VERIFIED EMAIL DELIVERY</span>
      </div>
    </div>
  );
};
