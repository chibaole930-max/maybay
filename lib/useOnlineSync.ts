'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { netClient, type Account } from './net/netClient';
import { isUsableSave, snapshot } from './cloudSave';
import { useGameStore } from '@/store/useGameStore';

/**
 * Quan ly phien dang nhap va dong bo tien do.
 *
 * - Khoi tao: doc phien hien tai; neu may nay chua co hang bay nao ma tai khoan
 *   co ban luu tren may chu thi nap ban do ve (chu yeu cho truong hop doi thiet bi).
 * - Moi 60s: gui chi so hang bay len bang xep hang.
 * - Moi 30s: luu anh chup tien do len may chu.
 *
 * Chi gui khi da dang nhap. Nguoi choi khach van choi binh thuong, du lieu nam
 * trong localStorage.
 */

const HEARTBEAT_MS = 60_000;
const SAVE_MS = 30_000;

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'restored' | 'error';

export function useOnlineSync() {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState(0);
  /**
   * Server da cham han muc cong gia tri BXH. Chi so len day dung vao ti le
   * chay choi thuc te, nen muc dung 30 phut la nhieu doi voi nguoi choi that.
   */
  const [creditLimited, setCreditLimited] = useState(false);
  const restored = useRef(false);

  const airline = useGameStore((s) => s.airline);
  const update = useGameStore((s) => s.update);

  // Doc phien dang nhap mot lan dau.
  useEffect(() => {
    let stop = false;
    netClient.me().then((me) => {
      if (stop) return;
      setAccount(me);
      setReady(true);
    });
    return () => { stop = true; };
  }, []);

  const pullAndApply = useCallback(async () => {
    const save = await netClient.pullSave();
    if (!save) return false;
    const restored = isUsableSave(save.state) ? save.state : null;
    if (!restored) return false;
    update((s) => ({ ...s, ...restored, hydrate: true }));
    setStatus('restored');
    return true;
  }, [update]);

  /** Đẩy ảnh chụp tiến độ hiện tại lên máy chủ. Dùng chung cho tự động và thủ công. */
  const saveNow = useCallback(async () => {
    const state = useGameStore.getState();
    if (!state.airline) return false;
    setStatus('saving');
    try {
      await netClient.pushSave(snapshot(state));
      setStatus('saved');
      setLastSavedAt(Date.now());
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, []);

  // Nguoi choi khong co hang bay local nhung co ban luu tren may chu -> nap ve.
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    if (airline) return;
    if (!account) return;
    void (async () => {
      const applied = await pullAndApply();
      if (applied && typeof window !== 'undefined') window.location.replace('/dashboard');
    })();
  }, [ready, account, airline, pullAndApply]);

  // Vong lap dong bo chi so + luu tien do.
  useEffect(() => {
    if (!ready || !account) return;
    let stop = false;

    const heartbeat = async () => {
      if (stop) return;
      const state = useGameStore.getState();
      if (!state.airline) return;
      const result = await netClient.heartbeat({
        name: state.airline.name,
        value: state.airline.cash,
        level: state.airline.level,
        planes: state.planes.length,
        routes: state.routes.length,
        reputation: state.airline.reputation ?? 70,
      });
      // Server chan cong gia tri theo muc dung 30 phut — bao cho nguoi choi biet
      // vi sao xep hang dung lai thay vi tu hien la tang.
      if (result.clamped && !stop) setCreditLimited(true);
    };

    const saveTimer = setInterval(() => { if (!stop) void saveNow(); }, SAVE_MS);
    const beatTimer = setInterval(heartbeat, HEARTBEAT_MS);
    return () => { stop = true; clearInterval(saveTimer); clearInterval(beatTimer); };
  }, [ready, account, saveNow]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await netClient.login(username, password);
    if (result.ok) setAccount(result.account);
    return result;
  }, []);

  const register = useCallback(async (input: { username: string; password: string; name: string }) => {
    const result = await netClient.register(input);
    if (result.ok) setAccount(result.account);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await netClient.logout();
    setAccount(null);
  }, []);

  return { account, ready, status, lastSavedAt, creditLimited, login, register, logout, saveNow, restoreFromCloud: pullAndApply };
}
