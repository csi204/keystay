import React from 'react';
import { Logo } from '@/components/common/Logo';
import { useNavigate } from 'react-router-dom';

export const NotFound404Page: React.FC = () => {
  const navigate = useNavigate();

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
          หน้าที่คุณกำลังค้นหาไม่มีอยู่ หรือถูกย้ายไปแล้ว กรุณาตรวจสอบ URL อีกครั้ง หรือกลับสู่หน้าหลัก
        </p>

        {/* Action Button (ย้อนกลับไปหน้าที่แอบเข้ามา/หน้าที่แล้ว) */}
        <div className="max-w-xs mx-auto">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                const token = localStorage.getItem('keystay_token');
                navigate(token ? '/' : '/login');
              }
            }}
            className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
          >
            ย้อนกลับไปหน้าที่แล้ว
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
