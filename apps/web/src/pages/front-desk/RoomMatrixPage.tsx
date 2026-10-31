import React from 'react';
import { FrontDeskLayout } from '@/components/front-desk/FrontDeskLayout';

export const RoomMatrixPage: React.FC = () => {
  return (
    <FrontDeskLayout activeTab="matrix">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              ผังห้องพัก (Room Matrix)
            </h1>
            <p className="text-xs text-slate-500">
              โรงแรม KEYSTAY · ตรวจสอบสถานะห้องแบบ Real-time และจัดการเช็คอิน-เช็คเอาท์
            </p>
          </div>
        </div>
      </div>
    </FrontDeskLayout>
  );
};

export default RoomMatrixPage;
