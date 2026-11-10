import React from 'react';
import { Logo } from '@/components/common/Logo';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '@/lib/api';
import { LogIn, ArrowLeft, Home } from 'lucide-react';

export const NotFound404Page: React.FC = () => {
  const navigate = useNavigate();
  const token = getAuthToken();

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#F8FAFC] p-4 font-sans text-slate-900">
      {/* Top Header Logo */}
      <div className="flex flex-col items-center mb-6 select-none">
        <Logo size="md" showText={true} />
        <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold mt-1">
          ENTERPRISE HOSPITALITY SYSTEM
        </span>
      </div>

      {/* Main 404 Card */}
      <div className="w-full max-w-[420px] bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-center">
        {/* Large 404 Number */}
        <div className="mb-2">
          <span className="text-6xl sm:text-7xl font-bold tracking-tight text-slate-900 font-mono">
            404
          </span>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-lg font-bold tracking-tight text-slate-900 mb-2">
          ไม่พบหน้าที่คุณต้องการ
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
          {!token
            ? 'คุณยังไม่ได้เข้าสู่ระบบ หรือเซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบเพื่อเข้าใช้งานหน้านี้'
            : 'หน้าที่คุณกำลังค้นหาไม่มีอยู่ ถูกย้ายไปแล้ว หรือคุณไม่มีสิทธิ์เข้าถึง'}
        </p>

        {/* Action Buttons */}
        <div className="max-w-xs mx-auto flex flex-col gap-2">
          {!token ? (
            <button
              onClick={() => navigate('/login')}
              className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>เข้าสู่ระบบ (Login)</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>กลับสู่หน้าหลัก</span>
            </button>
          )}

          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(token ? '/' : '/login');
              }
            }}
            className="w-full h-8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>ย้อนกลับไปหน้าที่แล้ว</span>
          </button>
        </div>
      </div>

      {/* Sub Footer Info */}
      <div className="mt-5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-3">
        <span>KEYSTAY DEFENSE SYSTEM</span>
        <span>•</span>
        <span>ERROR 404 NOT FOUND</span>
      </div>
    </div>
  );
};

export default NotFound404Page;
