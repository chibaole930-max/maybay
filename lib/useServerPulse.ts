'use client';

import { useEffect, useState } from 'react';
import { netClient, type WorldState } from './net/netClient';

/**
 * Số người đang online + trạng thái toàn server.
 *
 * Poll mỗi 60s cùng nhịp với heartbeat của `useOnlineSync`, nên con số "đang
 * online" cập nhật chậm nhất 1 phút — đủ để người chơi cảm nhận được server
 * có người mà không tốn thêm request mỗi giây.
 *
 * Trả `null` khi chưa có dữ liệu hoặc server lỗi: UI hiện "—" thay vì số 0 giả,
 * vì "0 người online" là thông tin sai.
 */
export interface ServerPulse {
  online: number | null;
  activeToday: number | null;
  total: number | null;
  totalPlanes: number | null;
  totalRoutes: number | null;
  title: string;
  golden: boolean;
}

const EMPTY: ServerPulse = { online: null, activeToday: null, total: null, totalPlanes: null, totalRoutes: null, title: '', golden: false };

export function useServerPulse(pollMs = 60000): ServerPulse {
  const [pulse, setPulse] = useState<ServerPulse>(EMPTY);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const world = await netClient.getWorld();
        if (stop || !world) return;
        setPulse({
          online: typeof world.online === 'number' ? world.online : null,
          activeToday: typeof world.activeToday === 'number' ? world.activeToday : null,
          total: typeof world.total === 'number' ? world.total : null,
          totalPlanes: typeof world.totalPlanes === 'number' ? world.totalPlanes : null,
          totalRoutes: typeof world.totalRoutes === 'number' ? world.totalRoutes : null,
          title: world.title,
          golden: world.golden,
        });
      } catch {
        /* giữ số cũ */
      }
    };
    load();
    const timer = setInterval(load, pollMs);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [pollMs]);

  return pulse;
}