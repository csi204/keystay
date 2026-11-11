import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiFetch, getAuthRole } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  BedDouble,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Maximize2,
  X,
  Save,
  AlertTriangle,
  Bath,
  Building2,
  Hash,
  Wrench,
  CircleOff,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  Package,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { SeasonalPricingTab } from './SeasonalPricingTab';
import { AmenitiesCatalogTab } from './AmenitiesCatalogTab';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoomTypeItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  maxOccupancy: number;
  bedType: string;
  sizeSqm: number;
  bathrooms?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FloorItem {
  id: string;
  floorNumber: number;
  name: string;
  totalRooms: number;
}

export type RoomStatus =
  | 'available'
  | 'reserved'
  | 'occupied'
  | 'checked_out'
  | 'cleaning'
  | 'maintenance'
  | 'out_of_order';

export interface RoomUnit {
  id: string;
  roomNumber: string;
  floorId: string;
  roomTypeId: string;
  status: RoomStatus;
  isActive: number;
  floor?: { id: string; floorNumber: number; name: string };
  roomType?: { id: string; name: string; basePrice: number };
}

// ─── Minimal Enterprise Status Dots (Zero Slop) ───────────────────────────────

const STATUS_DOT: Record<RoomStatus, string> = {
  available: 'bg-emerald-500',
  reserved: 'bg-blue-500',
  occupied: 'bg-purple-500',
  checked_out: 'bg-slate-400',
  cleaning: 'bg-amber-500',
  maintenance: 'bg-orange-500',
  out_of_order: 'bg-rose-500',
};

const ALL_STATUSES: RoomStatus[] = [
  'available',
  'reserved',
  'occupied',
  'checked_out',
  'cleaning',
  'maintenance',
  'out_of_order',
];

// State Machine allowed transitions for Owner
const ALLOWED_OWNER_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  available: ['maintenance', 'out_of_order'],
  maintenance: ['available', 'out_of_order'],
  out_of_order: ['maintenance', 'available'],
  cleaning: ['available', 'maintenance'],
  checked_out: [],
  occupied: [],
  reserved: [],
};

// ─── Mock Seed Data ───────────────────────────────────────────────────────────

const MOCK_FLOORS: FloorItem[] = [
  { id: 'f1', floorNumber: 1, name: 'ชั้น 1', totalRooms: 8 },
  { id: 'f2', floorNumber: 2, name: 'ชั้น 2', totalRooms: 8 },
  { id: 'f3', floorNumber: 3, name: 'ชั้น 3', totalRooms: 6 },
];

const MOCK_ROOMS: RoomUnit[] = [
  // Floor 1
  ...['101', '102', '103', '104'].map((n, i) => ({
    id: `room-${n}`,
    roomNumber: n,
    floorId: 'f1',
    roomTypeId: 'rt-std',
    status: (i === 2 ? 'maintenance' : 'available') as RoomStatus,
    isActive: 1,
    floor: { id: 'f1', floorNumber: 1, name: 'ชั้น 1' },
    roomType: { id: 'rt-std', name: 'Standard Room', basePrice: 1200 },
  })),
  ...['105', '106'].map((n) => ({
    id: `room-${n}`,
    roomNumber: n,
    floorId: 'f1',
    roomTypeId: 'rt-dlx',
    status: 'available' as RoomStatus,
    isActive: 1,
    floor: { id: 'f1', floorNumber: 1, name: 'ชั้น 1' },
    roomType: { id: 'rt-dlx', name: 'Deluxe Room', basePrice: 1800 },
  })),
  { id: 'room-107', roomNumber: '107', floorId: 'f1', roomTypeId: 'rt-std', status: 'occupied', isActive: 1, floor: { id: 'f1', floorNumber: 1, name: 'ชั้น 1' }, roomType: { id: 'rt-std', name: 'Standard Room', basePrice: 1200 } },
  { id: 'room-108', roomNumber: '108', floorId: 'f1', roomTypeId: 'rt-std', status: 'out_of_order', isActive: 0, floor: { id: 'f1', floorNumber: 1, name: 'ชั้น 1' }, roomType: { id: 'rt-std', name: 'Standard Room', basePrice: 1200 } },
  // Floor 2
  ...['201', '202', '203', '204', '205', '206'].map((n, i) => ({
    id: `room-${n}`,
    roomNumber: n,
    floorId: 'f2',
    roomTypeId: 'rt-dlx',
    status: (i === 1 ? 'reserved' : i === 4 ? 'cleaning' : 'available') as RoomStatus,
    isActive: 1,
    floor: { id: 'f2', floorNumber: 2, name: 'ชั้น 2' },
    roomType: { id: 'rt-dlx', name: 'Deluxe Room', basePrice: 1800 },
  })),
  { id: 'room-207', roomNumber: '207', floorId: 'f2', roomTypeId: 'rt-dlx', status: 'occupied', isActive: 1, floor: { id: 'f2', floorNumber: 2, name: 'ชั้น 2' }, roomType: { id: 'rt-dlx', name: 'Deluxe Room', basePrice: 1800 } },
  { id: 'room-208', roomNumber: '208', floorId: 'f2', roomTypeId: 'rt-std', status: 'available', isActive: 1, floor: { id: 'f2', floorNumber: 2, name: 'ชั้น 2' }, roomType: { id: 'rt-std', name: 'Standard Room', basePrice: 1200 } },
  // Floor 3
  ...['301', '302', '303', '304', '305', '306'].map((n, i) => ({
    id: `room-${n}`,
    roomNumber: n,
    floorId: 'f3',
    roomTypeId: 'rt-ste',
    status: (i === 0 ? 'occupied' : i === 3 ? 'maintenance' : 'available') as RoomStatus,
    isActive: 1,
    floor: { id: 'f3', floorNumber: 3, name: 'ชั้น 3' },
    roomType: { id: 'rt-ste', name: 'Executive Suite', basePrice: 2800 },
  })),
];

// ─── Component ────────────────────────────────────────────────────────────────

export const RoomsPricingPage: React.FC = () => {
  const isOwner = getAuthRole() === 'owner';
  const { t } = useTranslation();

  // Tab
  const [activeTab, setActiveTab] = useState<'types' | 'units' | 'pricing_rules' | 'amenities'>('types');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);

  // ══════════════════════════════════════════════
  //  TAB 1 — Room Types
  // ══════════════════════════════════════════════

  const [roomTypes, setRoomTypes] = useState<RoomTypeItem[]>([
    { id: 'rt-std', name: 'Standard Room', description: 'ห้องพักมาตรฐานพร้อมสิ่งอำนวยความสะดวกครบครัน เตียงคิงไซส์', basePrice: 1200, maxOccupancy: 2, bedType: 'King Bed', sizeSqm: 28, bathrooms: 1 },
    { id: 'rt-dlx', name: 'Deluxe Room', description: 'ห้องพักดีลักซ์ระเบียงกว้าง วิวเมือง พร้อมสมาร์ททีวี', basePrice: 1800, maxOccupancy: 2, bedType: 'King Bed / Twin', sizeSqm: 36, bathrooms: 1 },
    { id: 'rt-ste', name: 'Executive Suite', description: 'ห้องสวีทสำหรับครอบครัวหรือผู้บริหาร ห้องนั่งเล่นแยกเป็นสัดส่วน', basePrice: 2800, maxOccupancy: 4, bedType: 'King Bed', sizeSqm: 54, bathrooms: 2 },
  ]);

  // Filters for Room Types
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bedTypeFilter, setBedTypeFilter] = useState<string>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<string>('all');

  // Modals for Room Types
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', basePrice: '', maxOccupancy: '2', bedType: 'King Bed', sizeSqm: '28', bathrooms: '1' });
  const [typeValidationError, setTypeValidationError] = useState<string>('');

  const [editingType, setEditingType] = useState<RoomTypeItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', basePrice: '', maxOccupancy: '2', bedType: 'King Bed', sizeSqm: '28', bathrooms: '1' });

  const [deletingType, setDeletingType] = useState<RoomTypeItem | null>(null);

  const loadRoomTypes = async () => {
    const res = await apiFetch<RoomTypeItem[]>('/api/room-types');
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      setIsOffline(false);
      setRoomTypes(res.data);
    } else {
      setIsOffline(res.isOffline);
    }
  };

  useEffect(() => { loadRoomTypes(); }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeValidationError('');

    const price = parseFloat(createForm.basePrice);
    const occ = parseInt(createForm.maxOccupancy, 10);
    const size = parseFloat(createForm.sizeSqm);
    const baths = parseInt(createForm.bathrooms, 10);

    if (!createForm.name.trim()) {
      setTypeValidationError(t('val.required'));
      return;
    }
    if (isNaN(price) || price <= 0 || isNaN(occ) || occ <= 0 || isNaN(size) || size <= 0 || isNaN(baths) || baths <= 0) {
      setTypeValidationError(t('val.positiveNumber'));
      return;
    }

    const payload = {
      name: createForm.name.trim(),
      description: createForm.description.trim() || null,
      basePrice: price,
      maxOccupancy: occ,
      bedType: createForm.bedType,
      sizeSqm: size,
      bathrooms: baths,
    };
    const res = await apiFetch('/api/room-types', { method: 'POST', body: JSON.stringify(payload) });
    if (res.data) {
      setRoomTypes((prev) => [...prev, res.data]);
    } else {
      setRoomTypes((prev) => [...prev, { id: `rt-${Date.now()}`, ...payload }]);
    }
    setIsCreateOpen(false);
    setCreateForm({ name: '', description: '', basePrice: '', maxOccupancy: '2', bedType: 'King Bed', sizeSqm: '28', bathrooms: '1' });
  };

  const openEditModal = (item: RoomTypeItem) => {
    setTypeValidationError('');
    setEditingType(item);
    setEditForm({
      name: item.name,
      description: item.description || '',
      basePrice: item.basePrice.toString(),
      maxOccupancy: item.maxOccupancy.toString(),
      bedType: item.bedType,
      sizeSqm: item.sizeSqm.toString(),
      bathrooms: (item.bathrooms || 1).toString(),
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTypeValidationError('');
    if (!editingType) return;

    const price = parseFloat(editForm.basePrice);
    const occ = parseInt(editForm.maxOccupancy, 10);
    const size = parseFloat(editForm.sizeSqm);
    const baths = parseInt(editForm.bathrooms, 10);

    if (!editForm.name.trim()) {
      setTypeValidationError(t('val.required'));
      return;
    }
    if (isNaN(price) || price <= 0 || isNaN(occ) || occ <= 0 || isNaN(size) || size <= 0 || isNaN(baths) || baths <= 0) {
      setTypeValidationError(t('val.positiveNumber'));
      return;
    }

    const payload = {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      basePrice: price,
      maxOccupancy: occ,
      bedType: editForm.bedType,
      sizeSqm: size,
      bathrooms: baths,
    };
    await apiFetch(`/api/room-types/${editingType.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    setRoomTypes((prev) => prev.map((tItem) => (tItem.id === editingType.id ? { ...tItem, ...payload } : tItem)));
    setEditingType(null);
  };

  const handleDeleteTypeConfirm = async () => {
    if (!deletingType) return;
    await apiFetch(`/api/room-types/${deletingType.id}`, { method: 'DELETE' });
    setRoomTypes((prev) => prev.filter((tItem) => tItem.id !== deletingType.id));
    setDeletingType(null);
  };

  const filteredTypes = roomTypes.filter((tItem) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      tItem.name.toLowerCase().includes(q) ||
      (tItem.description && tItem.description.toLowerCase().includes(q)) ||
      tItem.bedType.toLowerCase().includes(q);
    const matchBed = bedTypeFilter === 'all' || tItem.bedType === bedTypeFilter;
    const matchOcc = occupancyFilter === 'all' || tItem.maxOccupancy.toString() === occupancyFilter;
    return matchSearch && matchBed && matchOcc;
  });

  // Pagination for Room Types (Max 9 cards per page)
  const TYPE_ITEMS_PER_PAGE = 9;
  const [typePage, setTypePage] = useState<number>(1);

  useEffect(() => {
    setTypePage(1);
  }, [searchQuery, bedTypeFilter, occupancyFilter]);

  const totalTypePages = Math.ceil(filteredTypes.length / TYPE_ITEMS_PER_PAGE) || 1;
  const paginatedTypes = filteredTypes.slice(
    (typePage - 1) * TYPE_ITEMS_PER_PAGE,
    typePage * TYPE_ITEMS_PER_PAGE
  );

  // ══════════════════════════════════════════════
  //  TAB 2 — Room Units
  // ══════════════════════════════════════════════

  const [unitsLoading, setUnitsLoading] = useState<boolean>(false);
  const [rooms, setRooms] = useState<RoomUnit[]>(MOCK_ROOMS);
  const [floors, setFloors] = useState<FloorItem[]>(MOCK_FLOORS);

  // Filters for Room Units
  const [unitSearch, setUnitSearch] = useState<string>('');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals for Room Units
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState<boolean>(false);
  const [createRoomForm, setCreateRoomForm] = useState({ roomNumber: '', floorId: '', roomTypeId: '' });
  const [roomValidationError, setRoomValidationError] = useState<string>('');

  // Edit Room Modal (API #16)
  const [editingRoom, setEditingRoom] = useState<RoomUnit | null>(null);
  const [editRoomForm, setEditRoomForm] = useState({ roomNumber: '', floorId: '', roomTypeId: '' });

  // Status Change Modal (API #19)
  const [statusRoom, setStatusRoom] = useState<RoomUnit | null>(null);
  const [newStatus, setNewStatus] = useState<RoomStatus>('available');

  // Delete Room Modal
  const [deletingRoom, setDeletingRoom] = useState<RoomUnit | null>(null);

  const loadRooms = async () => {
    setUnitsLoading(true);
    const [roomsRes, floorsRes, typesRes] = await Promise.all([
      apiFetch<RoomUnit[]>('/api/rooms'),
      apiFetch<FloorItem[]>('/api/floors'),
      roomTypes.length > 0 ? Promise.resolve({ data: roomTypes, isOffline: false }) : apiFetch<RoomTypeItem[]>('/api/room-types'),
    ]);

    const currentTypes = (typesRes.data && typesRes.data.length > 0) ? typesRes.data : roomTypes;
    const typeMap = new Map<string, RoomTypeItem>();
    currentTypes.forEach((t) => typeMap.set(t.id, t));

    const currentFloors = (floorsRes.data && Array.isArray(floorsRes.data) && floorsRes.data.length > 0) ? floorsRes.data : floors;
    const floorMap = new Map<string, FloorItem>();
    currentFloors.forEach((f) => floorMap.set(f.id, f));

    if (roomsRes.data && Array.isArray(roomsRes.data) && roomsRes.data.length > 0) {
      const enriched = roomsRes.data.map((r) => {
        const rt = r.roomType || typeMap.get(r.roomTypeId);
        const fl = r.floor || floorMap.get(r.floorId);
        return {
          ...r,
          roomType: rt ? { id: rt.id, name: rt.name, basePrice: rt.basePrice } : undefined,
          floor: fl ? { id: fl.id, floorNumber: fl.floorNumber, name: fl.name } : undefined,
        };
      });
      setRooms(enriched);
      setIsOffline(false);
    } else {
      setIsOffline(roomsRes.isOffline);
    }
    if (floorsRes.data && Array.isArray(floorsRes.data) && floorsRes.data.length > 0) {
      setFloors(floorsRes.data);
    }
    setUnitsLoading(false);
  };

  const handleRefresh = async () => {
    if (isOffline) return;
    setRefreshing(true);
    await Promise.all([loadRoomTypes(), loadRooms()]);
    setRefreshing(false);
    setRefreshSuccess(true);
    setTimeout(() => setRefreshSuccess(false), 2500);
  };

  const [unitsFetched, setUnitsFetched] = useState(false);
  useEffect(() => {
    if (activeTab === 'units' && !unitsFetched) {
      setUnitsFetched(true);
      loadRooms();
    }
  }, [activeTab]);

  // Create Room
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomValidationError('');

    const cleanNum = createRoomForm.roomNumber.trim();
    if (!cleanNum || !createRoomForm.floorId || !createRoomForm.roomTypeId) {
      setRoomValidationError(t('val.required'));
      return;
    }

    // Client-side collision check
    if (rooms.some((r) => r.roomNumber.toLowerCase() === cleanNum.toLowerCase())) {
      setRoomValidationError(t('val.roomConflict'));
      return;
    }

    const payload = {
      roomNumber: cleanNum,
      floorId: createRoomForm.floorId,
      roomTypeId: createRoomForm.roomTypeId,
    };
    const res = await apiFetch('/api/rooms', { method: 'POST', body: JSON.stringify(payload) });
    const floor = floors.find((f) => f.id === payload.floorId);
    const roomType = roomTypes.find((rt) => rt.id === payload.roomTypeId);
    const newRoom: RoomUnit = {
      ...(res.data ?? {
        id: `room-${Date.now()}`,
        ...payload,
        status: 'available',
        isActive: 1,
      }),
      floor: floor ? { id: floor.id, floorNumber: floor.floorNumber, name: floor.name } : (res.data?.floor ?? undefined),
      roomType: roomType ? { id: roomType.id, name: roomType.name, basePrice: roomType.basePrice } : (res.data?.roomType ?? undefined),
    };
    setRooms((prev) => [...prev, newRoom]);
    setIsCreateRoomOpen(false);
    setCreateRoomForm({ roomNumber: '', floorId: '', roomTypeId: '' });
  };

  // Open Edit Room Modal (API #16)
  const openEditRoomModal = (room: RoomUnit) => {
    setRoomValidationError('');
    setEditingRoom(room);
    setEditRoomForm({
      roomNumber: room.roomNumber,
      floorId: room.floorId,
      roomTypeId: room.roomTypeId,
    });
  };

  // Submit Edit Room (API #16)
  const handleEditRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomValidationError('');
    if (!editingRoom) return;

    const cleanNum = editRoomForm.roomNumber.trim();
    if (!cleanNum || !editRoomForm.floorId || !editRoomForm.roomTypeId) {
      setRoomValidationError(t('val.required'));
      return;
    }

    // Conflict check if room number changed
    if (
      cleanNum.toLowerCase() !== editingRoom.roomNumber.toLowerCase() &&
      rooms.some((r) => r.id !== editingRoom.id && r.roomNumber.toLowerCase() === cleanNum.toLowerCase())
    ) {
      setRoomValidationError(t('val.roomConflict'));
      return;
    }

    const payload = {
      roomNumber: cleanNum,
      floorId: editRoomForm.floorId,
      roomTypeId: editRoomForm.roomTypeId,
    };

    await apiFetch(`/api/rooms/${editingRoom.id}`, { method: 'PUT', body: JSON.stringify(payload) });

    const floor = floors.find((f) => f.id === payload.floorId);
    const roomType = roomTypes.find((rt) => rt.id === payload.roomTypeId);

    setRooms((prev) =>
      prev.map((r) =>
        r.id === editingRoom.id
          ? {
              ...r,
              ...payload,
              floor: floor ? { id: floor.id, floorNumber: floor.floorNumber, name: floor.name } : r.floor,
              roomType: roomType ? { id: roomType.id, name: roomType.name, basePrice: roomType.basePrice } : r.roomType,
            }
          : r
      )
    );
    setEditingRoom(null);
  };

  // Open Status Change Modal with State Machine Protection
  const openStatusModal = (room: RoomUnit) => {
    if (room.status === 'occupied' || room.status === 'reserved') return;
    setStatusRoom(room);
    const allowed = ALLOWED_OWNER_TRANSITIONS[room.status];
    setNewStatus(allowed.length > 0 ? allowed[0] : room.status);
  };

  // Submit Status Change (API #19)
  const handleStatusChange = async () => {
    if (!statusRoom) return;
    await apiFetch(`/api/rooms/${statusRoom.id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    setRooms((prev) => prev.map((r) => (r.id === statusRoom.id ? { ...r, status: newStatus } : r)));
    setStatusRoom(null);
  };

  // Delete Room (Soft delete)
  const handleDeleteRoomConfirm = async () => {
    if (!deletingRoom) return;
    await apiFetch(`/api/rooms/${deletingRoom.id}`, { method: 'DELETE' });
    setRooms((prev) => prev.map((r) => (r.id === deletingRoom.id ? { ...r, isActive: 0, status: 'out_of_order' } : r)));
    setDeletingRoom(null);
  };

  const filteredRooms = rooms.filter((r) => {
    const q = unitSearch.toLowerCase();
    const matchSearch =
      r.roomNumber.toLowerCase().includes(q) ||
      (r.roomType?.name.toLowerCase().includes(q) ?? false) ||
      (r.floor?.name.toLowerCase().includes(q) ?? false);
    const matchFloor = floorFilter === 'all' || r.floorId === floorFilter;
    const matchType = typeFilter === 'all' || r.roomTypeId === typeFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchFloor && matchType && matchStatus;
  });

  const roomsByFloor = floors
    .map((floor) => ({
      floor,
      rooms: filteredRooms.filter((r) => r.floorId === floor.id),
    }))
    .filter((g) => g.rooms.length > 0);

  // ══════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════

  return (
    <AdminLayout activePath="/admin/rooms" isBackendOffline={isOffline}>
      {/* ── Page Header ── */}
      <div className="bg-white px-4 py-3.5 mb-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{t('nav.home')}</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">{t('nav.roomsPricing')}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {activeTab === 'types'
                ? t('header.roomTypes.title')
                : activeTab === 'units'
                ? t('header.roomUnits.title')
                : activeTab === 'pricing_rules'
                ? t('header.pricingRules.title')
                : t('header.amenities.title')}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'types'
                ? t('header.roomTypes.desc')
                : activeTab === 'units'
                ? t('header.roomUnits.desc')
                : activeTab === 'pricing_rules'
                ? t('header.pricingRules.desc')
                : t('header.amenities.desc')}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={isOffline || refreshing}
              onClick={handleRefresh}
              className="text-xs font-semibold gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#F97316]' : 'text-slate-600'}`} />
              <span>{refreshSuccess ? t('action.refreshSuccess') : t('action.refresh')}</span>
            </Button>

            {isOwner && (activeTab === 'types' || activeTab === 'units') && (
              <Button
                size="sm"
                disabled={isOffline}
                onClick={() => activeTab === 'types' ? setIsCreateOpen(true) : setIsCreateRoomOpen(true)}
                className="text-xs font-semibold gap-1.5 h-9 bg-[#F97316] hover:bg-[#ea580c] text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{activeTab === 'types' ? t('action.addRoomType') : t('action.addRoomUnit')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mt-4  -mb-3.5 overflow-x-auto">
          {(
            [
              { key: 'types', label: t('tab.roomTypes'), icon: <BedDouble className="w-3.5 h-3.5" /> },
              { key: 'units', label: t('tab.roomUnits'), icon: <Building2 className="w-3.5 h-3.5" /> },
              { key: 'pricing_rules', label: t('tab.pricingRules'), icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { key: 'amenities', label: t('tab.amenities'), icon: <Package className="w-3.5 h-3.5" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-[#F97316] text-[#F97316]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1 — ROOM TYPES
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'types' && (
        <div className="px-4 pb-6 space-y-4">
          {/* Clean Toolbar with Consistent Height (h-9) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('filter.searchRoomType')}
                  className="pl-9 h-9 text-xs border-slate-200"
                />
              </div>

              <div className="w-44">
                <Select value={bedTypeFilter} onChange={(e) => setBedTypeFilter(e.target.value)} className="text-xs h-9">
                  <option value="all">{t('filter.allBedTypes')}</option>
                  <option value="King Bed">King Bed</option>
                  <option value="Queen Bed">Queen Bed</option>
                  <option value="Twin Bed">Twin Bed</option>
                  <option value="King Bed / Twin">King Bed / Twin</option>
                </Select>
              </div>

              <div className="w-40">
                <Select value={occupancyFilter} onChange={(e) => setOccupancyFilter(e.target.value)} className="text-xs h-9">
                  <option value="all">{t('filter.allOccupancies')}</option>
                  <option value="2">2 {t('unit.persons')}</option>
                  <option value="4">4 {t('unit.persons')}</option>
                </Select>
              </div>

              {(searchQuery || bedTypeFilter !== 'all' || occupancyFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setBedTypeFilter('all');
                    setOccupancyFilter('all');
                  }}
                  className="h-9 text-xs text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {t('filter.clearFilters')}
                </Button>
              )}
            </div>

            <div className="text-xs text-slate-500 shrink-0 font-medium">
              {t('filter.showingTypes', { count: filteredTypes.length, total: roomTypes.length })}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paginatedTypes.map((tItem) => (
              <Card key={tItem.id} className="border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-[#F97316]" />
                    <span className="text-xs font-bold text-slate-900">{tItem.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#F97316] font-mono">
                    ฿{tItem.basePrice.toLocaleString()}
                    <span className="text-[10px] text-slate-400 font-normal"> {t('unit.perNight')}</span>
                  </span>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs text-slate-500 min-h-[32px] line-clamp-2">
                    {tItem.description || '—'}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tItem.maxOccupancy} {t('unit.persons')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tItem.sizeSqm} {t('unit.sqm')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tItem.bathrooms || 1} {t('unit.rooms')}</span>
                    </div>
                    <div className="truncate text-right text-slate-500 font-medium" title={tItem.bedType}>
                      {tItem.bedType}
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button variant="outline" size="sm" disabled={isOffline} onClick={() => openEditModal(tItem)} className="h-7 text-xs px-2.5 border-slate-300 text-slate-700 gap-1">
                        <Pencil className="w-3 h-3 text-slate-500" />
                        <span>{t('action.edit')}</span>
                      </Button>
                      <Button variant="outline" size="sm" disabled={isOffline} onClick={() => setDeletingType(tItem)} className="h-7 text-xs px-2 border-red-200 text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls for Room Types (When cards > 9) */}
          {filteredTypes.length > TYPE_ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs mt-4">
              <div className="text-xs text-slate-500 font-medium">
                แสดง <span className="font-semibold text-slate-800">{(typePage - 1) * TYPE_ITEMS_PER_PAGE + 1}</span> -{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(typePage * TYPE_ITEMS_PER_PAGE, filteredTypes.length)}
                </span>{' '}
                จากทั้งหมด <span className="font-semibold text-slate-800">{filteredTypes.length}</span> ประเภทห้องพัก (9 การ์ดต่อหน้า)
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={typePage === 1}
                  onClick={() => setTypePage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  ก่อนหน้า
                </Button>

                {Array.from({ length: totalTypePages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setTypePage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                      typePage === pageNum
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={typePage === totalTypePages}
                  onClick={() => setTypePage((p) => Math.min(totalTypePages, p + 1))}
                  className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  ถัดไป
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2 — ROOM UNITS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'units' && (
        <div className="px-4 pb-6 space-y-4">
          {/* Clean Professional Toolbar with Matching Height (h-9) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[180px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder={t('filter.searchRoomUnit')}
                  className="pl-9 h-9 text-xs border-slate-200"
                />
              </div>

              <div className="w-36">
                <Select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} className="text-xs h-9">
                  <option value="all">{t('filter.allFloors')}</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Select>
              </div>

              <div className="w-44">
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs h-9">
                  <option value="all">{t('filter.allRoomTypes')}</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                  ))}
                </Select>
              </div>

              <div className="w-40">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs h-9">
                  <option value="all">{t('filter.allStatuses')}</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                  ))}
                </Select>
              </div>

              {(unitSearch || floorFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUnitSearch('');
                    setFloorFilter('all');
                    setTypeFilter('all');
                    setStatusFilter('all');
                  }}
                  className="h-9 text-xs text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {t('filter.clearFilters')}
                </Button>
              )}
            </div>

            <div className="text-xs text-slate-500 shrink-0 font-medium">
              {t('filter.showingUnits', { count: filteredRooms.length, total: rooms.length })}
            </div>
          </div>

          {unitsLoading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading...</div>
          ) : roomsByFloor.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">ไม่พบห้องพักที่ตรงกับเงื่อนไข</div>
          ) : (
            roomsByFloor.map(({ floor, rooms: floorRooms }) => (
              <Card key={floor.id} className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="py-2.5 px-5 border-b border-slate-100 flex flex-row items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <CardTitle className="text-sm font-bold text-slate-800">
                    {floor.name}
                  </CardTitle>
                  <span className="text-[11px] text-slate-400 font-normal">
                    — {floorRooms.length} {t('unit.rooms')}
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4 w-28">{t('field.roomNumber')}</th>
                          <th className="py-2.5 px-3">{t('field.roomType')}</th>
                          <th className="py-2.5 px-3 text-right">{t('field.basePrice')}</th>
                          <th className="py-2.5 px-3 text-center">{t('field.status')}</th>
                          <th className="py-2.5 px-3 text-center">{t('field.isActive')}</th>
                          {isOwner && <th className="py-2.5 px-4 text-center">{t('field.actions')}</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {floorRooms.map((room) => {
                          const isOccupiedOrReserved = room.status === 'occupied' || room.status === 'reserved';
                          return (
                            <tr key={room.id} className={`hover:bg-slate-50/80 transition-colors ${room.isActive === 0 ? 'opacity-50' : ''}`}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 font-mono">
                                  <Hash className="w-3 h-3 text-slate-400" />
                                  {room.roomNumber}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-slate-700">{room.roomType?.name ?? '—'}</td>
                              <td className="py-3 px-3 text-right font-mono text-slate-600">
                                {room.roomType ? `฿${room.roomType.basePrice.toLocaleString()}` : '—'}
                              </td>
                              {/* Minimal Enterprise Status Dot (Zero AI Slop) */}
                              <td className="py-3 px-3 text-center">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[room.status]}`} />
                                  <span>{t(`status.${room.status}`)}</span>
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {room.isActive === 1
                                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                  : <CircleOff className="w-4 h-4 text-rose-400 mx-auto" />
                                }
                              </td>
                              {isOwner && (
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* 1. Edit Room Unit Button (API #16) */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isOffline}
                                      onClick={() => openEditRoomModal(room)}
                                      className="h-7 text-xs px-2 border-slate-300 text-slate-700 hover:bg-slate-50 gap-1 font-medium"
                                      title={t('action.editRoom')}
                                    >
                                      <Pencil className="w-3 h-3 text-slate-500" />
                                      <span>{t('action.edit')}</span>
                                    </Button>

                                    {/* 2. Change Status Button (API #19 - State Machine protected) */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isOffline || isOccupiedOrReserved}
                                      onClick={() => openStatusModal(room)}
                                      title={
                                        room.status === 'occupied'
                                          ? t('modal.occupiedWarning')
                                          : room.status === 'reserved'
                                          ? t('modal.reservedWarning')
                                          : t('action.changeStatus')
                                      }
                                      className="h-7 text-xs px-2 border-slate-300 text-slate-700 gap-1 font-medium disabled:opacity-40"
                                    >
                                      <Wrench className="w-3 h-3 text-slate-500" />
                                      <span>{t('action.changeStatus')}</span>
                                    </Button>

                                    {/* 3. Deactivate / Soft Delete */}
                                    {room.isActive !== 0 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isOffline || isOccupiedOrReserved}
                                        onClick={() => setDeletingRoom(room)}
                                        title={
                                          room.status === 'occupied'
                                            ? t('modal.occupiedWarning')
                                            : room.status === 'reserved'
                                            ? t('modal.reservedWarning')
                                            : t('action.closeRoom')
                                        }
                                        className="h-7 text-xs px-2 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-30"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3 — SEASONAL PRICING RULES (SPEC MODULE 1)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'pricing_rules' && (
        <div className="px-4 pb-6">
          <SeasonalPricingTab
            isOwner={isOwner}
            roomTypes={roomTypes}
            isOffline={isOffline}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4 — AMENITIES CATALOG (SPEC MODULE 3)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'amenities' && (
        <div className="px-4 pb-6">
          <AmenitiesCatalogTab
            isOwner={isOwner}
            isOffline={isOffline}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALS — Room Types
      ══════════════════════════════════════════════════════════════ */}

      {/* Modal: Create Room Type */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">{t('modal.createType.title')}</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            {typeValidationError && (
              <div className="mt-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{typeValidationError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.roomTypeName')} *</label>
                <Input required placeholder="เช่น Premier Deluxe Room" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="text-xs h-9" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.description')}</label>
                <Input placeholder="ระบุจุดเด่นและสิ่งอำนวยความสะดวก" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="text-xs h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.basePrice')} (THB) *</label>
                  <Input required type="number" placeholder="1500" value={createForm.basePrice} onChange={(e) => setCreateForm({ ...createForm, basePrice: e.target.value })} className="text-xs font-mono h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.maxOccupancy')} ({t('unit.persons')}) *</label>
                  <Input required type="number" min="1" max="10" value={createForm.maxOccupancy} onChange={(e) => setCreateForm({ ...createForm, maxOccupancy: e.target.value })} className="text-xs font-mono h-9" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.bedType')} *</label>
                  <Select value={createForm.bedType} onChange={(e) => setCreateForm({ ...createForm, bedType: e.target.value })} className="text-xs h-9">
                    <option value="King Bed">King Bed</option>
                    <option value="Queen Bed">Queen Bed</option>
                    <option value="Twin Bed">Twin Bed</option>
                    <option value="King Bed / Twin">King Bed / Twin</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.sizeSqm')} *</label>
                  <Input required type="number" value={createForm.sizeSqm} onChange={(e) => setCreateForm({ ...createForm, sizeSqm: e.target.value })} className="text-xs font-mono h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.bathrooms')} *</label>
                  <Input required type="number" min="1" max="10" value={createForm.bathrooms} onChange={(e) => setCreateForm({ ...createForm, bathrooms: e.target.value })} className="text-xs font-mono h-9" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="text-xs">{t('action.cancel')}</Button>
                <Button type="submit" size="sm" className="text-xs bg-[#F97316] hover:bg-[#ea580c] text-white gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('action.save')}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Room Type */}
      {editingType && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">{t('modal.editType.title')}</h3>
              </div>
              <button onClick={() => setEditingType(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            {typeValidationError && (
              <div className="mt-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{typeValidationError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.roomTypeName')} *</label>
                <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="text-xs h-9" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.description')}</label>
                <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="text-xs h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.basePrice')} (THB) *</label>
                  <Input required type="number" value={editForm.basePrice} onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })} className="text-xs font-mono h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.maxOccupancy')} ({t('unit.persons')}) *</label>
                  <Input required type="number" min="1" max="10" value={editForm.maxOccupancy} onChange={(e) => setEditForm({ ...editForm, maxOccupancy: e.target.value })} className="text-xs font-mono h-9" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.bedType')} *</label>
                  <Select value={editForm.bedType} onChange={(e) => setEditForm({ ...editForm, bedType: e.target.value })} className="text-xs h-9">
                    <option value="King Bed">King Bed</option>
                    <option value="Queen Bed">Queen Bed</option>
                    <option value="Twin Bed">Twin Bed</option>
                    <option value="King Bed / Twin">King Bed / Twin</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.sizeSqm')} *</label>
                  <Input required type="number" value={editForm.sizeSqm} onChange={(e) => setEditForm({ ...editForm, sizeSqm: e.target.value })} className="text-xs font-mono h-9" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.bathrooms')} *</label>
                  <Input required type="number" min="1" max="10" value={editForm.bathrooms} onChange={(e) => setEditForm({ ...editForm, bathrooms: e.target.value })} className="text-xs font-mono h-9" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingType(null)} className="text-xs">{t('action.cancel')}</Button>
                <Button type="submit" size="sm" className="text-xs bg-[#F97316] hover:bg-[#ea580c] text-white gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('action.saveChanges')}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Room Type */}
      {deletingType && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{t('modal.deleteType.title')}</h3>
                <p className="text-xs text-slate-500 font-mono">{deletingType.name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed py-2">
              {t('modal.deleteType.confirm', { name: deletingType.name })}
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDeletingType(null)} className="text-xs">{t('action.cancel')}</Button>
              <Button size="sm" onClick={handleDeleteTypeConfirm} className="text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('action.confirmDelete')}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALS — Room Units
      ══════════════════════════════════════════════════════════════ */}

      {/* Modal 1: Create Room */}
      {isCreateRoomOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">{t('modal.createRoom.title')}</h3>
              </div>
              <button onClick={() => setIsCreateRoomOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            {roomValidationError && (
              <div className="mt-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{roomValidationError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoomSubmit} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.roomNumber')} *</label>
                <Input required placeholder="เช่น 205, 301A" value={createRoomForm.roomNumber} onChange={(e) => setCreateRoomForm({ ...createRoomForm, roomNumber: e.target.value })} className="text-xs font-mono h-9" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.floor')} *</label>
                <Select value={createRoomForm.floorId} onChange={(e) => setCreateRoomForm({ ...createRoomForm, floorId: e.target.value })} className="text-xs h-9">
                  <option value="">{t('modal.selectFloorPlaceholder')}</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.roomType')} *</label>
                <Select value={createRoomForm.roomTypeId} onChange={(e) => setCreateRoomForm({ ...createRoomForm, roomTypeId: e.target.value })} className="text-xs h-9">
                  <option value="">{t('modal.selectTypePlaceholder')}</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{`${rt.name} · ฿${rt.basePrice.toLocaleString()}`}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateRoomOpen(false)} className="text-xs">{t('action.cancel')}</Button>
                <Button type="submit" size="sm" className="text-xs bg-[#F97316] hover:bg-[#ea580c] text-white gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('action.addRoomUnit')}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Room Unit Details (API #16: PUT /rooms/:id) */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">{t('modal.editRoom.title', { roomNumber: editingRoom.roomNumber })}</h3>
              </div>
              <button onClick={() => setEditingRoom(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            {roomValidationError && (
              <div className="mt-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{roomValidationError}</span>
              </div>
            )}

            <form onSubmit={handleEditRoomSubmit} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.roomNumber')} *</label>
                <Input required value={editRoomForm.roomNumber} onChange={(e) => setEditRoomForm({ ...editRoomForm, roomNumber: e.target.value })} className="text-xs font-mono h-9" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.floor')} *</label>
                <Select value={editRoomForm.floorId} onChange={(e) => setEditRoomForm({ ...editRoomForm, floorId: e.target.value })} className="text-xs h-9">
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('field.roomType')} *</label>
                <Select value={editRoomForm.roomTypeId} onChange={(e) => setEditRoomForm({ ...editRoomForm, roomTypeId: e.target.value })} className="text-xs h-9">
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{`${rt.name} · ฿${rt.basePrice.toLocaleString()}`}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingRoom(null)} className="text-xs">{t('action.cancel')}</Button>
                <Button type="submit" size="sm" className="text-xs bg-[#F97316] hover:bg-[#ea580c] text-white gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('action.saveChanges')}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Change Room Status (API #19: PUT /rooms/:id/status - State Machine Protected) */}
      {statusRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-slate-900">
                  {t('modal.changeStatus.title', { roomNumber: statusRoom.roomNumber })}
                </h3>
              </div>
              <button onClick={() => setStatusRoom(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-500">
                {t('modal.changeStatus.current')}{' '}
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 ml-1">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[statusRoom.status]}`} />
                  {t(`status.${statusRoom.status}`)}
                </span>
              </p>

              {ALLOWED_OWNER_TRANSITIONS[statusRoom.status].length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
                  {t('modal.occupiedWarning')}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">{t('modal.changeStatus.changeTo')} *</label>
                  {ALLOWED_OWNER_TRANSITIONS[statusRoom.status].map((s) => (
                    <label key={s} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${newStatus === s ? 'border-[#F97316] bg-orange-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="newStatus" value={s} checked={newStatus === s} onChange={() => setNewStatus(s)} className="accent-[#F97316]" />
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                        {t(`status.${s}`)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setStatusRoom(null)} className="text-xs">{t('action.cancel')}</Button>
              <Button
                size="sm"
                onClick={handleStatusChange}
                disabled={newStatus === statusRoom.status || ALLOWED_OWNER_TRANSITIONS[statusRoom.status].length === 0}
                className="text-xs bg-[#F97316] hover:bg-[#ea580c] text-white gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('action.save')}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Delete (soft) Room */}
      {deletingRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{t('modal.deleteRoom.title')}</h3>
                <p className="text-xs text-slate-500 font-mono">ห้อง #{deletingRoom.roomNumber}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed py-2">
              {t('modal.deleteRoom.confirm', { roomNumber: deletingRoom.roomNumber })}
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDeletingRoom(null)} className="text-xs">{t('action.cancel')}</Button>
              <Button size="sm" onClick={handleDeleteRoomConfirm} className="text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5">
                <CircleOff className="w-3.5 h-3.5" />
                <span>{t('action.confirmClose')}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RoomsPricingPage;
