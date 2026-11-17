import React, { useState, useEffect, useRef } from 'react';
import { apiUrl, getAuthToken } from '@/lib/api';
import {
  X,
  Wrench,
  Sparkles,
  Package,
  AlertCircle,
  Briefcase,
  Camera,
  CloudUpload,
  Trash2,
  Lock,
  Loader2,
} from 'lucide-react';

export type IssueCategoryKey = 'broken' | 'electric' | 'missing' | 'sanitary' | 'lost_and_found';

export const ISSUE_CATEGORY_OPTIONS: Array<{
  key: IssueCategoryKey;
  apiIssueType: 'damage' | 'malfunction' | 'missing_item' | 'cleanliness' | 'lost_and_found';
  label: string;
  subtitle: string;
}> = [
  {
    key: 'broken',
    apiIssueType: 'damage',
    label: 'ชำรุด/แตกหัก',
    subtitle: 'เฟอร์นิเจอร์, ผนัง, สุขภัณฑ์',
  },
  {
    key: 'electric',
    apiIssueType: 'malfunction',
    label: 'เครื่องใช้ไฟฟ้า',
    subtitle: 'แอร์, ทีวี, ตู้เย็น, โคมไฟ',
  },
  {
    key: 'missing',
    apiIssueType: 'missing_item',
    label: 'ของหาย/ไม่ครบ',
    subtitle: 'รีโมท, แก้ว, ผ้าเช็ดตัว',
  },
  {
    key: 'sanitary',
    apiIssueType: 'cleanliness',
    label: 'สุขอนามัย/กลิ่น',
    subtitle: 'คราบหนัก, กลิ่นไม่พึงประสงค์',
  },
  {
    key: 'lost_and_found',
    apiIssueType: 'lost_and_found',
    label: 'ของที่ลูกค้าลืมไว้ (Lost & Found)',
    subtitle: 'ส่งมอบ Front Counter • นับถอยหลัง 7 วัน',
  },
];

export function formatIssueTypeLabel(issueType?: string): string {
  switch (issueType) {
    case 'damage':
      return 'ชำรุด/แตกหัก';
    case 'malfunction':
      return 'เครื่องใช้ไฟฟ้า';
    case 'missing_item':
      return 'ของหาย/ไม่ครบ';
    case 'cleanliness':
      return 'สุขอนามัย/กลิ่น';
    case 'lost_and_found':
      return 'ของที่ลูกค้าลืมไว้ (Lost & Found)';
    default:
      return issueType || 'แจ้งปัญหา';
  }
}

export interface RoomIssueReportModalProps {
  isOpen: boolean;
  roomId: string;
  roomNumber: string;
  roomTypeName?: string;
  taskId?: string;
  reportedBy?: string;
  defaultLockRoom?: boolean;
  onClose: () => void;
  onSuccess?: (result: { issue: any; lockedRoom: boolean; apiIssueType: string; description: string }) => void;
}

export const RoomIssueReportModal: React.FC<RoomIssueReportModalProps> = ({
  isOpen,
  roomId,
  roomNumber,
  roomTypeName,
  taskId,
  reportedBy,
  defaultLockRoom = true,
  onClose,
  onSuccess,
}) => {
  const [category, setCategory] = useState<IssueCategoryKey>('broken');
  const [description, setDescription] = useState('');
  const [storageLocation, setStorageLocation] = useState('Front Desk Counter');
  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [lockRoom, setLockRoom] = useState<boolean>(defaultLockRoom);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory('broken');
      setDescription('');
      setStorageLocation('Front Desk Counter');
      setRetentionDays(7);
      setLockRoom(defaultLockRoom);
      setPhotoFile(null);
      setPhotoPreview(null);
      setError(null);
    }
  }, [isOpen, roomId, defaultLockRoom]);

  const handleCategoryChange = (nextCat: IssueCategoryKey) => {
    setCategory(nextCat);
    if (nextCat === 'lost_and_found') {
      setLockRoom(false);
    } else {
      setLockRoom(defaultLockRoom);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ (JPEG, PNG, WEBP)');
      return;
    }
    setError(null);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const catConfig = ISSUE_CATEGORY_OPTIONS.find((c) => c.key === category) || ISSUE_CATEGORY_OPTIONS[0];
    const finalDesc =
      description.trim() ||
      (catConfig.apiIssueType === 'lost_and_found'
        ? 'ของที่ลูกค้าลืมไว้ในห้องพัก'
        : `${catConfig.label} — แจ้งตรวจสอบและซ่อมบำรุง`);

    setIsSubmitting(true);
    const token = getAuthToken();

    try {
      let res: Response;

      if (photoFile) {
        const formData = new FormData();
        formData.append('roomId', roomId);
        formData.append('roomNumber', roomNumber);
        formData.append('reportedBy', reportedBy || 'hk-staff-001');
        formData.append('issueType', catConfig.apiIssueType);
        formData.append('severity', lockRoom ? 'high' : 'medium');
        formData.append('description', finalDesc);
        if (taskId) formData.append('taskId', taskId);
        if (catConfig.apiIssueType === 'lost_and_found') {
          formData.append('storageLocation', storageLocation || 'Front Desk Counter');
          formData.append('retentionDays', String(retentionDays || 7));
        }
        formData.append('photo', photoFile);

        res = await fetch(apiUrl('/api/housekeeping/issues'), {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });
      } else {
        const payload: any = {
          roomId,
          roomNumber,
          reportedBy: reportedBy || 'hk-staff-001',
          issueType: catConfig.apiIssueType,
          severity: lockRoom ? 'high' : 'medium',
          description: finalDesc,
        };
        if (taskId) payload.taskId = taskId;
        if (catConfig.apiIssueType === 'lost_and_found') {
          payload.storageLocation = storageLocation || 'Front Desk Counter';
          payload.retentionDays = retentionDays || 7;
        }

        res = await fetch(apiUrl('/api/housekeeping/issues'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.message || json?.error || 'ไม่สามารถบันทึกใบแจ้งปัญหาได้');
        return;
      }

      if (lockRoom) {
        const statusRes = await fetch(apiUrl(`/api/rooms/${roomId}/status`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            status: 'out_of_order',
            changeReason: `${catConfig.label}: ${finalDesc}`,
          }),
        });
        if (!statusRes.ok) {
          const statusErr = await statusRes.json().catch(() => null);
          setError(
            statusErr?.message ||
              'บันทึกใบแจ้งปัญหาสำเร็จ แต่ไม่สามารถเปลี่ยนสถานะห้องเป็นงดใช้งานได้'
          );
          return;
        }
      }

      onSuccess?.({
        issue: json?.data,
        lockedRoom: lockRoom,
        apiIssueType: catConfig.apiIssueType,
        description: finalDesc,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              {category === 'lost_and_found' ? (
                <Briefcase className="w-4.5 h-4.5 text-amber-600" />
              ) : (
                <Wrench className="w-4.5 h-4.5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {category === 'lost_and_found'
                  ? 'บันทึกของที่ลูกค้าลืมไว้ (Lost & Found)'
                  : 'แจ้งปัญหา / ส่งซ่อมบำรุง'}
              </h3>
              <p className="text-xs text-slate-500">
                ห้อง {roomNumber}
                {roomTypeName ? ` • ${roomTypeName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Category Grid */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-800">ประเภทปัญหา</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCategoryChange('broken')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  category === 'broken'
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Wrench className={`w-4 h-4 mb-1 ${category === 'broken' ? 'text-rose-400' : 'text-rose-500'}`} />
                <div className="text-xs font-bold">ชำรุด/แตกหัก</div>
                <div className={`text-[10px] ${category === 'broken' ? 'text-slate-300' : 'text-slate-400'}`}>
                  เฟอร์นิเจอร์, ผนัง, สุขภัณฑ์
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('electric')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  category === 'electric'
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sparkles className={`w-4 h-4 mb-1 ${category === 'electric' ? 'text-sky-400' : 'text-sky-500'}`} />
                <div className="text-xs font-bold">เครื่องใช้ไฟฟ้า</div>
                <div className={`text-[10px] ${category === 'electric' ? 'text-slate-300' : 'text-slate-400'}`}>
                  แอร์, ทีวี, ตู้เย็น, โคมไฟ
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('missing')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  category === 'missing'
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Package className={`w-4 h-4 mb-1 ${category === 'missing' ? 'text-amber-400' : 'text-amber-500'}`} />
                <div className="text-xs font-bold">ของหาย/ไม่ครบ</div>
                <div className={`text-[10px] ${category === 'missing' ? 'text-slate-300' : 'text-slate-400'}`}>
                  รีโมท, แก้ว, ผ้าเช็ดตัว
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('sanitary')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  category === 'sanitary'
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className={`w-4 h-4 mb-1 ${category === 'sanitary' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                <div className="text-xs font-bold">สุขอนามัย/กลิ่น</div>
                <div className={`text-[10px] ${category === 'sanitary' ? 'text-slate-300' : 'text-slate-400'}`}>
                  คราบหนัก, กลิ่นไม่พึงประสงค์
                </div>
              </button>
            </div>

            {/* Lost & Found button */}
            <button
              type="button"
              onClick={() => handleCategoryChange('lost_and_found')}
              className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between mt-1 ${
                category === 'lost_and_found'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className={`w-4 h-4 ${category === 'lost_and_found' ? 'text-white' : 'text-amber-600'}`} />
                <div>
                  <div className="text-xs font-bold">ของที่ลูกค้าลืมไว้ (Lost &amp; Found)</div>
                  <div className={`text-[10px] ${category === 'lost_and_found' ? 'text-amber-100' : 'text-amber-700'}`}>
                    ส่งมอบ Front Counter • นับถอยหลัง {retentionDays} วัน
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  category === 'lost_and_found' ? 'bg-amber-800 text-white' : 'bg-amber-200/80 text-amber-900'
                }`}
              >
                แจ้ง Front &amp; Owner
              </span>
            </button>
          </div>

          {/* Lost & Found Storage Info */}
          {category === 'lost_and_found' && (
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">สถานที่จัดเก็บ</label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-amber-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">ระยะเวลาเก็บ (วัน)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Math.max(1, Number(e.target.value) || 7))}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-amber-200 rounded-lg text-slate-900 font-mono"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-800">
              {category === 'lost_and_found' ? 'รายละเอียดสิ่งของที่พบ' : 'คำอธิบายอาการชำรุด'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                category === 'lost_and_found'
                  ? 'เช่น พบนาฬิกาข้อมือ, สายชาร์จ iPhone สีขาว...'
                  : 'พิมพ์ระบุอาการชำรุด เช่น แอร์มีน้ำหยด, ปลั๊กไฟหลวม, ลูกบิดประตูชำรุด...'
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* Lock Room Toggle */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-rose-200/80 bg-rose-50/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lockRoom}
              onChange={(e) => setLockRoom(e.target.checked)}
              className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
            />
            <div className="flex-1">
              <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>เปลี่ยนสถานะห้องเป็น &ldquo;งดใช้งาน (Out of Order)&rdquo;</span>
              </div>
              <p className="text-[11px] text-rose-700/90 mt-0.5">
                แจ้ง Front Desk และ Owner ทราบ พร้อมปิดรับการจองชั่วคราวจนกว่าช่างซ่อมเสร็จ
              </p>
            </div>
          </label>

          {/* Working Photo Upload */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">แนบรูปถ่ายหลักฐาน</span>
              <span className="text-[10px] text-blue-600 flex items-center gap-1">
                <CloudUpload className="w-3 h-3" /> จัดเก็บภาพถ่ายส่วนกลาง
              </span>
            </div>

            {photoPreview ? (
              <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-center gap-3">
                <img
                  src={photoPreview}
                  alt="Issue evidence preview"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {photoFile?.name || 'รูปหลักฐาน'}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                    พร้อมอัปโหลดขึ้นระบบคลาวด์ R2
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                  title="ลบรูปภาพ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <Camera className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">ถ่ายรูป หรือ แนบไฟล์</p>
                  <p className="text-[10px] text-slate-400">รองรับภาพถ่าย JPEG, PNG บันทึกอัตโนมัติ</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <span>บันทึกลงระบบทันที</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
