import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { Room, RoomType } from '@keystay/types';

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const hasLoadedOnceRef = useRef<boolean>(false);

  const fetchRooms = useCallback(async (options?: boolean | { forceLoading?: boolean }) => {
    const forceLoading =
      options === true || (typeof options === 'object' && options !== null && options.forceLoading === true);
    if (!hasLoadedOnceRef.current || forceLoading) {
      setLoading(true);
    }
    setError(null);

    const [roomsRes, typesRes] = await Promise.all([
      apiFetch<Room[]>('/api/rooms'),
      apiFetch<RoomType[]>('/api/room-types'),
    ]);

    if (roomsRes.isOffline || typesRes.isOffline) {
      setIsOffline(true);
    } else {
      setIsOffline(false);
    }

    if (roomsRes.error) {
      setError(roomsRes.error);
    } else if (roomsRes.data) {
      // Sort rooms naturally by roomNumber
      const sorted = [...roomsRes.data].sort((a, b) =>
        a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
      );
      setRooms(sorted);
    }

    if (typesRes.data) {
      setRoomTypes(typesRes.data);
    }

    hasLoadedOnceRef.current = true;
    setLastRefreshed(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return {
    rooms,
    roomTypes,
    loading,
    error,
    isOffline,
    lastRefreshed,
    refresh: fetchRooms,
  };
}

