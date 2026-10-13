import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch, getAuthRole } from '@/lib/api';
import {
  TrendingUp,
  BedDouble,
  DollarSign,
  Calendar,
  RefreshCw,
  LogIn,
  LogOut,
  Award,
  ArrowUpRight,
  CircleDot,
  BarChart2,
} from 'lucide-react';

interface DashboardSummaryData {
  date: string;
  last_updated: string;
  kpi: {
    occupancy_rate: number;
    total_revenue_today: number;
    room_revenue_today: number;
    minibar_revenue_today: number;
    rooms_occupied: number;
    rooms_available: number;
    rooms_reserved: number;
    rooms_maintenance: number;
    total_rooms: number;
    checkins_today: number;
    checkouts_today: number;
  };
  monthly_mtd: {
    month: string;
    total_revenue: number;
    avg_occupancy_rate: number;
    adr: number;
    revpar: number;
  };
  top_performing_rooms: Array<{
    room_number: string;
    room_type_name: string;
    total_revenue: number;
    total_nights_sold: number;
  }>;
}

export const ManagerDashboardPage: React.FC = () => {
  const currentRole = getAuthRole();
  const isManager = currentRole === 'manager';
  const roleBase = isManager ? '/manager' : '/admin';

  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [data, setData] = useState<DashboardSummaryData>({
    date: '2026-10-04',
    last_updated: new Date().toISOString(),
    kpi: {
      occupancy_rate: 68.18,
      total_revenue_today: 62100.0,
      room_revenue_today: 58200.0,
      minibar_revenue_today: 3900.0,
      rooms_occupied: 15,
      rooms_available: 5,
      rooms_reserved: 1,
      rooms_maintenance: 1,
      total_rooms: 22,
      checkins_today: 4,
      checkouts_today: 3,
    },
    monthly_mtd: {
      month: '2026-10',
      total_revenue: 1720000.0,
      avg_occupancy_rate: 74.2,
      adr: 4020.0,
      revpar: 2982.84,
    },
    top_performing_rooms: [
      {
        room_number: '101',
        room_type_name: 'Standard',
        total_revenue: 54600.0,
        total_nights_sold: 14,
      },
      {
        room_number: '201',
        room_type_name: 'Deluxe',
        total_revenue: 72000.0,
        total_nights_sold: 16,
      },
      {
        room_number: '301',
        room_type_name: 'Executive Suite',
        total_revenue: 98000.0,
        total_nights_sold: 12,
      },
    ],
  });

  const loadData = async () => {
    setLoading(true);
    const res = await apiFetch<DashboardSummaryData>('/api/dashboard/summary');
    if (res.data?.kpi) {
      setIsOffline(false);
      setData(res.data);
    } else {
      setIsOffline(res.isOffline);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute visual percentages for live inventory bar
  const total = data.kpi.total_rooms || 22;
  const occPct = Math.round((data.kpi.rooms_occupied / total) * 100);
  const availPct = Math.round((data.kpi.rooms_available / total) * 100);
  const resvPct = Math.round((data.kpi.rooms_reserved / total) * 100);
  const maintPct = Math.max(0, 100 - occPct - availPct - resvPct);

  return (
    <AdminLayout activePath={`${roleBase}/dashboard`} isBackendOffline={isOffline}>
      {/* 1. Executive Context Header */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-5 mb-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <span>หน้าหลัก</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">แดชบอร์ดผู้บริหาร</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                ภาพรวมการดำเนินงานโรงแรม (Executive Dashboard)
              </h1>
              <Badge variant="outline" className="bg-slate-100/80 text-slate-700 border-slate-200 font-mono text-[11px] px-2 py-0.5">
                {data.date}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              สรุปข้อมูลตัวชี้วัดรายวัน ประสิทธิภาพห้องพัก และรายได้สะสมประจำเดือน
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs font-medium gap-1.5 h-8.5 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F97316]' : 'text-slate-500'}`} />
              <span>อัปเดตข้อมูล</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* 2. Unified 4 Core Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Occupancy Rate */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 min-h-[140px] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">อัตราการเข้าพักวันนี้</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                <BedDouble className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {data.kpi.occupancy_rate.toFixed(1)}%
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <span className="font-semibold text-slate-700">{data.kpi.rooms_occupied}</span>
                <span>จากทั้งหมด {data.kpi.total_rooms} ห้อง</span>
              </div>
            </div>
          </div>

          {/* Metric 2: Today's Revenue */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 min-h-[140px] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">รายได้รวมวันนี้</span>
              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200/60">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                ฿{data.kpi.total_revenue_today.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-2 truncate">
                ห้อง ฿{data.kpi.room_revenue_today.toLocaleString()} · มินิบาร์ ฿{data.kpi.minibar_revenue_today.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Metric 3: ADR (MTD) */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 min-h-[140px] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">ราคาเฉลี่ยต่อห้อง (ADR)</span>
              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200/60">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                ฿{data.monthly_mtd.adr.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                เฉลี่ยสะสมเดือน {data.monthly_mtd.month}
              </div>
            </div>
          </div>

          {/* Metric 4: RevPAR (MTD) */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 min-h-[140px] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">รายได้ต่อห้องพร้อมขาย (RevPAR)</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                <BarChart2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono text-[#F97316]">
                ฿{data.monthly_mtd.revpar.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                อัตราเข้าพักเฉลี่ย {data.monthly_mtd.avg_occupancy_rate.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* 3. Middle Section: Operational Breakdown & Monthly MTD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Live Room Inventory & Guest Flow */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    สถานะห้องพักและการเข้า-ออกวันนี้ (Inventory Status)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    จำนวนห้องพักแยกตามสถานะการใช้งานประจำวัน
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono text-slate-600 bg-slate-50 border-slate-200 px-2.5 py-1">
                  ทั้งหมด {total} ห้อง
                </Badge>
              </div>

              {/* Status Columns: Unified Clean White Cards with Subtle Indicators (No Rainbow Slop) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span>มีผู้เข้าพัก (Occupied)</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
                    {data.kpi.rooms_occupied} <span className="text-xs font-normal text-slate-500">ห้อง</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>ห้องว่าง (Available)</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
                    {data.kpi.rooms_available} <span className="text-xs font-normal text-slate-500">ห้อง</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>จองล่วงหน้า (Reserved)</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
                    {data.kpi.rooms_reserved} <span className="text-xs font-normal text-slate-500">ห้อง</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>ปิดปรับปรุง (Maintenance)</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
                    {data.kpi.rooms_maintenance} <span className="text-xs font-normal text-slate-500">ห้อง</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkin / Checkout row */}
            <div className="grid grid-cols-2 gap-3.5 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div className="w-9 h-9 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">เช็คอินวันนี้</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {data.kpi.checkins_today} รายการ
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div className="w-9 h-9 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">เช็คเอาท์วันนี้</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {data.kpi.checkouts_today} รายการ
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Monthly MTD Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h2 className="text-sm font-bold text-slate-900">สรุปสะสมประจำเดือน</h2>
                <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 border-slate-200">
                  {data.monthly_mtd.month}
                </Badge>
              </div>

              <div className="mb-5">
                <span className="text-xs font-medium text-slate-500">รายได้สะสมเดือนนี้ (MTD Revenue)</span>
                <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                  ฿{data.monthly_mtd.total_revenue.toLocaleString()}
                </div>
              </div>

              <div className="space-y-3.5 text-xs border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">อัตราเข้าพักเฉลี่ย:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {data.monthly_mtd.avg_occupancy_rate.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">ราคาเฉลี่ยต่อห้อง (ADR):</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ฿{data.monthly_mtd.adr.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-slate-50 pt-2.5">
                  <span className="text-slate-500 font-medium">RevPAR ประจำเดือน:</span>
                  <span className="font-mono font-bold text-[#F97316]">
                    ฿{data.monthly_mtd.revpar.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Top Performing Rooms Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="py-3.5 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#F97316]" />
              <h2 className="text-sm font-bold text-slate-900">
                ห้องพักที่สร้างรายได้สูงสุดประจำเดือน (Top Performing Rooms)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Report Service API</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-200/80 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">อันดับ</th>
                  <th className="py-3 px-4">หมายเลขห้อง</th>
                  <th className="py-3 px-4">ประเภทห้องพัก</th>
                  <th className="py-3 px-4 text-center">จำนวนคืนที่ขายได้</th>
                  <th className="py-3 px-5 text-right">รายได้สะสม (THB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.top_performing_rooms.map((room, idx) => (
                  <tr key={room.room_number} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-5 text-slate-400 font-mono font-bold">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      ห้อง {room.room_number}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                        {room.room_type_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {room.total_nights_sold} คืน
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-emerald-700">
                      ฿{room.total_revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManagerDashboardPage;
