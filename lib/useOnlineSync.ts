'use client';

import { useSyncExternalStore } from 'react';
import { netClient, type Account } from './net/netClient';
import { isUsableSave, readSyncMarker, shouldPullCloud, snapshot, writeSyncMarker } from './cloudSave';
import { useGameStore } from '@/store/useGameStore';

/**
 * Quan ly phien dang nhap va dong bo tien do hai chieu — MOT ban ghi duy nhat cho
 * ca tab.
 *
 * Vi sao la singleton thay vi `useState` trong hook: `GameShell` (moi trang game)
 * va `AccountSection` (trang Cai dat) deu goi hook nay. Neu moi hook so hu mot
 * vong lap rieng, trang Cai dat se gui heartbeat va luu save HAI LAN mot luc —
 * vua ton request vua lam moc dong bo meo. O day state va vong lap nam o cap
 * module, hook chi la lop doc.
 *
 * - Khoi tao: doc phien hien tai.
 * - Moi lan dang nhap: keo ban luu tu may chu va SO với ban luu cuc bo.
 *   Cloud chi thang khi no moi hon CẢ mốc đã đồng bộ lần trước CẦNG lần
 *   sửa cuối cùng trên máy này — nhờ vậy đổi máy/đổi trình duyệt thì lấy bản
 *   mới nhất, còn mở lại game trên chính máy cũ thì không bị đè mất tiến trình
 *   vừa chơi (cũng không bị đẩy bản cũ lên làm mất bản mới).
 * - Moi 60s: gui chi so hang bay len bang xep hang.
 * - Moi 30s: luu anh chup tien do len may chu.
 *
 * Chi gui khi da dang nhap. Nguoi choi khach van choi binh thuong, du lieu nam
 * trong localStorage.
 */

const HEARTBEAT_MS = 60_000;
const SAVE_MS = 30_000;

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'restored' | 'error';

interface SyncState {
  account: Account | null;
  ready: boolean;
  status: SyncStatus;
  lastSavedAt: number;
  /**
   * Server da cham han muc cong gia tri BXH. Chi so len day dung vao ti le
   * chay choi thuc te, nen muc dung 30 phut la nhieu doi voi nguoi choi that.
   */
  creditLimited: boolean;
}

let state: SyncState = { account: null, ready: false, status: 'idle', lastSavedAt: 0, creditLimited: false };
const listeners = new Set<() => void>();
let booted = false;
/** Tai khoan da xu ly dong bo khi dang nhap — dung de chay lai khi doi tai khoan. */
let syncedAccount = '';
const timers = { save: null as ReturnType<typeof setInterval> | null, beat: null as ReturnType<typeof setInterval> | null };

const emit = () => listeners.forEach((listener) => listener());
const setState = (patch: Partial<SyncState>) => { state = { ...state, ...patch }; emit(); };

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  void boot();
  return () => { listeners.delete(listener); };
};

const getSnapshot = () => state;
/**
 * Server render khong co `localStorage`/fetch nen tra cung mot object ban ghi.
 * `useSyncExternalStore` chi can mot gia tri on dinh o server; client lai
 * subscribe lai ngay khi hydrate nen trang thai that van dung.
 */
const getServerSnapshot = () => state;

/** Nap ban luu tren may chu vao store. Tra `true` neu thuc su ap dung. */
async function pullAndApply(): Promise<boolean> {
  const save = await netClient.pullSave();
  if (!save) return false;
  const cloud = save.state;
  if (!isUsableSave(cloud)) return false;
  useGameStore.getState().update((s) => ({ ...s, ...cloud, hydrate: true }));
  writeSyncMarker(state.account?.id, save.updatedAt, save.version);
  setState({ status: 'restored' });
  return true;
}

/** Đẩy ảnh chụp tiến độ hiện tại lên máy chủ. Dùng chung cho tự động và thủ công. */
async function saveNow(): Promise<boolean> {
  const gameState = useGameStore.getState();
  if (!gameState.airline) return false;
  setState({ status: 'saving' });
  try {
    const updatedAt = await netClient.pushSave(snapshot(gameState));
    setState({ status: 'saved', lastSavedAt: Date.now() });
    // Ghi moc dong bo de lan sau biet ban tren may chu da tien toi dau.
    // `pushSave` tra 0 khi that bai — khi do giu moc cu, khong ghi de.
    if (updatedAt > 0) writeSyncMarker(state.account?.id, updatedAt);
    return true;
  } catch {
    setState({ status: 'error' });
    return false;
  }
}

/**
 * Đồng bộ khi đăng nhập: cloud mới hơn thì lấy cloud, không thì giữ bản local
 * và đẩy ngược lên cloud.
 */
async function syncOnLogin(account: Account) {
  const save = await netClient.pullSave();
  if (!save || !isUsableSave(save.state)) return;
  const notify = useGameStore.getState().notify;
  const localState = useGameStore.getState();

  // Chưa có gì trên máy này → lấy bản cloud (đổi máy lần đầu).
  if (!localState.airline) {
    if (await pullAndApply()) {
      notify('Đã khôi phục tiến trình hãng bay từ tài khoản trên mây.', 'success');
      if (typeof window !== 'undefined') window.location.replace('/dashboard');
    }
    return;
  }

  // Có bản local: chỉ lấy cloud khi cloud mới hơn mốc đã sync VÀ mới hơn bản local.
  const marker = readSyncMarker(account.id);
  const cloudIsNewer = shouldPullCloud({
    cloudUpdatedAt: save.updatedAt,
    markerUpdatedAt: marker?.updatedAt ?? 0,
    localUpdatedAt: localState.airline.updatedAt ?? 0,
  });
  if (cloudIsNewer) {
    if (await pullAndApply()) notify('Đã đồng bộ tiến trình mới nhất từ máy khác về thiết bị này.', 'success');
    return;
  }

  // Máy này đang xa hơn cloud → đẩy ngược để không ai khác đọc bản cũ.
  // Mốc đồng bộ do `saveNow` ghi sau khi đẩy thành công, không ghi trước:
  // đẩy hỏng thì phải giữ mốc cũ để lần sau còn biết cloud đã cũ.
  void saveNow();
}

function startTimers() {
  if (timers.save) return;
  timers.save = setInterval(() => { void saveNow(); }, SAVE_MS);
  timers.beat = setInterval(async () => {
    const gameState = useGameStore.getState();
    if (!gameState.airline) return;
    const result = await netClient.heartbeat({
      name: gameState.airline.name,
      value: gameState.airline.cash,
      level: gameState.airline.level,
      planes: gameState.planes.length,
      routes: gameState.routes.length,
      reputation: gameState.airline.reputation ?? 70,
    });
    // Server chan cong gia tri theo muc dung 30 phut — bao cho nguoi choi biet
    // vi sao xep hang dung lai thay vi tu hien la tang.
    if (result.clamped) setState({ creditLimited: true });
  }, HEARTBEAT_MS);
}

function stopTimers() {
  if (timers.save) { clearInterval(timers.save); timers.save = null; }
  if (timers.beat) { clearInterval(timers.beat); timers.beat = null; }
}

function setAccount(account: Account | null) {
  setState({ account });
  if (!account) {
    stopTimers();
    syncedAccount = '';
    return;
  }
  startTimers();
  if (syncedAccount === account.id) return;
  syncedAccount = account.id;
  void syncOnLogin(account);
}

/** Khoi dong doc phien dang nhap — goi mot lan duy nhat cho ca tab. */
async function boot() {
  if (booted) return;
  booted = true;
  const me = await netClient.me();
  if (me) setAccount(me);
  setState({ ready: true });
}

export function useOnlineSync() {
  const snapshotValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    account: snapshotValue.account,
    ready: snapshotValue.ready,
    status: snapshotValue.status,
    lastSavedAt: snapshotValue.lastSavedAt,
    creditLimited: snapshotValue.creditLimited,
    login: async (username: string, password: string) => {
      const result = await netClient.login(username, password);
      if (result.ok) setAccount(result.account);
      return result;
    },
    register: async (input: { username: string; password: string; name: string }) => {
      const result = await netClient.register(input);
      if (result.ok) setAccount(result.account);
      return result;
    },
    logout: async () => {
      await netClient.logout();
      setAccount(null);
    },
    saveNow,
    restoreFromCloud: pullAndApply,
  };
}