import React from 'react';
import { Logo } from '@/components/common/Logo';
import { ArrowRight, LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Forbidden403Page: React.FC = () => {
  const navigate = useNavigate();

  // ดึง Role จริงที่ได้จาก JWT Login
  const storedRole = localStorage.getItem('keystay_role') || 'front_desk';
  const roleDisplayNames: Record<string, string> = {
    admin: 'ผู้ดูแลระบบ (System Admin)',
    manager: 'ผู้จัดการโรงแรม (Manager)',
    front_desk: 'พนักงานต้อนรับ (Front Desk & Cashier)',
    housekeeping: 'แผนกแม่บ้าน (Housekeeping)',
  };

  const roleNameTh = roleDisplayNames[storedRole] || storedRole;

  const handleLogout = () => {
    localStorage.removeItem('keystay_token');
    localStorage.removeItem('keystay_user');
    localStorage.removeItem('keystay_role');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F8FAFC] p-4 font-sans text-slate-900">
      {/* Top Header Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Logo size="md" />
        </div>
        <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">
          KEYSTAY DEFENSE • RBAC ENFORCED
        </span>
      </div>

      {/* Main 403 Card (กล่องกว้างเรียบหรูตาม Figma) */}
      <div className="w-full max-w-[480px] bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-center">
        {/* Large 403 Number */}
        <div className="mb-2">
          <span className="text-6xl sm:text-7xl font-bold tracking-tight text-slate-900 font-mono">
            403
          </span>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
          ไม่มีสิทธิ์เข้าถึงหน้านี้
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
          คุณเข้าสู่ระบบในฐานะ <strong className="text-slate-800 font-semibold">{roleNameTh}</strong> ซึ่งไม่มีสิทธิ์เข้าถึงหน้านี้ตามนโยบายรักษาความปลอดภัย กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์
        </p>

        {/* Action Buttons (ตาม Figma: ปุ่มดำ + ปุ่มขอบเทา) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-xs mx-auto">
          <button
            onClick={() => navigate('/')}
            className="w-full sm:flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <span>กลับไปหน้าหลัก</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full sm:flex-1 h-9 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Sub Footer Info */}
      <div className="mt-5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-3">
        <span>ERROR CODE: HTTP_403_FORBIDDEN</span>
        <span>•</span>
        <span>SECURITY PROTOCOL ACTIVE</span>
      </div>
    </div>
  );
};
