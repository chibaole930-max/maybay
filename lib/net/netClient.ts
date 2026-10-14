/**
 * Adapter online voi fallback mock. Chay duoc tren hosting thuong (polling, khong can websocket).
 *
 * Phien dang nhap giu trong cookie httpOnly `vat_session`, nen fetch cung origin
 * tu mang cookie theo — client khong can (va khong the) doc duoc token.
 */

export type Versioned<T> = { data: T; updatedAt: number; version: number };
export type MockProfile = { code: string; name: string; level: number; reputation: number; fleet: string[]; topRoutes: string[]; value: number };
export type SeasonSummary = { name: string; daysLeft: number; reward: string; status: 'mock' | 'live'; ranks?: { code: string; name: string; value: number }[] };
export type AlliancePreview = { name: string; members: number; capacity: number; contribution: number };
export type UsedPlaneListing = { id: string; model: string; wear: number; price: number; seller: string };
export type Account = { id: string; code: string; name: string; username?: string; email?: string; createdAt?: number };

/** Thông báo trong hộp thư. */
export type ServerNotice = {
  id: string; kind: 'market' | 'auction' | 'social' | 'system';
  title: string; body: string; at: number; read: boolean;
};

/** Phiên đấu giá slot sân bay. */
export type SlotAuction = {
  id: string; airport: string; price: number; slots: number;
  bidder: string; bidderName: string; endsAt: number;
};

/** Nhiệm vụ hằng ngày toàn server — tiến độ do máy chủ tính. */
export type DailyMissions = {
  dayKey: string;
  endsAt: number;
  missions: {
    id: string; title: string; description: string; target: number;
    metric: 'planes' | 'routes' | 'level' | 'value';
    reward: number; progress: number; done: boolean; claimed: boolean;
  }[];
  server: { total: number; participating: number; totalPlanes: number; totalRoutes: number };
};

/** Trạng thái toàn server: sự kiện xoay vòng + số người đang online (heartbeat 5 phút). */
export type WorldState = {
  demandMultiplier: number;
  title: string;
  golden: boolean;
  serverTime: number;
  /** Số tài khoản đang mở game (heartbeat trong 5 phút). `null` = server không trả. */
  online: number | null;
  /** Số tài khoản hoạt động trong 24 giờ. */
  activeToday: number | null;
  /** Tổng tài khoản từng đăng ký. */
  total: number | null;
  totalPlanes: number | null;
  totalRoutes: number | null;
};

/** Hồ sơ pilot từ server. Không có `id` / `username` — server cố tình giấu khoá bản ghi. */
export type PilotProfile = {
  pilot: {
    code: string; name: string; value: number; level: number;
    planes: number; routes: number; reputation: number; updatedAt: number;
    createdAt?: number;
  };
  rank: number;
  total: number;
  trades: { id: string; model: string; price: number; at: number; side: 'mua' | 'ban'; counterparty: string }[];
  achievements: { id: string; label: string; detail: string }[];
  tradeStats: { sold: number; bought: number; volume: number };
};

const profiles: MockProfile[] = [
  { code: 'VNA3K9', name: 'VietSky', level: 18, reputation: 86, fleet: ['A320neo', 'ATR72', 'B787-9'], topRoutes: ['SGN → DAD', 'HAN → SIN'], value: 62500000 },
  { code: 'SAI8Q2', name: 'Saigon Air', level: 15, reputation: 78, fleet: ['A321LR', 'A320neo'], topRoutes: ['SGN → BKK', 'SGN → HAN'], value: 41200000 },
  { code: 'BAY5M1', name: 'Cánh Én Việt', level: 12, reputation: 91, fleet: ['ATR72', 'A320neo'], topRoutes: ['DAD → SGN', 'HAN → DAD'], value: 28700000 },
];

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const result = await fn();
    clearTimeout(timer);
    return result;
  } catch { return fallback; }
}

export const netClient = {
  /** Tai khoan dang dang nhap (theo cookie phien). `null` neu chua dang nhap. */
  async me(): Promise<Account | null> {
    return safe(async () => {
      const r = await fetch('/api/auth', { cache: 'no-store' });
      if (!r.ok) return null;
      const json = (await r.json()) as { account: Account | null };
      return json.account;
    }, null);
  },

  /**
   * Dang nhap bang ten dang nhap + mat khau. Mat khau di qua HTTPS den may chu
   * game, duoc kiem tra bang scrypt roi bo ngay — khong luu ban ro o dau.
   * May chu tra cookie phien httpOnly.
   */
  async login(username: string, password: string): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
    try {
      const r = await fetch('/api/auth', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'login', username, password }) });
      const json = (await r.json().catch(() => ({}))) as { account?: Account; error?: string };
      if (!r.ok || !json.account) return { ok: false, error: json.error || 'Dang nhap that bai.' };
      return { ok: true, account: json.account };
    } catch { return { ok: false, error: 'Khong ket noi duoc may chu.' }; }
  },

  async register(input: { username: string; password: string; name: string }): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
    try {
      const r = await fetch('/api/auth', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'register', ...input }) });
      const json = (await r.json().catch(() => ({}))) as { account?: Account; error?: string };
      if (!r.ok || !json.account) return { ok: false, error: json.error || 'Dang ky that bai.' };
      return { ok: true, account: json.account };
    } catch { return { ok: false, error: 'Khong ket noi duoc may chu.' }; }
  },

  async changePassword(current: string, next: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const r = await fetch('/api/auth', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'change-password', current, next }) });
      const json = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) return { ok: false, error: json.error || 'Đổi mật khẩu thất bại.' };
      return { ok: true };
    } catch { return { ok: false, error: 'Không kết nối được máy chủ.' }; }
  },

  async logout(): Promise<boolean> {
    return safe(async () => {
      const r = await fetch('/api/auth', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'logout' }) });
      return r.ok;
    }, false);
  },

  /**
   * Bao lenh chi so len BXH.
   * Server cham muc cong gia tri moi 30 phut, nen se co luc client bao nhieu hon
   * thuc te — `clamped` cho biet nhan vay de hien thi canh bao thay vi im lang.
   */
  async heartbeat(input: { name?: string; value: number; level: number; planes: number; routes: number; reputation: number }): Promise<{ ok: boolean; clamped: boolean; value?: number }> {
    try {
      const r = await fetch('/api/leaderboard', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input) });
      if (!r.ok) return { ok: false, clamped: false };
      const json = (await r.json().catch(() => ({}))) as { clamped?: boolean; value?: number };
      return { ok: true, clamped: Boolean(json.clamped), value: json.value };
    } catch {
      return { ok: false, clamped: false };
    }
  },

  async pushSave(state: unknown): Promise<number> {
    return safe(async () => {
      const r = await fetch('/api/save', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ state }) });
      if (!r.ok) throw new Error('save failed');
      const json = (await r.json()) as { updatedAt: number; version: number };
      return json.updatedAt;
    }, 0);
  },

  /** Tra ve ban luu tren may chu, hoac `null` neu chua co / chua dang nhap. */
  async pullSave(): Promise<{ state: unknown; updatedAt: number; version: number } | null> {
    return safe(async () => {
      const r = await fetch('/api/save', { cache: 'no-store' });
      if (r.status === 401) return null;
      if (!r.ok) throw new Error('load failed');
      const json = (await r.json()) as { save: { state: unknown; updatedAt: number; version: number } | null };
      return json.save;
    }, null);
  },

  async getLeaderboard() {
    const live = await safe(async () => {
      const r = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!r.ok) throw new Error('lb failed');
      return (await r.json()) as { pilots: { code: string; name: string; level: number; reputation: number; value: number }[] };
    }, null as unknown as { pilots: { code: string; name: string; level: number; reputation: number; value: number }[] });
    if (live?.pilots?.length) return live.pilots;
    return profiles.map(({ code, name, level, reputation, value }) => ({ code, name, level, reputation, value }));
  },

  /**
 * Số thông báo chưa đọc, dùng cho badge chuông. Nhẹ: chỉ đếm, không đánh dấu
 * đã đọc — gọi hàm này không nên tắt badge ngoài ý muốn.
 */
  async getUnread(): Promise<number> {
    return safe(async () => {
      const r = await fetch('/api/inbox?peek=1', { cache: 'no-store' });
      if (!r.ok) return 0;
      return (await r.json() as { unread: number }).unread;
    }, 0);
  },

  /** Hộp thư. Mặc định đánh dấu đã đọc; trả kèm `reminders` để toast khi vào game. */
  async getInbox(): Promise<{ notices: ServerNotice[]; unread: number; reminders: ServerNotice[] } | null> {
    return safe(async () => {
      const r = await fetch('/api/inbox', { cache: 'no-store' });
      if (r.status === 401) return null;
      if (!r.ok) throw new Error('inbox failed');
      return await r.json() as { notices: ServerNotice[]; unread: number; reminders: ServerNotice[] };
    }, null);
  },

  /** Xoá thông báo đã đọc, giữ tin chưa đọc. */
  async clearReadNotices(): Promise<{ notices: ServerNotice[] } | null> {
    return safe(async () => {
      const r = await fetch('/api/inbox', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'clear' }) });
      if (!r.ok) throw new Error('inbox failed');
      return await r.json() as { notices: ServerNotice[] };
    }, null);
  },

  /** Các phiên đấu giá slot đang mở. Gọi hàm này cũng chạy việc chốt các phiên đã hết hạn. */
  async getAuctions(): Promise<SlotAuction[]> {
    return safe(async () => {
      const r = await fetch('/api/auction', { cache: 'no-store' });
      if (!r.ok) throw new Error('auction failed');
      return (await r.json() as { auctions: SlotAuction[] }).auctions;
    }, [] as SlotAuction[]);
  },

  /** Mở phiên đấu giá mới. Ném lỗi khi server từ chối (sân bay đã có phiên...). */
  async openAuction(airport: string, slots: number): Promise<{ auctions: SlotAuction[]; error?: string }> {
    return this.auctionPost({ airport, slots });
  },

  /** Đặt giá. Server giữ ký quỹ ngay khi đặt — xem `/api/auction`. */
  async bidAuction(auctionId: string, bid: number): Promise<{ auctions: SlotAuction[]; error?: string }> {
    return this.auctionPost({ auctionId, bid });
  },

  /** Huỷ phiên mình mở khi chưa ai đặt giá. */
  async cancelAuction(auctionId: string): Promise<{ auctions: SlotAuction[]; error?: string }> {
    return this.auctionPost({ auctionId, cancel: true });
  },

  async auctionPost(body: Record<string, unknown>): Promise<{ auctions: SlotAuction[]; error?: string }> {
    try {
      const r = await fetch('/api/auction', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) });
      const json = (await r.json().catch(() => ({}))) as { auctions?: SlotAuction[]; error?: string };
      if (!r.ok) return { auctions: json.auctions ?? [], error: json.error || 'Thao tác thất bại.' };
      return { auctions: json.auctions ?? [] };
    } catch {
      return { auctions: [], error: 'Không kết nối được máy chủ.' };
    }
  },

  /** Nhiệm vụ hằng ngày toàn server. `null` khi chưa đăng nhập hoặc server lỗi. */
  async getDailyMissions(): Promise<DailyMissions | null> {
    return safe(async () => {
      const r = await fetch('/api/missions', { cache: 'no-store' });
      if (r.status === 401) return null;
      if (!r.ok) throw new Error('missions failed');
      return (await r.json()) as DailyMissions;
    }, null);
  },

  /** Nhận thưởng nhiệm vụ. Trả lại bộ nhiệm vụ đã cập nhật từ server. */
  async claimDailyMission(id: string): Promise<{ missions?: DailyMissions; reward?: number; error?: string }> {
    try {
      const r = await fetch('/api/missions', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ missionId: id }) });
      const json = (await r.json().catch(() => ({}))) as DailyMissions & { ok?: boolean; reward?: number; error?: string };
      if (!r.ok) return { error: json.error || 'Nhận thưởng thất bại.' };
      return { missions: json, reward: json.reward };
    } catch {
      return { error: 'Không kết nối được máy chủ.' };
    }
  },

  /** Hồ sơ công khai của một pilot theo mã hãng (`VNAxxxx`). `null` khi không tồn tại. */
  async getPilotProfile(code: string): Promise<(PilotProfile & { fleet: string[]; topRoutes: string[] }) | null> {
    try {
      const r = await fetch(`/api/pilot?code=${encodeURIComponent(code.trim())}&stats=1`, { cache: 'no-store' });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('profile failed');
      const json = (await r.json()) as { profile: PilotProfile; stats?: { planes: { model: string; count: number }[]; topRoutes: string[] } | null };
      const profile = json.profile;
      const stats = json.stats;
      return {
        ...profile,
        fleet: stats?.planes.map((p) => (p.count > 1 ? `${p.model} ×${p.count}` : p.model)) ?? [],
        topRoutes: stats?.topRoutes ?? [],
      };
    } catch {
      return null;
    }
  },

  /** Hồ sơ của chính mình (giao dịch, huy chương, thứ hạng). */
  async getOwnProfile(): Promise<PilotProfile | null> {
    return safe(async () => {
      const r = await fetch('/api/pilot', { cache: 'no-store' });
      if (r.status === 401) return null;
      if (!r.ok) throw new Error('profile failed');
      const json = (await r.json()) as { profile: PilotProfile };
      return json.profile;
    }, null);
  },

  async getFriendProfile(code: string) {
    const live = await this.getPilotProfile(code);
    if (live) {
      return {
        code: live.pilot.code, name: live.pilot.name, level: live.pilot.level,
        reputation: live.pilot.reputation, fleet: live.fleet, topRoutes: live.topRoutes,
        value: live.pilot.value, rank: live.rank, total: live.total,
        achievements: live.achievements, tradeStats: live.tradeStats,
      };
    }
    const found = profiles.find((p) => p.code.toUpperCase() === code.trim().toUpperCase());
    return found ?? null;
  },

  async getWorld() {
    return safe(async () => {
      const r = await fetch('/api/world-state', { cache: 'no-store' });
      if (!r.ok) throw new Error('world failed');
      return (await r.json()) as WorldState;
    }, null);
  },

  async sendChat(_room: string, message: string) {
    try {
      const r = await fetch('/api/community?kind=chat', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ message }) });
      if (r.status === 401) throw new Error('Cần đăng nhập để chat.');
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Gửi tin nhắn thất bại.');
      }
      const json = (await r.json()) as { message: { id: string; sender: string; message: string; at: number } };
      return json.message;
    } catch (err) {
      // Chi lui ve tin nhan gia khi that su khong noi duoc may chu (loi mang).
      // Server tra 401/429 la loi that cua nguoi choi — phai nem loi ra de UI hien thi,
      // giu im lang se khiến tin nhắn bi "gửi xong" rồi bay lai trong may.
      if (err instanceof TypeError) {
        return { id: 'mock-' + Date.now(), message, at: Date.now(), sender: 'Hãng của bạn' };
      }
      throw err;
    }
  },

  async getChat(since = 0) {
    return safe(async () => {
      const r = await fetch(`/api/community?kind=chat&since=${since}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('chat failed');
      const json = (await r.json()) as { messages: { id: string; sender: string; message: string; at: number }[] };
      return json.messages;
    }, [] as { id: string; sender: string; message: string; at: number }[]);
  },

  async getSeason(): Promise<SeasonSummary> {
    const live = await safe(async () => {
      const r = await fetch('/api/community?kind=season', { cache: 'no-store' });
      if (!r.ok) throw new Error('season failed');
      return (await r.json()) as { id: string; endsAt: number; ranks: { code: string; name: string; value: number }[] };
    }, null as unknown as { id: string; endsAt: number; ranks: { code: string; name: string; value: number }[] });
    if (live?.id) {
      const daysLeft = Math.max(0, Math.ceil((live.endsAt - Date.now()) / 86400000));
      return { name: `Mùa ${live.id}`, daysLeft, reward: 'Top BXH mùa nhận 5M $ + 1000 XP', status: 'live', ranks: live.ranks };
    }
    return { name: 'Mùa Cất Cánh', daysLeft: 18, reward: 'Khung vàng + danh hiệu Phi công xuất sắc', status: 'mock' };
  },

  async getAlliance(): Promise<AlliancePreview> {
    const live = await safe(async () => {
      const r = await fetch('/api/community?kind=alliance', { cache: 'no-store' });
      if (!r.ok) throw new Error('alliance failed');
      return (await r.json()) as { alliance: { name: string; members: number; capacity: number; contribution: number } };
    }, null as unknown as { alliance: AlliancePreview });
    if (live?.alliance) return live.alliance;
    return { name: 'Liên minh Mây Trắng', members: 7, capacity: 10, contribution: 1240 };
  },

  /** Tham gia lien minh. Nem loi khi server tu choi (da day, sai quyen, qua tan suat). */
  async joinAlliance(): Promise<{ ok: true; members: number }> {
    const r = await fetch('/api/community?kind=alliance', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ join: true }) });
    const json = (await r.json().catch(() => ({}))) as { members?: number; error?: string };
    if (!r.ok) throw new Error(json.error || 'Tham gia liên minh thất bại.');
    return { ok: true, members: json.members ?? 0 };
  },

  async getUsedMarket(): Promise<UsedPlaneListing[]> {
    const live = await safe(async () => {
      const r = await fetch('/api/market', { cache: 'no-store' });
      if (!r.ok) throw new Error('market failed');
      return (await r.json()) as { listings: UsedPlaneListing[] };
    }, null as unknown as { listings: UsedPlaneListing[] });
    if (live?.listings?.length) return live.listings;
    return [{ id: 'used-1', model: 'Airbus A320neo', wear: 22, price: 9800000, seller: 'VietSky' }, { id: 'used-2', model: 'ATR 72-600', wear: 11, price: 2650000, seller: 'Saigon Air' }];
  },

  async sellPlane(model: string, wear: number, price: number): Promise<{ ok: boolean; error?: string }> {
    try {
      const r = await fetch('/api/market', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ model, wear, price }) });
      const json = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) return { ok: false, error: json.error || 'Đăng tin rao thất bại.' };
      return { ok: true };
    } catch {
      return { ok: false, error: 'Không kết nối được máy chủ.' };
    }
  },

  /** Mua tin rao. Server se **tru tien** — client can biet truoc de khong hien may bay ma chua tien. */
  async buyListing(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const r = await fetch('/api/market', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ buyId: id }) });
      const json = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) return { ok: false, error: json.error || 'Mua thất bại.' };
      return { ok: true };
    } catch {
      return { ok: false, error: 'Không kết nối được máy chủ.' };
    }
  },
};

/** Bao mọi entity bằng version + thời điểm cập nhật để sẵn sàng xử lý xung đột phía máy chủ. */
export function versionEntity<T extends object>(data: T, previousVersion = 0): Versioned<T> { return { data, updatedAt: Date.now(), version: previousVersion + 1 }; }
