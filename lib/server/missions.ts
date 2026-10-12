import { dayKeyFor, mutateDB, readDB, type Pilot } from './onlineStore';

/**
 * Nhiem vu hang ngay TOAN SERVER.
 *
 * Server khong chay game engine nen khong biet bay bao chuyen, ban may bay bao
 * nhieu. Voi vay tien do duoc **do bang nhung chi so server nhin thay**:
 * so may bay, so duong bay, cap do, gia tri hang.
 *
 * Chot "no" cua bo thiet ke nay: muc tieu phai **gan voi luc bat dau ngay** chu
 * khong gan voi luc xem. Neu sinh muc tieu tu chi so hien tai thi muc tieu luon
 * cao hon tien do va nhiem vu khong bao gio hoan thanh — nen bo nhiemvu duoc
 * gan mot lan luc 0h, giu nguyen suott ngay, va tien do do bang muc cao nhat da
 * dat trong ngay (nguoi choi len cap 5 roi ha cap xuong 4 thi khong mat thuong).
 */

export type DailyMetric = 'planes' | 'routes' | 'level' | 'value';

export interface DailyMission {
  id: DailyMetric;
  title: string;
  description: string;
  /** Chi so can dat duoc. */
  target: number;
  metric: DailyMetric;
  reward: number;
}

export interface MissionWithProgress extends DailyMission {
  progress: number;
  done: boolean;
  /** Da nhan thuong chua — client dung de khoa nut nhan. */
  claimed: boolean;
}

/** 0h UTC ngay hom sau — moc luc sang ngam moi. */
export const dayEndsAt = (now: number): number => Date.UTC(
  new Date(now).getUTCFullYear(),
  new Date(now).getUTCMonth(),
  new Date(now).getUTCDate() + 1,
);

type Stats = Pick<Pilot, 'value' | 'level' | 'planes' | 'routes'>;

/**
 * Bo nhiemvu cho MOT ngay, gan voi muc luc bat dau ngay cua nguoi choi.
 *
 * `baseline` la chi so luc 0h; muc tieu luon cao hon baseline mot chung, nen
 * nguoi choi chi can tiep tuc choi binh thuong de dat muc.
 */
export function missionsFor(baseline: Stats): DailyMission[] {
  const growth = Math.max(1_000_000, Math.round(baseline.value * 0.1));
  return [
    { id: 'planes', title: 'Mở rộng đội bay', description: `Đưa đội bay lên ${baseline.planes + 2} máy.`, target: baseline.planes + 2, metric: 'planes', reward: 500_000 },
    { id: 'routes', title: 'Kết nối thêm tuyến', description: `Khai thác ${baseline.routes + 1} đường bay.`, target: baseline.routes + 1, metric: 'routes', reward: 400_000 },
    { id: 'level', title: 'Lên một cấp', description: `Đạt cấp ${Math.min(100, baseline.level + 1)}.`, target: Math.min(100, baseline.level + 1), metric: 'level', reward: 600_000 },
    { id: 'value', title: 'Đẩy giá trị hãng', description: `Tăng giá trị hãng lên ${(baseline.value + growth).toLocaleString('vi-VN')} $.`, target: baseline.value + growth, metric: 'value', reward: 800_000 },
  ];
}

const statsOf = (pilot: Pilot): Stats => ({
  value: pilot.value, level: pilot.level, planes: pilot.planes, routes: pilot.routes,
});

/**
 * Chi so dung cho mot nhiem vu: muc cao nhat da dat trong ngay, khong phai muc
 * hien tai. Nguoi choi ha cap trong ngay van giu duoc thanh tich da dat.
 */
function progressFor(pilot: Pilot, metric: DailyMetric): number {
  const current = statsOf(pilot);
  const best = pilot.bestToday?.day === dayKeyFor(Date.now()) ? pilot.bestToday : null;
  if (!best) return current[metric];
  return Math.max(current[metric], best[metric]);
}

/**
 * Dam bao tai khoan co moc bat dau ngay, roi tra ve bo nhiemvu cua ngay do.
 *
 * Moc chi duoc gan MOT LAN: lan dau goi trong ngay nao se chot lai chi so hien
 * tai. Cac lan sau chi doc lai — tranh tinh ban tieu dien hang canh chuyen muc
 * tieu giua chung.
 */
async function baselineFor(pilot: Pilot): Promise<Stats> {
  const today = dayKeyFor(Date.now());
  if (pilot.baselineToday?.day === today) {
    const { day, ...baseline } = pilot.baselineToday;
    return baseline;
  }
  const fresh: Stats = statsOf(pilot);
  await mutateDB((db) => {
    const target = db.pilots.find((p) => p.id === pilot.id);
    // Lan ghi song song co the da gan moc truoc, nen doc lai tu DB truoc khi gan.
    if (!target || target.baselineToday?.day === today) return undefined;
    target.baselineToday = { day: today, ...statsOf(target) };
    return undefined;
  });
  return fresh;
}

/**
 * Danh sach nhiemvu cua mot tai khoan kem tien do va trang thai da nhan.
 *
 * `claimed` luu tren chinh ban ghi pilot nen viec kiem tra va cong thuong chay
 * trong cung mot luot ghi `vat:db` — khong the nhan trung thuong du hai request
 * cung luc.
 */
export async function dailyMissions(pilot: Pilot): Promise<{
  dayKey: string;
  endsAt: number;
  missions: MissionWithProgress[];
}> {
  const now = Date.now();
  const dayKey = dayKeyFor(now);
  const baseline = await baselineFor(pilot);

  return {
    dayKey,
    endsAt: dayEndsAt(now),
    missions: missionsFor(baseline).map((m) => {
      const progress = progressFor(pilot, m.metric);
      return { ...m, progress, done: progress >= m.target, claimed: pilot.claimedMissions?.[m.id] === dayKey };
    }),
  };
}

/**
 * Nhan thuong nhiemvu. Cong tien va ghi danh sach "da nhan" trong cung mot
 * luot ghi nen khong the nhai thuong du goi song song.
 */
export async function claimMission(pilot: Pilot, missionId: string): Promise<{ ok: true; reward: number } | { ok: false; error: string }> {
  const dayKey = dayKeyFor(Date.now());
  const baseline = await baselineFor(pilot);
  const mission = missionsFor(baseline).find((m) => m.id === missionId);
  if (!mission) return { ok: false, error: 'Khong co nhiemvu nay.' };
  if (progressFor(pilot, mission.metric) < mission.target) {
    return { ok: false, error: 'Chua dat dieu kien nhan thuong.' };
  }

  return mutateDB((db) => {
    const target = db.pilots.find((p) => p.id === pilot.id);
    if (!target) return { ok: false as const, error: 'Tai khoan khong con ton tai.' };
    // Doc lai tu DB, khong tin ban truyen vao: mot request song song da co the
    // nhan thuong xong trong luc request nay cho lay du lieu.
    if (target.claimedMissions?.[missionId] === dayKey) {
      return { ok: false as const, error: 'Ban da nhan thuong nhiemvu nay roi.' };
    }
    target.value = Math.min(1e13, target.value + mission.reward);
    target.claimedMissions = { ...(target.claimedMissions ?? {}), [missionId]: dayKey };
    return { ok: true as const, reward: mission.reward };
  });
}

/**
 * Chi so toan server, dung cho muc "tien do chung" tren trang nhiemvu.
 * `participating` la so tai khoan co bao cap nhat trong 24 gio qua.
 */
export async function serverProgress(): Promise<{ total: number; participating: number; totalPlanes: number; totalRoutes: number }> {
  const db = await readDB();
  const active = db.pilots.filter((p) => p.updatedAt > Date.now() - 86400000);
  return {
    total: db.pilots.length,
    participating: active.length,
    totalPlanes: active.reduce((sum, p) => sum + p.planes, 0),
    totalRoutes: active.reduce((sum, p) => sum + p.routes, 0),
  };
}

/**
 * Don so cong dem cua nhung ngay da qua.
 *
 * Ca `baselineToday`, `bestToday` va `claimedMissions` deu ghi theo ngay nen tu
 * phinh ton theo thoi gian. Khong don ngay nao thi tai khoan long ngay se mang
 * theo nhung muc cua ngay hom qua. Chi doc them khi tim thay rac thoi qua.
 */
export async function pruneExpiredDailyState(): Promise<number> {
  const today = dayKeyFor(Date.now());
  const stale = await readDB();
  const expired = stale.pilots.filter((p) => p.baselineToday?.day && p.baselineToday.day !== today);
  if (expired.length === 0) return 0;
  const expiredIds = new Set(expired.map((p) => p.id));

  await mutateDB((db) => {
    for (const pilot of db.pilots) {
      if (!expiredIds.has(pilot.id)) continue;
      pilot.baselineToday = undefined;
      pilot.bestToday = undefined;
      pilot.claimedMissions = undefined;
    }
    return undefined;
  });
  return expired.length;
}