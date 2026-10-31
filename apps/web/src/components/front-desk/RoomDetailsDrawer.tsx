import React, { useEffect, useState } from 'react';
import { Room, RoomType } from '@keystay/types';
import { ROOM_STATUS_CONFIG } from './RoomCard';
import { useI18n } from '@/lib/i18n';
import { ExtendedReservation } from '@/hooks/useReservations';
import { ExtendStayModal } from './ExtendStayModal';
import {
  X,
  BedDouble,
  DollarSign,
  LogIn,
  LogOut,
  PlusCircle,
  Sparkles,
  Layers,
  FileText,
  Calendar,
  CalendarPlus,
  Users,
} from 'lucide-react';

export type RoomDrawerAction =
  | 'checkin'
  | 'checkout'
  | 'charge'
  | 'walkin'
  | 'clean'
  | 'extend';

export interface RoomDetailsDrawerProps {
  room: Room | null;
  roomType?: RoomType;
  isOpen: boolean;
  onClose: () => void;
  onAction?:
    | ((action: RoomDrawerAction, room: Room) => void)
    | ((action: 'checkin' | 'checkout' | 'charge' | 'walkin' | 'clean', room: Room) => void);
  currentReservation?: ExtendedReservation | null;
}

export const RoomDetailsDrawer: React.FC<RoomDetailsDrawerProps> = ({
  room,
  roomType,
  isOpen,
  onClose,
  onAction,
  currentReservation,
}) => {
  const { t, formatCurrency } = useI18n();
  const [isExtendOpen, setIsExtendOpen] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !room) return null;

  const statusCfg = ROOM_STATUS_CONFIG[room.status] || {
    label: room.status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  const localizedStatus = t(`status.${room.status}`);
  const formattedPrice = roomType?.basePrice
    ? formatCurrency(roomType.basePrice)
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                {room.roomNumber}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                <span>{localizedStatus}</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Room Basic Specs */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('drawer.roomDetails')}
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">{t('common.roomType')}</span>
                  <span className="font-medium text-slate-900 flex items-center gap-1.5">
                    <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                    {roomType?.name || 'Standard Room'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">
                    {t('common.floor', { floor: '' }).replace('{floor}', '').trim() || 'Floor'}
                  </span>
                  <span className="font-mono font-medium text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    {t('common.floor', { floor: room.floor || '1' })}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">{t('drawer.price')}</span>
                  <span className="font-mono font-semibold text-slate-900 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    {formattedPrice ? `${formattedPrice}${t('common.pricePerNight')}` : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">{t('drawer.capacity')}</span>
                  <span className="font-medium text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {t('drawer.capacityCount', { count: roomType?.capacity || 2 })}
                  </span>
                </div>
              </div>

              {roomType?.description && (
                <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                  {roomType.description}
                </div>
              )}
            </div>

            {/* Amenities if any */}
            {roomType?.amenities && roomType.amenities.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t('drawer.amenities')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {roomType.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            {room.notes && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('drawer.notes')}</span>
                </h3>
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  {room.notes}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Actions Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
            {room.status === 'reserved' && (
              <button
                onClick={() => (onAction as any)?.('checkin', room)}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('ops.checkIn')}</span>
              </button>
            )}

            {room.status === 'occupied' && (
              <>
                <button
                  onClick={() => {
                    (onAction as any)?.('extend', room);
                    setIsExtendOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CalendarPlus className="w-4 h-4 text-slate-600" />
                  <span>{t('extend.button')}</span>
                </button>
                <button
                  onClick={() => (onAction as any)?.('charge', room)}
                  className="w-full py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4 text-slate-600" />
                  <span>{t('folio.addCharge')}</span>
                </button>
                <button
                  onClick={() => (onAction as any)?.('checkout', room)}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('ops.checkOut')}</span>
                </button>
              </>
            )}

            {room.status === 'available' && (
              <>
                <button
                  onClick={() => (onAction as any)?.('walkin', room)}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('ops.walkIn')}</span>
                </button>
                <button
                  onClick={() => (onAction as any)?.('checkin', room)}
                  className="w-full py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span>{t('drawer.newBooking')}</span>
                </button>
              </>
            )}

            {room.status === 'checked_out' && (
              <button
                onClick={() => (onAction as any)?.('clean', room)}
                className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('drawer.requestCleaning')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Extend Stay Modal */}
      {currentReservation && (
        <ExtendStayModal
          reservation={currentReservation}
          room={room}
          roomType={roomType}
          isOpen={isExtendOpen}
          onClose={() => setIsExtendOpen(false)}
        />
      )}
    </div>
  );
};
