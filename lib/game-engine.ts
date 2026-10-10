import type {
  Airline,
  Airport,
  GameEvent,
  GameState,
  Flight,
  ActivityItem,
  Milestone,
  Mission,
  OfflineSummary,
  Plane,
  Route,
  Staff,
  Transaction,
} from '@/types';
import type { AirportDraft } from './geo-naming';
import {
  airlineValue,
  basePrice,
  distanceKm,
  getMaintenanceCost,
  getPlaneResaleValue,
  isWideBody,
  marketingCostMultiplier,
  routeEconomics,
} from './formulas';
import {
  achievementsList,
  airports as mockAirports,
  dailyMissions,
  initialStaffCandidates,
  LOGIN_REWARDS,
  randomEventTemplates,
  starterMissions,
  weeklyMissionPool,
} from './mock-data';
import { pickFunnySituation } from './funny-events';
import { milestoneTemplates } from './milestones';

/** Helpers retention: dayId theo ngày thực, weekId Thứ 2→CN. */
export const dayId = (d = new Date()): string => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const weekId = (d = new Date()): string => {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Thứ 2 = 0
  copy.setDate(copy.getDate() - day);
  return `${copy.getFullYear()}-W${copy.getMonth() + 1}-${copy.getDate()}`;
};
export const msUntilMidnight = (now = Date.now()): number => {
  const d = new Date(now);
  const end = new Date(d);
  end.setHours(24, 0, 0, 0);
  return Math.max(0, end.getTime() - now);
};
function rollWeeklyQuests(seasonId: string): Mission[] {
  const pool = [...weeklyMissionPool];
  // Xáo trộn deterministic theo weekId để mọi tick trong tuần ổn định.
  let seed = 0;
  for (const c of seasonId) seed = (seed * 31 + c.charCodeAt(0)) % 100000;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3).map((m) => ({ ...m, progress: m.id === 'weekly-reputation-80' ? 70 : m.id === 'weekly-fleet-5' ? 0 : 0, done: false, updatedAt: Date.now(), version: 1 }));
}

export const initialState = (): GameState => ({
  airline: null,
  planes: [],
  routes: [],
  airports: mockAirports.map((a) => ({ ...a })),
  transactions: [],
  staff: [
    { id: 'staff-init-1', role: 'Phi công', name: 'Nguyễn Văn Hùng', skill: 3, salaryPerHour: 35, morale: 95 },
    { id: 'staff-init-2', role: 'Tiếp viên', name: 'Lê Hoàng Mai', skill: 3, salaryPerHour: 18, morale: 98 },
    { id: 'staff-init-3', role: 'Kỹ sư', name: 'Vũ Quốc Bảo', skill: 4, salaryPerHour: 32, morale: 94 },
  ],
  research: { fuel: 0, service: 0, maintenance: 0 },
  researchPoints: 0,
  missions: [...starterMissions.map((m) => ({ ...m })), ...dailyMissions.map((m) => ({ ...m }))],
  notices: [],
  currentEvent: null,
  eventHistory: [],
  loan: 0,
  theme: 'light',
  currency: 'USD',
  soundEnabled: true,
  tutorialDone: false,
  simpleMode: true,
  pendingLevelUp: undefined,
  pendingOfflineSummary: null,
  currentSituation: null,
  situationNextAt: Date.now() + situationDelayMs(false),
  activeConsequences: [],
  hardcore: false,
  redPriceSince: {},
  greenPriceSince: {},
  routeTitles: [],
  friendCodes: [],
  updatedAt: Date.now(),
  version: 1,
  competitorPriceAt: Date.now() + 6 * 3600000,
  marketingPenaltyUntil: 0,
  pendingOperatingCost: 0,
  lastDailyReset: dayId(),
  lastLoginDate: dayId(),
  loginClaimedDate: '',
  loginStreak: 0,
  weeklySeason: { id: weekId(), quests: rollWeeklyQuests(weekId()) },
  streakShield: true,
  streakBest: 0,
});

/** Tốc độ mô phỏng: một giây thực tương đương một phút trong game. */
export const TIME_SCALE = 60;

/**
 * Tình huống vận hành đếm theo đồng hồ THỰC của người chơi, không phải thời gian game.
 * Lý do: `gameTimeMs` chạy nhanh gấp `TIME_SCALE` lần (và thêm cả hệ số tốc độ 1×/2×/4×),
 * nên nếu lấy mốc thời gian game thì 30 "phút game" chỉ tương đương ~30 giây thực ở tốc 1×
 * và ~7 giây ở tốc 4× — popup hiện liên tục. Đặt theo `Date.now()` để tần xuất ổn định.
 */
const SITUATION_MIN_MINUTES = 26; // chế độ thường
const SITUATION_RANGE_MINUTES = 9; // +0–9 phút → trung bình ~30 phút
const SITUATION_HARDCORE_MIN = 18;
const SITUATION_HARDCORE_RANGE = 8;

/** Khoảng cách đến tình huống tiếp theo, tính bằng mili-giây thực. */
const situationDelayMs = (hardcore: boolean): number =>
  ((hardcore ? SITUATION_HARDCORE_MIN : SITUATION_MIN_MINUTES) + Math.random() * (hardcore ? SITUATION_HARDCORE_RANGE : SITUATION_RANGE_MINUTES)) * 60000;

/** Mốc thời gian hợp lệ của đồng hồ thực — dùng để nhận ra bản lưu cũ đang để mốc giờ game. */
const MIN_WALL_CLOCK = Date.UTC(2020, 0, 1);

const isWallClock = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > MIN_WALL_CLOCK;

const createTransaction = (
  type: Transaction['type'],
  amount: number,
  note: string,
  category: Transaction['category'] = 'other'
): Transaction => ({
  id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  at: Date.now(),
  type,
  amount,
  note,
  category,
  updatedAt: Date.now(),
  version: 1,
});

const createNotice = (
  text: string,
  type: 'info' | 'warn' | 'success' = 'info'
) => ({
  id: `nt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  text,
  time: Date.now(),
  unread: true,
  type,
});

/**
 * 1. Khởi tạo hãng hàng không mới qua Onboarding
 */
export function createAirline(
  state: GameState,
  input: {
    name: string;
    color: string;
    icon: string;
    base: string;
    difficulty: 'de' | 'thuong' | 'kho';
  },
  allAirports: Airport[]
): GameState {
  const initialCapital =
    input.difficulty === 'de'
      ? 15000000
      : input.difficulty === 'kho'
      ? 6000000
      : 10000000;

  const newAirline: Airline = {
    name: input.name.trim(),
    logoColor: input.color,
    logoIcon: input.icon,
    baseAirport: input.base,
    cash: initialCapital,
    level: 1,
    xp: 0,
    difficulty: input.difficulty,
    createdAt: Date.now(),
    lastTickAt: Date.now(),
    ipoShares: 0,
    lifetimeFlights: 0,
    lifetimePassengers: 0,
    autoManage: false,
      reputation: 70,
      hardcore: false,
      inviteCode: `VNA${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      updatedAt: Date.now(),
      version: 1,
  };

  const initializedAirports = allAirports.map((a) => ({
    ...a,
    slotsUsed: a.code === input.base ? 1 : 0,
    updatedAt: Date.now(),
    version: (a.version || 0) + 1,
  }));

  const initialTx = createTransaction(
    'Vốn khởi nghiệp',
    initialCapital,
    `Thành lập hãng hàng không ${newAirline.name} tại căn cứ ${input.base}`,
    'asset'
  );

  return {
    ...state,
    airline: newAirline,
    airports: initializedAirports,
    transactions: [initialTx],
    notices: [
      createNotice(
        `Chào mừng bạn đến với ngành hàng không! Hãng ${newAirline.name} đã sẵn sàng cất cánh.`,
        'success'
      ),
    ],
    timeSpeed: 1,
    gameTimeMs: 0,
    flights: [],
    nextFlightNumber: 128,
    streak: 0,
    goldenHour: null,
    goldenHourNextAt: 7.5 * 3600000,
    activityLog: [{ id: `activity-${Date.now()}`, at: Date.now(), kind: 'achievement', text: `Hãng ${newAirline.name} chính thức cất cánh.` }],
    milestones: milestoneTemplates.map((m) => ({ ...m, updatedAt: Date.now(), version: 1 })),
    cashHistory: [{ at: Date.now(), cash: initialCapital }],
    ipoCount: 0,
    pendingIpo: null,
    pendingMilestone: null,
    xpProfitRemainder: 0,
    researchProfitRemainder: 0,
    lastCostTransactionAt: Date.now(),
    pendingOperatingCost: 0,
    situationNextAt: Date.now() + situationDelayMs(false),
    competitorPriceAt: 6 * 3600000,
    missions: [...starterMissions.map((m) => ({ ...m })), ...dailyMissions.map((m) => ({ ...m }))],
    lastDailyReset: dayId(),
    lastLoginDate: dayId(),
    loginClaimedDate: '',
    loginStreak: 1,
    weeklySeason: { id: weekId(), quests: rollWeeklyQuests(weekId()) },
    streakShield: true,
    streakBest: 0,
  };
}

/**
 * 2. Mua máy bay mới vào đội bay
 */
export function buyPlane(state: GameState, catalogPlane: Plane): GameState {
  if (!state.airline || state.airline.cash < catalogPlane.price) return state;

  const planeCount = state.planes.length + 1;
  const newPlane: Plane = {
    ...catalogPlane,
    id: `plane-owned-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `${catalogPlane.model} #${planeCount}`,
    wear: 0,
    totalFlightHours: 0,
    updatedAt: Date.now(),
    version: 1,
  };

  // Cập nhật nhiệm vụ mua máy bay
  const missions = state.missions.map((m) => {
    if (m.id === 'starter-1-buy-plane') {
      return { ...m, progress: Math.max(m.progress, 1) };
    }
    return m;
  });

  const tx = createTransaction(
    'Mua máy bay',
    -catalogPlane.price,
    `Gia nhập đội bay: ${newPlane.name}`,
    'asset'
  );

  const notices = [
    createNotice(`Đã bàn giao thành công tàu bay ${newPlane.name}!`, 'success'),
    ...state.notices,
  ].slice(0, 50);

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash - catalogPlane.price,
    },
    planes: [...state.planes, newPlane],
    missions,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices,
  };
}

/**
 * 3. Bán máy bay (thu hồi 70% giá trị sau khấu hao hao mòn)
 */
export function sellPlane(state: GameState, planeId: string): GameState {
  if (!state.airline) return state;
  const plane = state.planes.find((p) => p.id === planeId);
  if (!plane) return state;

  const resaleAmount = getPlaneResaleValue(plane);

  // Đóng hoặc tạm dừng đường bay đang gán máy bay này nếu có
  let updatedAirports = [...state.airports];
  const updatedRoutes = state.routes.filter((r) => {
    if (r.planeId === planeId) {
      // Hoàn trả slot sân bay
      updatedAirports = updatedAirports.map((a) =>
        a.code === r.from || a.code === r.to
          ? { ...a, slotsUsed: Math.max(0, a.slotsUsed - 1) }
          : a
      );
      return false;
    }
    return true;
  });

  const tx = createTransaction(
    'Bán máy bay',
    resaleAmount,
    `Thanh lý ${plane.name || plane.model} thu hồi vốn`,
    'asset'
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash + resaleAmount,
    },
    planes: state.planes.filter((p) => p.id !== planeId),
    routes: updatedRoutes,
    airports: updatedAirports,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(
        `Đã chuyển nhượng tàu bay ${plane.name || plane.model}, thu hồi ${resaleAmount.toLocaleString('vi-VN')} $.`,
        'info'
      ),
      ...state.notices,
    ],
  };
}

/**
 * 4. Đổi tên máy bay
 */
export function renamePlane(state: GameState, planeId: string, newName: string): GameState {
  if (!newName.trim()) return state;
  return {
    ...state,
    planes: state.planes.map((p) =>
      p.id === planeId ? { ...p, name: newName.trim() } : p
    ),
  };
}

/**
 * 5. Nâng cấp máy bay (Khoang thương gia hoặc Winglets)
 */
export function upgradePlane(
  state: GameState,
  planeId: string,
  upgradeType: 'businessClass' | 'winglets'
): GameState {
  if (!state.airline) return state;
  const plane = state.planes.find((p) => p.id === planeId);
  if (!plane) return state;

  const cost =
    upgradeType === 'businessClass'
      ? Math.round(plane.price * 0.05) // 5% giá máy bay
      : Math.round(plane.price * 0.035); // 3.5% giá máy bay

  if (state.airline.cash < cost) return state;

  const updatedPlane = {
    ...plane,
    businessClass: upgradeType === 'businessClass' ? true : plane.businessClass,
    winglets: upgradeType === 'winglets' ? true : plane.winglets,
  };

  const tx = createTransaction(
    'Nâng cấp',
    -cost,
    `Nâng cấp ${upgradeType === 'businessClass' ? 'ghế hạng Thương gia' : 'cánh phụ Winglets'} cho ${plane.name}`,
    'maintenance'
  );

  // Cập nhật nhiệm vụ nâng cấp
  const missions = state.missions.map((m) =>
    m.id === 'starter-5-upgrade-plane' ? { ...m, progress: 1 } : m
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash - cost,
    },
    planes: state.planes.map((p) => (p.id === planeId ? updatedPlane : p)),
    missions,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(
        `Nâng cấp ${upgradeType === 'businessClass' ? 'Khoang Thương gia (+15% doanh thu)' : 'Winglets (-8% nhiên liệu)'} hoàn tất cho ${plane.name}.`,
        'success'
      ),
      ...state.notices,
    ],
  };
}

/**
 * 6. Bảo trì máy bay: reset hao mòn về 0%
 */
export function servicePlane(state: GameState, planeId: string): GameState {
  if (!state.airline) return state;
  const plane = state.planes.find((p) => p.id === planeId);
  if (!plane) return state;

  const cost = getMaintenanceCost(plane, state.research.maintenance);
  if (state.airline.cash < cost) return state;

  const tx = createTransaction(
    'Bảo trì',
    -cost,
    `Bảo dưỡng định kỳ đưa ${plane.name || plane.model} về trạng thái tối ưu`,
    'maintenance'
  );

  const missions = state.missions.map((m) => {
    if (m.id === 'daily-maintenance') { const p = m.progress + 1; return { ...m, progress: p, done: m.done || p >= m.target }; }
    return m;
  });
  const weeklySeason = state.weeklySeason ? {
    ...state.weeklySeason,
    quests: state.weeklySeason.quests.map((q) => {
      if (q.id === 'weekly-maintain-10') { const p = q.progress + 1; return { ...q, progress: p, done: q.done || p >= q.target }; }
      return q;
    }),
  } : state.weeklySeason;

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash - cost,
    },
    planes: state.planes.map((p) => (p.id === planeId ? { ...p, wear: 0 } : p)),
    missions,
    weeklySeason,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(
        `Bảo trì kỹ thuật thành công cho ${plane.name || plane.model}. Độ hao mòn trở về 0%.`,
        'success'
      ),
      ...state.notices,
    ],
  };
}

/**
 * 7. Mở đường bay mới
 */
export function openRoute(
  state: GameState,
  input: {
    from: string;
    to: string;
    planeId: string;
    ticketPrice: number;
    frequencyPerWeek: number;
  }
): GameState {
  if (!state.airline) return state;

  const fromAirport = state.airports.find((a) => a.code === input.from);
  const toAirport = state.airports.find((a) => a.code === input.to);
  const plane = state.planes.find((p) => p.id === input.planeId);

  if (!fromAirport || !toAirport || !plane) return state;
  const unlockAt = (code: string) => ['BKK','SIN','KUL','MNL','CGK','DPS','HKT','PNH','VTE','RGN','BWN','REP'].includes(code) ? 5 : ['NRT','ICN','TPE','HKG','PVG','PEK','KIX','FUK','GMP','CAN'].includes(code) ? 10 : ['LHR','CDG','FRA','DXB','SYD','LAX','AMS','MAD','YYZ','GRU'].includes(code) ? 15 : 1;
  if (Math.max(unlockAt(fromAirport.code), unlockAt(toAirport.code)) > state.airline.level) return { ...state, notices: [createNotice(`Sân bay này sẽ mở theo khu vực ở cấp ${Math.max(unlockAt(fromAirport.code), unlockAt(toAirport.code))}.`, 'warn'), ...state.notices] };
  if (fromAirport.code === toAirport.code) return state;
  if (fromAirport.slotsUsed >= fromAirport.slots || toAirport.slotsUsed >= toAirport.slots)
    return state;

  const distance = distanceKm(fromAirport, toAirport);
  if (distance > plane.rangeKm) return state;
  if (distance > 4000 && !isWideBody(plane)) return { ...state, notices: [createNotice('Chặng trên 4.000 km cần máy bay thân rộng như A330, A350, B787 hoặc B777.', 'warn'), ...state.notices] };

  // Đối thủ AI ngẫu nhiên cạnh tranh trên tuyến (1 đến 3 hãng)
  const competition = 1 + (Math.floor((fromAirport.demand + toAirport.demand) / 8) % 3);

  const baseAirports = [state.airline.baseAirport];
  if (state.airline.secondBaseAirport) {
    baseAirports.push(state.airline.secondBaseAirport);
  }

  const econ = routeEconomics(
    { ...input, competition },
    plane,
    fromAirport,
    toAirport,
    {
      baseAirports,
      fuelSaveBonus: (state.research.fuel || 0) * 0.025,
      serviceBonus: 1 + (state.research.service || 0) * 0.04,
      crewCostPerHour: state.staff.reduce((s, x) => s + x.salaryPerHour, 0),
      loanInterestPerHour: (state.loan * 0.05) / 24,
      reputation: state.airline.reputation ?? 70,
      international: fromAirport.country !== 'Việt Nam' || toAirport.country !== 'Việt Nam',
      fuelMultiplier: state.currentEvent?.fuelMultiplier ?? 1,
      demandMultiplier: state.currentEvent?.demandMultiplier ?? 1,
      isStormAffected: state.currentEvent?.affectedAirports?.includes(fromAirport.code) ||
        state.currentEvent?.affectedAirports?.includes(toAirport.code),
    }
  );

  const newRoute: Route = {
    id: `route-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    from: input.from,
    to: input.to,
    planeId: input.planeId,
    ticketPrice: input.ticketPrice,
    frequencyPerWeek: input.frequencyPerWeek,
    active: true,
    profitPerHour: econ.profitPerHour,
    revenuePerHour: econ.revenuePerHour,
    costPerHour: econ.costPerHour,
    loadFactor: econ.loadFactor,
    flightHours: econ.flightHours,
    competition,
    competitorTicketPrice: Math.round(input.ticketPrice * (0.88 + Math.random() * 0.24)),
    updatedAt: Date.now(),
    version: 1,
    nextDepartureAt: state.gameTimeMs ?? 0,
  };

  // Chiếm 1 slot ở mỗi đầu sân bay
  const updatedAirports = state.airports.map((a) =>
    a.code === input.from || a.code === input.to
      ? { ...a, slotsUsed: a.slotsUsed + 1 }
      : a
  );

  // Cập nhật nhiệm vụ mở đường bay
  const nextRoutesCount = state.routes.length + 1;
  const missions = state.missions.map((m) => {
    if (m.id === 'starter-2-first-route') return { ...m, progress: 1 };
    if (m.id === 'starter-6-three-routes') return { ...m, progress: nextRoutesCount };
    return m;
  });

  const tx = createTransaction(
    'Mở đường bay',
    0,
    `Khai trương đường bay ${fromAirport.city} (${fromAirport.code}) ⟷ ${toAirport.city} (${toAirport.code})`,
    'other'
  );

  return {
    ...state,
    routes: [...state.routes, newRoute],
    redPriceSince: input.ticketPrice / basePrice(distance) > 1.5 ? { ...(state.redPriceSince||{}), [newRoute.id]: state.gameTimeMs ?? 0 } : state.redPriceSince,
    greenPriceSince: input.ticketPrice / basePrice(distance) <= 1 ? { ...(state.greenPriceSince||{}), [newRoute.id]: state.gameTimeMs ?? 0 } : state.greenPriceSince,
    airports: updatedAirports,
    missions,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(
        `Khai trương đường bay mới ${fromAirport.code} ⟷ ${toAirport.code}! Lợi nhuận dự kiến: ${econ.profitPerHour.toLocaleString('vi-VN')} $/giờ.`,
        'success'
      ),
      ...state.notices,
    ],
  };
}

/**
 * 8. Cập nhật đường bay (Giá vé, tần suất, đổi máy bay)
 */
export function updateRoute(
  state: GameState,
  routeId: string,
  updates: Partial<Pick<Route, 'ticketPrice' | 'frequencyPerWeek' | 'planeId' | 'active'>>
): GameState {
  if (!state.airline) return state;

  const route = state.routes.find((r) => r.id === routeId);
  if (!route) return state;

  const targetPlaneId = updates.planeId || route.planeId;
  const targetPrice = updates.ticketPrice ?? route.ticketPrice;
  const targetFreq = updates.frequencyPerWeek ?? route.frequencyPerWeek;

  const plane = state.planes.find((p) => p.id === targetPlaneId);
  const fromAirport = state.airports.find((a) => a.code === route.from);
  const toAirport = state.airports.find((a) => a.code === route.to);

  if (!plane || !fromAirport || !toAirport) return state;

  const baseAirports = [state.airline.baseAirport];
  if (state.airline.secondBaseAirport) {
    baseAirports.push(state.airline.secondBaseAirport);
  }

  const econ = routeEconomics(
    {
      from: route.from,
      to: route.to,
      ticketPrice: targetPrice,
      frequencyPerWeek: targetFreq,
      competition: route.competition,
    },
    plane,
    fromAirport,
    toAirport,
    {
      baseAirports,
      fuelSaveBonus: (state.research.fuel || 0) * 0.025,
      serviceBonus: 1 + (state.research.service || 0) * 0.04,
      crewCostPerHour: state.staff.reduce((s, x) => s + x.salaryPerHour, 0),
      loanInterestPerHour: (state.loan * 0.05) / 24,
      reputation: state.airline.reputation ?? 70,
      international: fromAirport.country !== 'Việt Nam' || toAirport.country !== 'Việt Nam',
    }
  );

  const updatedRoutes = state.routes.map((r) =>
    r.id === routeId
      ? {
          ...r,
          ...updates,
          profitPerHour: econ.profitPerHour,
          revenuePerHour: econ.revenuePerHour,
          costPerHour: econ.costPerHour,
          loadFactor: econ.loadFactor,
          flightHours: econ.flightHours,
          updatedAt: Date.now(),
          version: (r.version || 1) + 1,
        }
      : r
  );

  return {
    ...state,
    routes: updatedRoutes,
    redPriceSince: { ...(state.redPriceSince||{}), [routeId]: targetPrice / basePrice(distanceKm(fromAirport,toAirport)) > 1.5 ? ((state.redPriceSince||{})[routeId] ?? state.gameTimeMs ?? 0) : 0 },
    greenPriceSince: { ...(state.greenPriceSince||{}), [routeId]: targetPrice / basePrice(distanceKm(fromAirport,toAirport)) <= 1 ? ((state.greenPriceSince||{})[routeId] ?? state.gameTimeMs ?? 0) : 0 },
    notices: [
      createNotice(`Đã tối ưu hóa thông số đường bay ${route.from} ⟷ ${route.to}.`, 'info'),
      ...state.notices,
    ],
  };
}

/**
 * 9. Đóng đường bay (giải phóng slot sân bay)
 */
export function closeRoute(state: GameState, routeId: string): GameState {
  const route = state.routes.find((r) => r.id === routeId);
  if (!route) return state;

  const updatedAirports = state.airports.map((a) =>
    a.code === route.from || a.code === route.to
      ? { ...a, slotsUsed: Math.max(0, a.slotsUsed - 1) }
      : a
  );

  return {
    ...state,
    routes: state.routes.filter((r) => r.id !== routeId),
    airports: updatedAirports,
    notices: [
      createNotice(`Đã ngừng khai thác và giải phóng slot tuyến ${route.from} ⟷ ${route.to}.`, 'info'),
      ...state.notices,
    ],
  };
}

/**
 * 10. Mua thêm slot tại sân bay
 */
export function buyAirportSlot(state: GameState, airportCode: string): GameState {
  if (!state.airline) return state;
  const unlockAt = (code: string) => ['BKK','SIN','KUL','MNL','CGK','DPS','HKT','PNH','VTE','RGN','BWN','REP'].includes(code) ? 5 : ['NRT','ICN','TPE','HKG','PVG','PEK','KIX','FUK','GMP','CAN'].includes(code) ? 10 : ['LHR','CDG','FRA','DXB','SYD','LAX','AMS','MAD','YYZ','GRU'].includes(code) ? 15 : 1;
  if (unlockAt(airportCode) > state.airline.level) return { ...state, notices: [createNotice(`Khu vực sân bay này mở khóa ở cấp ${unlockAt(airportCode)}.`, 'warn'), ...state.notices] };
  const cost = 50000;
  if (state.airline.cash < cost) return state;

  const airport = state.airports.find((a) => a.code === airportCode);
  if (!airport) return state;

  const updatedAirports = state.airports.map((a) =>
    a.code === airportCode ? { ...a, slots: a.slots + 1 } : a
  );

  const tx = createTransaction(
    'Slot sân bay',
    -cost,
    `Mua thêm slot khai thác tại sân bay ${airport.city} (${airportCode})`,
    'airport'
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash - cost,
    },
    airports: updatedAirports,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(`Đã mua thêm 1 slot thành công tại sân bay ${airportCode}!`, 'success'),
      ...state.notices,
    ],
  };
}

/**
 * 11. Mở căn cứ thứ 2 (Level 10+, phí 5.000.000 $)
 */
export function unlockSecondBase(state: GameState, airportCode: string): GameState {
  if (!state.airline || state.airline.level < 10) return state;
  const cost = 5000000;
  if (state.airline.cash < cost) return state;

  const airport = state.airports.find((a) => a.code === airportCode);
  if (!airport || airport.code === state.airline.baseAirport) return state;

  const tx = createTransaction(
    'Căn cứ thứ 2',
    -cost,
    `Thiết lập căn cứ trung tâm thứ hai tại ${airport.city} (${airportCode})`,
    'airport'
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash - cost,
      secondBaseAirport: airportCode,
    },
    airports: state.airports.map((a) =>
      a.code === airportCode ? { ...a, isSecondBase: true } : a
    ),
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(
        `Chúc mừng! Căn cứ thứ hai đã chính thức đi vào hoạt động tại ${airport.name}! Giảm 20% phí hạ cánh.`,
        'success'
      ),
      ...state.notices,
    ],
  };
}

/**
 * 11b. Mở sân bay mới do người chơi tự đặt vị trí trên bản đồ.
 * Phí khảo sát và xây dựng càng đắt khi sân bay càng xa VN.
 */
const AIRPORT_BUILD_COST = (region: string): number => {
  if (region === 'Việt Nam') return 400000;
  if (region === 'Đông Nam Á') return 900000;
  if (region === 'Đông Á') return 1800000;
  return 2800000;
};

export function createAirportFromDraft(state: GameState, draft: AirportDraft): GameState {
  if (!state.airline) return state;
  if (state.airports.some((a) => a.code === draft.code)) {
    return { ...state, notices: [createNotice(`Mã sân bay ${draft.code} đã tồn tại.`, 'warn'), ...state.notices] };
  }

  const cost = AIRPORT_BUILD_COST(draft.region);
  if (state.airline.cash < cost) {
    return { ...state, notices: [createNotice(`Cần ${cost.toLocaleString('vi-VN')} $ để xây dựng sân bay này.`, 'warn'), ...state.notices] };
  }

  const airport: Airport = {
    code: draft.code,
    name: draft.name,
    city: draft.city,
    country: draft.country,
    landingFee: draft.landingFee,
    demand: draft.demand,
    slots: draft.demand >= 8 ? 6 : 5,
    slotsUsed: 0,
    lat: draft.lat,
    lon: draft.lng,
    updatedAt: Date.now(),
    version: 1,
  };

  const tx = createTransaction(
    'Mở sân bay',
    -cost,
    `Khảo sát và xây dựng sân bay ${draft.city} (${draft.code})`,
    'airport'
  );

  return {
    ...state,
    airline: { ...state.airline, cash: state.airline.cash - cost },
    airports: [...state.airports, airport],
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(`Sân bay ${draft.code} (${draft.city}) đã đi vào hoạt động.`, 'success'),
      ...state.notices,
    ],
  };
}

/**
 * 12. Quản lý nhân sự: Thuê, sa thải, đào tạo
 */
export function hireStaff(state: GameState, candidate: Staff): GameState {
  const newStaff = {
    ...candidate,
    id: `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  const nextCount = state.staff.length + 1;
  const missions = state.missions.map((m) =>
    m.id === 'starter-3-hire-staff' ? { ...m, progress: Math.min(3, nextCount) } : m
  );

  return {
    ...state,
    staff: [...state.staff, newStaff],
    missions,
    notices: [
      createNotice(`Đã ký hợp đồng với ${newStaff.role} ${newStaff.name} (${newStaff.skill}⭐).`, 'info'),
      ...state.notices,
    ],
  };
}

export function fireStaff(state: GameState, staffId: string): GameState {
  const staffMember = state.staff.find((s) => s.id === staffId);
  return {
    ...state,
    staff: state.staff.filter((s) => s.id !== staffId),
    notices: [
      createNotice(
        `Đã chấm dứt hợp đồng lao động với ${staffMember?.role} ${staffMember?.name}.`,
        'info'
      ),
      ...state.notices,
    ],
  };
}

export function trainStaff(state: GameState, staffId: string): GameState {
  if (!state.airline) return state;
  const member = state.staff.find((s) => s.id === staffId);
  if (!member || member.skill >= 5) return state;

  const cost = member.skill * 15000;
  if (state.airline.cash < cost) return state;

  const tx = createTransaction(
    'Lương nhân sự',
    -cost,
    `Đào tạo chuyên môn nâng sao cho ${member.name}`,
    'salary'
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash - cost,
    },
    staff: state.staff.map((s) =>
      s.id === staffId
        ? {
            ...s,
            skill: s.skill + 1,
            salaryPerHour: Math.round(s.salaryPerHour * 1.25),
            morale: Math.min(100, s.morale + 10),
          }
        : s
    ),
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(`${member.name} đã hoàn tất khóa đào tạo, đạt trình độ ${member.skill + 1}⭐!`, 'success'),
      ...state.notices,
    ],
  };
}

/**
 * 13. Vay và trả nợ ngân hàng
 */
export function borrowLoan(state: GameState, amount: number): GameState {
  if (!state.airline || amount <= 0) return state;
  const val = airlineValue(state.airline.cash, state.planes, state.airports);
  const maxBorrow = Math.max(0, Math.floor(val * 0.5) - state.loan);
  const borrowAmt = Math.min(amount, maxBorrow);

  if (borrowAmt <= 0) return state;

  const tx = createTransaction(
    'Vay ngân hàng',
    borrowAmt,
    `Giải ngân khoản vay thương mại lãi suất 5%/ngày`,
    'loan'
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash + borrowAmt,
    },
    loan: state.loan + borrowAmt,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(`Giải ngân thành công ${borrowAmt.toLocaleString('vi-VN')} $ từ Ngân hàng.`, 'info'),
      ...state.notices,
    ],
  };
}

export function repayLoan(state: GameState, amount: number): GameState {
  if (!state.airline || amount <= 0 || state.loan <= 0) return state;
  const repayAmt = Math.min(amount, state.loan, state.airline.cash);
  if (repayAmt <= 0) return state;

  const tx = createTransaction(
    'Trả nợ',
    -repayAmt,
    `Thanh toán nợ gốc ngân hàng`,
    'loan'
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash - repayAmt,
    },
    loan: state.loan - repayAmt,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(`Đã tất toán ${repayAmt.toLocaleString('vi-VN')} $ tiền nợ ngân hàng.`, 'success'),
      ...state.notices,
    ],
  };
}

/**
 * 14. Nâng cấp cây nghiên cứu (Tech tree)
 */
export function upgradeResearch(
  state: GameState,
  branchId: 'fuel' | 'service' | 'maintenance'
): GameState {
  const currentLvl = state.research[branchId] || 0;
  if (currentLvl >= 5) return state;
  const requiredPoints = currentLvl + 1;
  if (state.researchPoints < requiredPoints) return state;

  const branchNames = {
    fuel: 'Tiết kiệm nhiên liệu',
    service: 'Dịch vụ khách hàng',
    maintenance: 'Bảo trì thông minh',
  };

  return {
    ...state,
    researchPoints: state.researchPoints - requiredPoints,
    research: {
      ...state.research,
      [branchId]: currentLvl + 1,
    },
    notices: [
      createNotice(
        `Nâng cấp thành công nhánh "${branchNames[branchId]}" lên Cấp ${currentLvl + 1}!`,
        'success'
      ),
      ...state.notices,
    ],
  };
}

/**
 * 15. Kích hoạt và giải quyết sự kiện ngẫu nhiên
 */
export function triggerRandomEvent(state: GameState, now = Date.now()): GameState {
  const template =
    randomEventTemplates[Math.floor(Math.random() * randomEventTemplates.length)];

  const event: GameEvent = {
    id: `event-${now}`,
    at: now,
    kind: template.kind,
    title: template.title,
    description: template.description,
    effectLabel: template.effectLabel,
    fuelMultiplier: template.fuelMultiplier,
    demandMultiplier: template.demandMultiplier,
    affectedAirports: template.affectedAirports,
    expiresAt: (state.gameTimeMs || 0) + 60 * 60 * 1000, // 1 giờ game
    resolved: false,
  };

  // Nếu là đợt kiểm tra an toàn và có máy bay hao mòn > 80%, phạt ngay
  let penaltyAmount = 0;
  if (template.kind === 'inspection' && state.airline) {
    const dangerousPlanes = state.planes.filter((p) => p.wear > 80);
    if (dangerousPlanes.length > 0) {
      penaltyAmount = dangerousPlanes.length * 150000;
    }
  }

  const updatedCash = state.airline ? state.airline.cash - penaltyAmount : 0;
  const penaltyTx =
    penaltyAmount > 0
      ? [
          createTransaction(
            'Sự kiện',
            -penaltyAmount,
            `Phạt an toàn hàng không: có máy bay hao mòn > 80%`,
            'other'
          ),
        ]
      : [];

  return {
    ...state,
    airline: state.airline ? { ...state.airline, cash: updatedCash } : null,
    currentEvent: event,
    eventHistory: [event, ...state.eventHistory].slice(0, 20),
    transactions: [...penaltyTx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(
        `[Sự kiện] ${event.title}: ${penaltyAmount > 0 ? `Bị phạt ${penaltyAmount.toLocaleString('vi-VN')} $ do hao mòn cao.` : event.effectLabel}`,
        penaltyAmount > 0 ? 'warn' : 'info'
      ),
      ...state.notices,
    ],
  };
}

export function dismissEvent(state: GameState): GameState {
  if (!state.currentEvent) return state;
  return {
    ...state,
    currentEvent: null,
  };
}

/**
 * 16. Nhận thưởng nhiệm vụ
 */
export function claimMissionReward(state: GameState, missionId: string): GameState {
  if (!state.airline) return state;
  const weekly = state.weeklySeason?.quests.find((m) => m.id === missionId);
  if (weekly) {
    if (!weekly.done || weekly.reward <= 0) return state;
    const rewardXp = weekly.rewardXp || Math.round(weekly.reward / 10000);
    const tx = createTransaction('Nhiệm vụ', weekly.reward, `Thưởng nhiệm vụ tuần: ${weekly.title}`, 'other');
    return {
      ...state,
      airline: { ...state.airline, cash: state.airline.cash + weekly.reward, xp: state.airline.xp + rewardXp },
      weeklySeason: state.weeklySeason ? { ...state.weeklySeason, quests: state.weeklySeason.quests.map((m) => (m.id === missionId ? { ...m, reward: 0 } : m)) } : state.weeklySeason,
      transactions: [tx, ...state.transactions].slice(0, 300),
      notices: [createNotice(`Đã nhận phần thưởng tuần +${weekly.reward.toLocaleString('vi-VN')} $ và +${rewardXp} XP từ "${weekly.title}"!`, 'success'), ...state.notices].slice(0, 50),
    };
  }
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission || !mission.done || mission.reward <= 0) return state;

  const rewardMoney = mission.reward;
  const rewardXp = mission.rewardXp || Math.round(rewardMoney / 10000);

  const tx = createTransaction(
    'Nhiệm vụ',
    rewardMoney,
    `Thưởng hoàn thành nhiệm vụ: ${mission.title}`,
    'other'
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash + rewardMoney,
      xp: state.airline.xp + rewardXp,
    },
    missions: state.missions.map((m) =>
      m.id === missionId ? { ...m, reward: 0 } : m
    ),
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(
        `Đã nhận phần thưởng +${rewardMoney.toLocaleString('vi-VN')} $ và +${rewardXp} XP từ "${mission.title}"!`,
        'success'
      ),
      ...state.notices,
    ],
  };
}

/** Một giây thực mô phỏng một phút game; doanh thu chỉ ghi nhận khi chuyến bay hạ cánh. */
export function checkDailyRollover(state: GameState, now = Date.now()): GameState {
  if (!state.airline) return state;
  const today = dayId(new Date(now));
  const currentWeek = weekId(new Date(now));
  let next: GameState = state;
  // Login streak: tăng nếu sang ngày mới, reset nếu cách >1 ngày.
  if ((state.lastLoginDate || '') !== today) {
    const prev = state.lastLoginDate ? new Date(state.lastLoginDate) : null;
    const cur = new Date(today);
    const diffDays = prev ? Math.round((cur.getTime() - prev.getTime()) / 86400000) : 1;
    const streak = diffDays === 1 ? (state.loginStreak || 0) + 1 : 1;
    next = { ...next, lastLoginDate: today, loginStreak: streak > 7 ? 1 + ((streak - 1) % 7) : streak, streakShield: true };
  }
  // Reset daily quest mỗi ngày thực.
  if ((state.lastDailyReset || '') !== today) {
    const freshDaily = dailyMissions.map((m) => ({ ...m, updatedAt: now, version: 1 }));
    const keepOthers = next.missions.filter((m) => m.category !== 'daily');
    next = { ...next, missions: [...keepOthers, ...freshDaily], lastDailyReset: today, streakShield: true };
  }
  // Roll mùa tuần mới Thứ 2.
  if ((next.weeklySeason?.id || '') !== currentWeek) {
    next = { ...next, weeklySeason: { id: currentWeek, quests: rollWeeklyQuests(currentWeek) } };
  }
  return next;
}

/** Điểm danh hàng ngày: nhận cash + XP, ngày 6 +1 research, ngày 7 tặng ATR 72. */
export function claimLoginReward(state: GameState, now = Date.now(), catalogAtr?: Plane): GameState {
  if (!state.airline) return state;
  const today = dayId(new Date(now));
  if (state.loginClaimedDate === today) return state;
  const streakDay = Math.min(7, Math.max(1, state.loginStreak || 1));
  const reward = LOGIN_REWARDS[streakDay - 1];
  if (!reward) return state;
  let planes = state.planes;
  let researchPoints = state.researchPoints;
  if (streakDay === 6) researchPoints += 1;
  if (reward.planeBonus && catalogAtr) {
    planes = [...planes, { ...catalogAtr, id: `login-atr-${now}`, name: 'ATR 72 Điểm danh', wear: 0, totalFlightHours: 0, updatedAt: now, version: 1 }];
  }
  const tx = createTransaction('Nhiệm vụ', reward.cash, `Điểm danh ngày ${streakDay}: ${reward.label}`, 'other');
  return {
    ...state,
    airline: { ...state.airline, cash: state.airline.cash + reward.cash, xp: state.airline.xp + reward.xp, updatedAt: now, version: (state.airline.version || 1) + 1 },
    planes,
    researchPoints,
    loginClaimedDate: today,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [createNotice(`Điểm danh ngày ${streakDay} thành công: +${reward.cash.toLocaleString('vi-VN')} $ +${reward.xp} XP${reward.planeBonus ? ' + ATR 72 miễn phí' : ''}!`, 'success'), ...state.notices].slice(0, 50),
  };
}

/** Nhận offline x2: tốn 50.000 $ marketing để cộng thêm đúng bằng lợi nhuận offline. */
export function claimOfflineDouble(state: GameState): GameState {
  if (!state.airline || !state.pendingOfflineSummary) return state;
  const cost = 50000;
  if (state.airline.cash < cost) return { ...state, notices: [createNotice(`Cần ${cost.toLocaleString('vi-VN')} $ để nhân đôi thưởng offline.`, 'warn'), ...state.notices] };
  const bonus = Math.max(0, Math.round(state.pendingOfflineSummary.totalProfit));
  if (bonus <= 0) return { ...state, pendingOfflineSummary: null };
  const txBonus = createTransaction('Khai thác', bonus, 'Thưởng offline x2 từ chiến dịch marketing', 'ticket');
  const txCost = createTransaction('Sự kiện', -cost, 'Chiến dịch marketing nhân đôi thưởng offline', 'other');
  return {
    ...state,
    airline: { ...state.airline, cash: state.airline.cash + bonus - cost, updatedAt: Date.now(), version: (state.airline.version || 1) + 1 },
    transactions: [txBonus, txCost, ...state.transactions].slice(0, 300),
    pendingOfflineSummary: null,
    notices: [createNotice(`Đã nhân đôi thưởng offline: +${bonus.toLocaleString('vi-VN')} $ (phí ${cost.toLocaleString('vi-VN')} $).`, 'success'), ...state.notices].slice(0, 50),
  };
}

export function tickGame(state: GameState, now = Date.now()): GameState {
  if (!state.airline) return state;
  state = checkDailyRollover(state, now);
  if (!state.airline) return state;
  const previousWallTime = state.airline.lastTickAt || now;
  const hardcore = state.hardcore ?? state.airline.hardcore ?? false;
  const loginBonusHours = (state.loginStreak || 0) >= 7 ? 2 : (state.loginStreak || 0) >= 3 ? 1 : 0;
  const baseBonusHours = state.airline.secondBaseAirport ? 2 : 0;
  const baseCapHours = hardcore ? 4 : 8;
  const maxOfflineMs = (baseCapHours + loginBonusHours + baseBonusHours) * 3600000;
  const elapsedRealMs = Math.min(maxOfflineMs, Math.max(0, now - previousWallTime));
  if (elapsedRealMs < 900) return state;

  const speed = state.timeSpeed || 1;
  const previousGameTime = state.gameTimeMs ?? 0;
  const gameDeltaMs = elapsedRealMs * TIME_SCALE * speed;
  const gameNow = previousGameTime + gameDeltaMs;
  const gameHours = gameDeltaMs / 3600000;
  const offline = elapsedRealMs >= 60000;
  const baseAirports = [state.airline.baseAirport, ...(state.airline.secondBaseAirport ? [state.airline.secondBaseAirport] : [])];
  let currentEvent = state.currentEvent && state.currentEvent.expiresAt > previousGameTime ? state.currentEvent : null;
  let routes = [...state.routes];
  if (state.airline.level >= 15 && state.airline.autoManage) {
    routes = routes.map((route) => {
      const from = state.airports.find((airport) => airport.code === route.from);
      const to = state.airports.find((airport) => airport.code === route.to);
      if (!from || !to) return route;
      const target = basePrice(distanceKm(from, to));
      return { ...route, ticketPrice: Math.round(route.ticketPrice + (target - route.ticketPrice) * 0.1) };
    });
  }

  const goldenStart = state.goldenHour?.startsAt ?? state.goldenHourNextAt ?? 7.5 * 3600000;
  let goldenHour = state.goldenHour && gameNow < state.goldenHour.endsAt ? state.goldenHour : null;
  let goldenHourNextAt = state.goldenHourNextAt ?? goldenStart;
  if (!goldenHour && previousGameTime < goldenHourNextAt && gameNow >= goldenHourNextAt) {
    goldenHour = { startsAt: goldenHourNextAt, endsAt: goldenHourNextAt + 3600000 };
    goldenHourNextAt += 12 * 3600000;
  }
  const isGolden = !!goldenHour && gameNow >= goldenHour.startsAt && gameNow < goldenHour.endsAt;
  const eventDemand = (currentEvent?.demandMultiplier ?? 1) * (isGolden ? 1.5 : 1) * (state.worldDemand ?? 1) * (state.marketingPenaltyUntil && state.marketingPenaltyUntil > gameNow ? 0.9 : 1);

  const econByRoute = new Map<string, ReturnType<typeof routeEconomics>>();
  const routeProfitPerHour = new Map<string, number>();
  let totalCost = 0;
  const wearByPlane = new Map<string, number>();
  const hoursByPlane = new Map<string, number>();
  const updatedRoutes = routes.map((route) => {
    if (!route.active) return route;
    const plane = state.planes.find((item) => item.id === route.planeId);
    const from = state.airports.find((item) => item.code === route.from);
    const to = state.airports.find((item) => item.code === route.to);
    if (!plane || !from || !to) return route;
    const arrivalLocalHour = ((gameNow / 3600000 + to.lon / 15 + distanceKm(from, to) / plane.speedKmh) % 24 + 24) % 24;
    const international = from.country !== 'Việt Nam' || to.country !== 'Việt Nam';
    const econ = routeEconomics(route, plane, from, to, {
      baseAirports,
      fuelSaveBonus: (state.research.fuel || 0) * 0.025,
      serviceBonus: 1 + (state.research.service || 0) * 0.04,
      crewCostPerHour: state.staff.reduce((sum, member) => sum + member.salaryPerHour, 0),
      loanInterestPerHour: (state.loan * 0.05) / 24,
      reputation: state.airline?.reputation ?? 70,
      routeDemandBonus: route.goodPriceBonus ? 1.03 : 1,
      international,
      internationalNight: international && arrivalLocalHour < 5,
      fuelMultiplier: currentEvent?.fuelMultiplier ?? 1,
      demandMultiplier: eventDemand,
      isStormAffected: currentEvent?.affectedAirports?.includes(from.code) || currentEvent?.affectedAirports?.includes(to.code),
    });
    econByRoute.set(route.id, econ);
    routeProfitPerHour.set(route.id, econ.profitPerHour);
    totalCost += econ.costPerHour * gameHours;
    return { ...route, profitPerHour: econ.profitPerHour, revenuePerHour: econ.revenuePerHour, costPerHour: econ.costPerHour, loadFactor: econ.loadFactor, flightHours: econ.flightHours, updatedAt: now, version: (route.version || 1) + 1 };
  });

  // Lịch khởi hành chạy theo giờ game; một máy bay không thể có hai chuyến cùng lúc.
  const flights: Flight[] = [...(state.flights || [])];
  const busyUntil = new Map<string, number>();
  flights.forEach((flight) => busyUntil.set(flight.planeId, Math.max(busyUntil.get(flight.planeId) || 0, flight.arrivesAt)));
  const activity: ActivityItem[] = [...(state.activityLog || [])];
  const addActivity = (item: ActivityItem) => { activity.unshift({ ...item, updatedAt: now, version: 1 }); };
  let streak = state.streak || 0;
  let streakShield = state.streakShield ?? true;
  let streakBest = state.streakBest || 0;
  let flightNumber = state.nextFlightNumber || 128;
  const routeDepartures = new Map<string, number>();
  for (const route of updatedRoutes) {
    if (!route.active) continue;
    const plane = state.planes.find((item) => item.id === route.planeId);
    const econ = econByRoute.get(route.id);
    if (!plane || !econ) continue;
    const interval = (168 / Math.max(1, route.frequencyPerWeek)) * 3600000;
    let departureAt = route.nextDepartureAt ?? previousGameTime;
    let count = 0;
    while (departureAt <= gameNow && count < 64) {
      departureAt = Math.max(departureAt, busyUntil.get(plane.id) || 0);
      if (departureAt > gameNow) break;
      const plannedDuration = (econ.flightHours + 0.5) * 3600000;
      const delayed = plane.wear > 80 ? Math.random() < 0.18 : Math.random() < 0.015;
      if (delayed && streakShield && streak >= 5) {
        streak = Math.floor(streak / 2);
        streakShield = false;
      } else if (delayed) streak = 0;
      const delayMs = delayed ? (15 + Math.random() * 30) * 60000 : 0;
      const passengers = Math.max(0, Math.round(plane.capacity * econ.loadFactor));
      const gross = route.ticketPrice * passengers * (plane.businessClass ? 1.15 : 1) * (currentEvent?.affectedAirports?.some((code) => code === route.from || code === route.to) ? 0.5 : 1);
      const flight: Flight = {
        id: `flight-${flightNumber}-${Math.round(departureAt)}`,
        code: `VN${flightNumber}`,
        routeId: route.id,
        from: route.from,
        to: route.to,
        planeId: plane.id,
        departedAt: departureAt,
        arrivesAt: departureAt + plannedDuration + delayMs,
        plannedArrivesAt: departureAt + plannedDuration,
        payout: gross,
        passengers,
        delayed,
        progress: 0,
        updatedAt: now,
        version: 1,
      };
      flightNumber += 1;
      flights.push(flight);
      busyUntil.set(plane.id, flight.arrivesAt + 30 * 60000);
      departureAt += interval;
      addActivity({ id: `activity-${flight.id}`, at: now, kind: 'takeoff', text: `${flight.code} cất cánh: ${route.from} → ${route.to}.` });
      count += 1;
    }
    routeDepartures.set(route.id, departureAt);
  }

  // Hao mòn chỉ tăng trong thời gian máy bay thực sự ở trên không, kể cả khi mô phỏng bù offline.
  for (const flight of flights) {
    const econ = econByRoute.get(flight.routeId);
    if (!econ) continue;
    const flightEnd = Math.min(gameNow, flight.departedAt + econ.flightHours * 3600000);
    const flyingHours = Math.max(0, flightEnd - Math.max(previousGameTime, flight.departedAt)) / 3600000;
    if (flyingHours > 0) {
      wearByPlane.set(flight.planeId, (wearByPlane.get(flight.planeId) || 0) + flyingHours * 0.8);
      hoursByPlane.set(flight.planeId, (hoursByPlane.get(flight.planeId) || 0) + flyingHours);
    }
  }

  let revenue = 0;
  let landedPassengers = 0;
  const landingNotices: GameState['notices'] = [];
  const landingPayouts = new Map<string, number>();
  const landed = flights.filter((flight) => flight.arrivesAt <= gameNow).sort((a, b) => a.arrivesAt - b.arrivesAt);
  const landedIds = new Set(landed.map((flight) => flight.id));
  for (const flight of landed) {
    const onTime = !flight.delayed && flight.arrivesAt <= flight.plannedArrivesAt;
    if (onTime) streak += 1;
    else if (streakShield && streak >= 5) { streak = Math.floor(streak / 2); streakShield = false; }
    else streak = 0;
    streakBest = Math.max(streakBest, streak);
    const streakBonus = 1 + Math.min(0.2, Math.floor(streak / 5) * 0.02);
    const payout = flight.payout * streakBonus * (1 + (state.airline.ipoShares || 0) * 0.08);
    revenue += payout;
    landingPayouts.set(flight.id, payout);
    landedPassengers += flight.passengers;
    addActivity({ id: `land-${flight.id}`, at: now, kind: 'landing', amount: payout, text: `${flight.code} hạ cánh tại ${state.airports.find((airport) => airport.code === flight.to)?.city || flight.to}: +${Math.round(payout).toLocaleString('vi-VN')} $.` });
    landingNotices.unshift(createNotice(`+${Math.round(payout).toLocaleString('vi-VN')} $ — ${flight.code} đã hạ cánh tại ${state.airports.find((airport) => airport.code === flight.to)?.city || flight.to}.`, 'success'));
  }
  const activeFlights = flights.filter((flight) => !landedIds.has(flight.id) && flight.arrivesAt > gameNow).map((flight) => ({ ...flight, progress: Math.max(0, Math.min(100, Math.round(((gameNow - flight.departedAt) / (flight.arrivesAt - flight.departedAt)) * 100))) }));

  const totalNetProfit = revenue - totalCost;
  let cash = state.airline.cash + totalNetProfit;
  const allRoutes = updatedRoutes.map((route) => routeDepartures.has(route.id) ? { ...route, nextDepartureAt: routeDepartures.get(route.id) } : route);
  const updatedPlanes = state.planes.map((plane) => ({
    ...plane,
    wear: Math.min(100, Math.round((plane.wear + (wearByPlane.get(plane.id) || 0)) * 10000) / 10000),
    totalFlightHours: Math.round(((plane.totalFlightHours || 0) + (hoursByPlane.get(plane.id) || 0)) * 10) / 10,
    updatedAt: now,
    version: (plane.version || 1) + 1,
  }));

  let xpPool = (state.xpProfitRemainder || 0) + Math.max(0, totalNetProfit) / 10000 * (hardcore ? 1.5 : 1);
  const xpGained = Math.floor(xpPool);
  xpPool -= xpGained;
  let currentXp = state.airline.xp + xpGained;
  let currentLevel = state.airline.level;
  let pendingLevelUp = state.pendingLevelUp;
  while (currentXp >= currentLevel * 1000) {
    currentXp -= currentLevel * 1000;
    const oldLevel = currentLevel++;
    pendingLevelUp = { oldLevel, newLevel: currentLevel, reward: currentLevel * 500000 };
  }
  let researchPool = (state.researchProfitRemainder || 0) + Math.max(0, totalNetProfit) / 1000000;
  const researchGained = Math.floor(researchPool);
  researchPool -= researchGained;

  let currentSituation = state.currentSituation ?? null;
  // `situationNextAt` là mốc đồng hồ thực nên so với `now`, KHÔNG phải `gameNow`.
  // Bản lưu cũ đang lưu mốc giờ game (số nhỏ) → coi như hết hạn, đặt lại theo quy luật mới.
  let situationNextAt = isWallClock(state.situationNextAt) ? state.situationNextAt : now + situationDelayMs(hardcore);
  if (!currentSituation && situationNextAt <= now) {
    currentSituation = pickFunnySituation();
    situationNextAt = now + situationDelayMs(hardcore);
    addActivity({ id: `situation-${now}`, at: now, kind: 'situation', text: `Tình huống vận hành: ${currentSituation.title}` });
  }
  let eventTransactions: Transaction[] = [];
  let eventNotices: GameState['notices'] = [];
  let eventHistory = state.eventHistory;
  if (!currentEvent && Math.random() < (hardcore ? 0.02 : 0.01)) {
    const triggered = triggerRandomEvent({ ...state, airline: { ...state.airline!, cash }, currentEvent: null, gameTimeMs: gameNow }, now);
    currentEvent = triggered.currentEvent;
    cash = triggered.airline?.cash ?? cash;
    eventTransactions = triggered.transactions.filter((transaction) => !state.transactions.some((old) => old.id === transaction.id));
    eventNotices = triggered.notices.filter((notice) => !state.notices.some((old) => old.id === notice.id));
    eventHistory = triggered.eventHistory;
    if (currentEvent) addActivity({ id: `event-${currentEvent.id}`, at: now, kind: 'situation', text: `Sự kiện vận hành: ${currentEvent.title}` });
  }

  // Danh tiếng, giá đỏ/xanh và các lần điều chỉnh giá của hãng AI đều tính theo đồng hồ game.
  const redPriceSince = { ...(state.redPriceSince || {}) };
  const greenPriceSince = { ...(state.greenPriceSince || {}) };
  const routeTitles = [...(state.routeTitles || [])];
  const notices: GameState['notices'] = [...landingNotices];
  let reputation = state.airline.reputation ?? 70;
  let marketingPenaltyUntil = state.marketingPenaltyUntil || 0;
  const competitorDue = gameNow >= (state.competitorPriceAt ?? previousGameTime + 6 * 3600000);
  const priceRoutes = allRoutes.map((route) => {
    const from = state.airports.find((airport) => airport.code === route.from);
    const to = state.airports.find((airport) => airport.code === route.to);
    if (!from || !to) return route;
    const ratio = route.ticketPrice / basePrice(distanceKm(from, to));
    if (ratio > 1.5) {
      redPriceSince[route.id] ||= previousGameTime;
      delete greenPriceSince[route.id];
      if (gameNow - redPriceSince[route.id] >= 24 * 3600000) {
        reputation = Math.max(0, reputation - 5);
        marketingPenaltyUntil = gameNow + 6 * 3600000;
        redPriceSince[route.id] = gameNow;
        notices.unshift(createNotice(`Báo chí tố ${state.airline?.name || 'hãng bay'} chặt chém! Danh tiếng -5, nhu cầu giảm 10% trong 6 giờ game.`, 'warn'));
        addActivity({ id: `press-${route.id}-${now}`, at: now, kind: 'situation', text: `Báo chí tố hãng chặt chém trên tuyến ${route.from}–${route.to}.` });
      }
    } else {
      delete redPriceSince[route.id];
      if (ratio <= 1) {
        greenPriceSince[route.id] ||= previousGameTime;
        if (!routeTitles.includes(route.id) && gameNow - greenPriceSince[route.id] >= 7 * 24 * 3600000) {
          routeTitles.push(route.id);
          notices.unshift(createNotice(`Tuyến ${route.from}–${route.to} nhận Danh hiệu Giá tốt: nhu cầu tăng vĩnh viễn 3%.`, 'success'));
        }
      } else delete greenPriceSince[route.id];
    }
    const band = ratio > 1.5 ? 'red' : ratio <= 1 ? 'green' : ratio <= 1.15 ? 'yellow' : 'orange';
    return { ...route, priceBand: band as Route['priceBand'], goodPriceBonus: routeTitles.includes(route.id), ...(competitorDue ? { competitorTicketPrice: Math.round((route.competitorTicketPrice || route.ticketPrice) * (1 - (0.05 + Math.random() * 0.1))) } : {}) };
  });
  if (competitorDue && priceRoutes.length) {
    const changed = priceRoutes[0];
    const message = `Đối thủ VietSky vừa giảm giá tuyến ${changed.from}–${changed.to} xuống ${(changed.competitorTicketPrice || 0).toLocaleString('vi-VN')} $.`;
    notices.unshift(createNotice(message));
    addActivity({ id: `rival-${now}`, at: now, kind: 'competitor', text: message });
  }

  const onTimeLandings = landed.filter((f) => !f.delayed).length;
  const goldenLandings = isGolden ? landed.length : 0;
  const profitableRoutes = priceRoutes.filter((r) => r.active && (r.profitPerHour || 0) > 0).length;
  const missions = state.missions.map((mission) => {
    if (mission.id === 'starter-4-first-revenue' || mission.id === 'daily-profit-500k') {
      const progress = mission.progress + Math.max(0, totalNetProfit);
      return { ...mission, progress, done: mission.done || progress >= mission.target };
    }
    if (mission.id === 'starter-7-reach-level-5') return { ...mission, progress: currentLevel, done: mission.done || currentLevel >= mission.target };
    if (mission.id === 'daily-pax-10k') {
      const progress = mission.progress + landedPassengers;
      return { ...mission, progress, done: mission.done || progress >= mission.target };
    }
    return mission;
  });
  const weeklyQuests = (state.weeklySeason?.quests || []).map((q) => {
    let progress = q.progress;
    if (q.id === 'weekly-pax-50k') progress += landedPassengers;
    else if (q.id === 'weekly-profit-5m') progress += Math.max(0, totalNetProfit);
    else if (q.id === 'weekly-ontime-100') progress += onTimeLandings;
    else if (q.id === 'weekly-golden-20') progress += goldenLandings;
    else if (q.id === 'weekly-routes-5') progress = profitableRoutes;
    else if (q.id === 'weekly-reputation-80') progress = reputation;
    else if (q.id === 'weekly-fleet-5') progress = updatedPlanes.length;
    return { ...q, progress, done: q.done || progress >= q.target };
  });
  const lifetimeFlights = (state.airline.lifetimeFlights || 0) + landed.length;
  const lifetimePassengers = (state.airline.lifetimePassengers || 0) + landedPassengers;
  const nextAirline: Airline = {
    ...state.airline,
    cash,
    level: currentLevel,
    xp: currentXp,
    lastTickAt: now,
    updatedAt: now,
    version: (state.airline.version || 1) + 1,
    negativeSince: cash < 0 ? (state.airline.negativeSince ?? previousGameTime) : null,
    reputation,
    lifetimeFlights,
    lifetimePassengers,
  };
  let milestones = (state.milestones?.length ? state.milestones : milestoneTemplates).map((milestone) => ({ ...milestone }));
  const milestoneValue = (metric: Milestone['metric']) => metric === 'flights' ? lifetimeFlights : metric === 'passengers' ? lifetimePassengers : metric === 'cash' ? Math.max(0, cash) : metric === 'routes' ? priceRoutes.length : metric === 'planes' ? updatedPlanes.length : reputation;
  const newlyDone: Milestone[] = [];
  milestones = milestones.map((milestone) => {
    if (!milestone.done && milestoneValue(milestone.metric) >= milestone.target) {
      const completed = { ...milestone, done: true, updatedAt: now, version: (milestone.version || 1) + 1 };
      newlyDone.push(completed);
      return completed;
    }
    return milestone;
  });
  let pendingMilestone = state.pendingMilestone ?? newlyDone[0] ?? null;
  const milestoneTransactions: Transaction[] = [];
  for (const milestone of newlyDone) {
    cash += milestone.reward;
    milestoneTransactions.push(createTransaction('Nhiệm vụ', milestone.reward, `Thưởng cột mốc: ${milestone.title}`, 'other'));
    addActivity({ id: `milestone-${milestone.id}-${now}`, at: now, kind: 'milestone', amount: milestone.reward, text: `Cột mốc “${milestone.title}” hoàn thành: +${milestone.reward.toLocaleString('vi-VN')} $.` });
    notices.unshift(createNotice(`Cột mốc “${milestone.title}” hoàn thành! Thưởng ${milestone.reward.toLocaleString('vi-VN')} $.`, 'success'));
  }

  const transactions: Transaction[] = [];
  for (const flight of landed) {
    const payout = Math.round(landingPayouts.get(flight.id) || flight.payout);
    transactions.push(createTransaction('Khai thác', payout, `Doanh thu vé chuyến ${flight.code}`, 'ticket'));
  }
  let pendingOperatingCost = (state.pendingOperatingCost || 0) + totalCost;
  let operatingCostLogged = false;
  if (totalCost > 0 && now - (state.lastCostTransactionAt || previousWallTime) >= 60000) {
    transactions.push(createTransaction('Khai thác', -Math.round(pendingOperatingCost), 'Nhiên liệu, bảo trì và vận hành kể từ lần ghi sổ trước', 'fuel'));
    operatingCostLogged = true;
    pendingOperatingCost = 0;
  }
  const routeBreakdown: OfflineSummary['routeBreakdown'] = priceRoutes.filter((route) => route.active).map((route) => ({
    from: route.from, to: route.to, planeModel: state.planes.find((plane) => plane.id === route.planeId)?.name || 'Máy bay',
    profit: Math.round((route.profitPerHour || 0) * gameHours), flights: landed.filter((flight) => flight.routeId === route.id).length,
  }));
  const cashHistory = [...(state.cashHistory || []), { at: now, cash }].slice(-3600);
  const critical: GameState['notices'] = [];
  if (cash < 1000000 && (state.airline.cash >= 1000000 || Math.floor(now / 10000) !== Math.floor(previousWallTime / 10000))) critical.push(createNotice('Cảnh báo: tiền mặt dưới 1.000.000 $. Hãy kiểm tra chi phí và các tuyến lỗ.', 'warn'));
  const worn = updatedPlanes.filter((plane) => plane.wear >= 80).length;
  if (worn && Math.floor(now / 60000) !== Math.floor(previousWallTime / 60000)) critical.push(createNotice(`Cảnh báo kỹ thuật: ${worn} máy bay hao mòn trên 80%.`, 'warn'));
  const result: GameState = {
    ...state,
    airline: { ...nextAirline, cash },
    gameTimeMs: gameNow,
    flights: activeFlights,
    nextFlightNumber: flightNumber,
    streak,
    streakShield,
    streakBest,
    weeklySeason: state.weeklySeason ? { ...state.weeklySeason, quests: weeklyQuests } : state.weeklySeason,
    goldenHour,
    goldenHourNextAt,
    activityLog: activity.slice(0, 100),
    milestones,
    pendingMilestone,
    cashHistory,
    xpProfitRemainder: xpPool,
    researchProfitRemainder: researchPool,
    researchPoints: state.researchPoints + researchGained,
    routes: priceRoutes,
    planes: updatedPlanes,
    missions,
    currentEvent,
    eventHistory,
    currentSituation,
    situationNextAt,
    activeConsequences: (state.activeConsequences || []).filter((consequence) => consequence.expiresAt > gameNow),
    marketingPenaltyUntil,
    competitorPriceAt: competitorDue ? gameNow + 6 * 3600000 : (state.competitorPriceAt ?? gameNow + 6 * 3600000),
    redPriceSince,
    greenPriceSince,
    routeTitles,
    pendingLevelUp,
    pendingOfflineSummary: offline ? { hoursOffline: Math.round(elapsedRealMs / 360000) / 10, totalProfit: Math.round(revenue - totalCost), totalRevenue: Math.round(revenue), totalCost: Math.round(totalCost), routeBreakdown } : state.pendingOfflineSummary ?? null,
    transactions: [...transactions, ...milestoneTransactions, ...eventTransactions, ...state.transactions].slice(0, 300),
    notices: [...notices, ...eventNotices, ...critical, ...state.notices].slice(0, 50),
    pendingOperatingCost,
    lastCostTransactionAt: operatingCostLogged ? now : state.lastCostTransactionAt,
    updatedAt: now,
  };
  const insolvencyDays = hardcore ? 3 : 7;
  if (cash < 0 && nextAirline.negativeSince !== null && nextAirline.negativeSince !== undefined && gameNow - nextAirline.negativeSince >= insolvencyDays * 24 * 3600000) {
    const rescued = restructureAirline(result);
    return { ...rescued, notices: [createNotice(`Phá sản sau ${insolvencyDays} ngày game âm tiền. Bảo hiểm đã cứu 50% giá trị tài sản.`, 'warn'), ...rescued.notices] };
  }
  return result;
}

/** Bốc kết quả lựa chọn trong biên độ và cập nhật danh tiếng/hiệu ứng kéo dài. */
export function resolveFunnySituation(state: GameState, choiceId: string, random = Math.random, gameTimeMs = state.gameTimeMs ?? 0): GameState {
  const situation = state.currentSituation;
  const choice = situation?.choices.find((x) => x.id === choiceId);
  if (!situation || !choice || !state.airline) return state;
  const pressChain = (state.activeConsequences || []).some((c) => c.title.includes('theo dõi') && c.expiresAt > gameTimeMs) && situation.group === 'Truyền thông';
  const hardcoreFactor = state.hardcore || state.airline.hardcore ? 1.35 : 1;
  let amount = Math.round(choice.cashMin + random() * (choice.cashMax - choice.cashMin));
  if (pressChain || (hardcoreFactor > 1 && amount < 0)) amount = Math.round(amount * (pressChain ? 2 : hardcoreFactor));
  const reputation = Math.max(0, Math.min(100, (state.airline.reputation ?? 70) + Math.round(choice.reputation * (pressChain || (hardcoreFactor > 1 && choice.reputation < 0) ? hardcoreFactor : 1))));
  const resultText = amount >= 0 ? `thu ${Math.round(amount).toLocaleString('vi-VN')} $` : `tốn ${Math.round(-amount).toLocaleString('vi-VN')} $`;
  const chain = choice.chain ? [{ id: choice.chain.id, title: choice.chain.title, startsAt: gameTimeMs, expiresAt: gameTimeMs + choice.chain.durationHours * 3600000, severity: choice.chain.severity }] : [];
  return {
    ...state,
    airline: { ...state.airline, cash: state.airline.cash + amount, reputation, updatedAt: Date.now(), version: (state.airline.version || 1) + 1 },
    currentSituation: null,
    activeConsequences: [...(state.activeConsequences || []).filter((c) => c.expiresAt > gameTimeMs), ...chain],
    transactions: [createTransaction('Sự kiện', amount, `${situation.title}: ${resultText}`), ...state.transactions].slice(0, 300),
    notices: [createNotice(`${situation.title} — ${choice.label}: ${resultText}. Danh tiếng ${choice.reputation >= 0 ? '+' : ''}${choice.reputation}.`, amount < 0 ? 'warn' : 'success'), ...state.notices].slice(0, 50),
  };
}

/** Hardcore chỉ đổi được khi không còn khoản vay. */
export function setHardcoreMode(state: GameState, enabled: boolean): GameState {
  if (state.loan > 0 || !state.airline) return state;
  return { ...state, hardcore: enabled, airline: { ...state.airline, hardcore: enabled, updatedAt: Date.now(), version: (state.airline.version || 1) + 1 } };
}

/** Chiến dịch phục hồi danh tiếng; dưới 2 sao chi phí tăng gấp đôi. */
export function runMarketingCampaign(state: GameState): GameState {
  if (!state.airline) return state;
  const cost = 50000 * marketingCostMultiplier(state.airline.reputation ?? 70);
  if (state.airline.cash < cost) return { ...state, notices: [createNotice(`Cần ${cost.toLocaleString('vi-VN')} $ để chạy chiến dịch tiếp thị.`, 'warn'), ...state.notices] };
  return { ...state, airline: { ...state.airline, cash: state.airline.cash-cost, reputation: Math.min(100,(state.airline.reputation??70)+5), updatedAt: Date.now(), version:(state.airline.version||1)+1 }, transactions:[createTransaction('Sự kiện',-cost,'Chiến dịch truyền thông phục hồi danh tiếng','other'),...state.transactions].slice(0,300), notices:[createNotice(`Chiến dịch tiếp thị hoàn tất. Danh tiếng +5 · chi phí ${cost.toLocaleString('vi-VN')} $.`,'success'),...state.notices] };
}

/**
 * 18. Đóng modal thăng cấp và nhận thưởng level up
 */
export function dismissLevelUp(state: GameState): GameState {
  if (!state.airline || !state.pendingLevelUp) return state;
  const reward = state.pendingLevelUp.reward;
  const tx = createTransaction(
    'Nhiệm vụ',
    reward,
    `Thưởng thăng cấp Cấp độ ${state.pendingLevelUp.newLevel}`,
    'other'
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: state.airline.cash + reward,
    },
    pendingLevelUp: undefined,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(
        `Đã nhận phần thưởng thăng cấp: +${reward.toLocaleString('vi-VN')} $!`,
        'success'
      ),
      ...state.notices,
    ],
  };
}

/**
 * 19. Đóng modal offline summary
 */
export function dismissOfflineSummary(state: GameState): GameState {
  return {
    ...state,
    pendingOfflineSummary: null,
  };
}

export function dismissMilestone(state: GameState): GameState {
  return { ...state, pendingMilestone: null };
}

export function dismissIpo(state: GameState): GameState {
  return { ...state, pendingIpo: null };
}

/** IPO đổi tài sản hiện tại lấy cổ phiếu, giữ danh tính và các nâng cấp vĩnh viễn của hãng. */
export function goPublic(state: GameState, now = Date.now()): GameState {
  if (!state.airline) return state;
  const valuation = airlineValue(state.airline.cash, state.planes, state.airports);
  if (valuation < 500000000) return { ...state, notices: [createNotice('Hãng cần đạt giá trị ít nhất 500.000.000 $ để lên sàn.', 'warn'), ...state.notices] };
  const shares = Math.max(1, Math.floor(Math.sqrt(valuation / 500000000)));
  const fresh = initialState();
  const cash = 10000000;
  const airline: Airline = {
    ...state.airline,
    cash,
    level: 1,
    xp: 0,
    createdAt: now,
    lastTickAt: now,
    negativeSince: null,
    ipoShares: (state.airline.ipoShares || 0) + shares,
    lifetimeFlights: 0,
    lifetimePassengers: 0,
    version: (state.airline.version || 1) + 1,
    updatedAt: now,
  };
  const transaction = createTransaction('Vốn khởi nghiệp', cash, `Vốn tái khởi động sau IPO · nhận ${shares} cổ phiếu`, 'asset');
  const activity: ActivityItem = { id: `ipo-${now}`, at: now, kind: 'ipo', text: `${airline.name} lên sàn thành công, nhận ${shares} cổ phiếu vĩnh viễn.` };
  return {
    ...fresh,
    airline,
    airports: fresh.airports.map((airport) => ({ ...airport, slotsUsed: airport.code === airline.baseAirport ? 1 : 0 })),
    theme: state.theme,
    currency: state.currency,
    soundEnabled: state.soundEnabled,
    tutorialDone: true,
    simpleMode: state.simpleMode,
    hardcore: state.hardcore,
    loan: 0,
    ipoCount: (state.ipoCount || 0) + 1,
    pendingIpo: { shares, valuation, flights: state.airline.lifetimeFlights || 0, passengers: state.airline.lifetimePassengers || 0 },
    transactions: [transaction],
    activityLog: [activity],
    cashHistory: [{ at: now, cash }],
    gameTimeMs: 0,
    timeSpeed: state.timeSpeed || 1,
    nextFlightNumber: 128,
    streak: 0,
    goldenHour: null,
    goldenHourNextAt: 7.5 * 3600000,
    notices: [createNotice(`Chúc mừng! ${airline.name} đã lên sàn và nhận ${shares} cổ phiếu. Mỗi cổ phiếu tăng lợi nhuận vĩnh viễn 8%.`, 'success')],
  };
}

/**
 * 20. Tái cơ cấu hãng hàng không khi phá sản (Bảo hiểm khôi phục 50% tài sản)
 */
export function restructureAirline(state: GameState): GameState {
  if (!state.airline) return state;

  const totalVal = airlineValue(state.airline.cash, state.planes, state.airports);
  const insuranceCash = Math.max(3000000, Math.floor(totalVal * 0.5));

  const tx = createTransaction(
    'Tái cơ cấu',
    insuranceCash,
    `Thực hiện gói bảo hiểm phá sản và tái thiết lập hãng bay`,
    'asset'
  );

  return {
    ...state,
    airline: {
      ...state.airline,
      cash: insuranceCash,
    },
    loan: 0,
    transactions: [tx, ...state.transactions].slice(0, 300),
    notices: [
      createNotice(
        `Hãng bay đã tái cơ cấu thành công với gói bảo hiểm 50% tài sản (${insuranceCash.toLocaleString('vi-VN')} $). Tất cả các khoản nợ được xóa!`,
        'success'
      ),
      ...state.notices,
    ],
  };
}
