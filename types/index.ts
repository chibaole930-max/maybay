export type Difficulty = 'de' | 'thuong' | 'kho';

export interface Plane {
  id: string;
  model: string;
  manufacturer: string;
  price: number;
  capacity: number;
  rangeKm: number;
  speedKmh: number;
  fuelCostPerHour: number;
  maintenancePerHour: number;
  wear: number; // 0 - 100%
  name?: string;
  year: number;
  businessClass?: boolean; // +15% revenue
  winglets?: boolean; // -8% fuel
  assignedRouteId?: string;
  totalFlightHours?: number;
  updatedAt?: number;
  version?: number;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  landingFee: number;
  demand: number; // 1 - 10
  slots: number;
  slotsUsed: number;
  lat: number;
  lon: number;
  isSecondBase?: boolean;
  updatedAt?: number;
  version?: number;
}

export interface Route {
  id: string;
  from: string;
  to: string;
  planeId: string;
  ticketPrice: number;
  frequencyPerWeek: number; // 1 - 14
  active: boolean;
  profitPerHour: number;
  revenuePerHour?: number;
  costPerHour?: number;
  loadFactor?: number;
  flightHours?: number;
  competition?: number; // 1 - 3 đối thủ AI
  competitorTicketPrice?: number;
  priceBand?: 'green' | 'yellow' | 'orange' | 'red';
  goodPriceBonus?: boolean;
  updatedAt?: number;
  version?: number;
  nextDepartureAt?: number;
}

export interface Flight {
  id: string;
  code: string;
  routeId: string;
  from: string;
  to: string;
  planeId: string;
  departedAt: number;
  arrivesAt: number;
  plannedArrivesAt: number;
  payout: number;
  passengers: number;
  delayed: boolean;
  progress: number;
  updatedAt?: number;
  version?: number;
}
export type ActivityKind = 'takeoff' | 'landing' | 'situation' | 'achievement' | 'competitor' | 'ipo' | 'milestone';
export interface ActivityItem { id: string; at: number; kind: ActivityKind; text: string; amount?: number; updatedAt?: number; version?: number }
export interface Milestone { id: string; title: string; target: number; metric: 'flights' | 'passengers' | 'cash' | 'routes' | 'planes' | 'reputation'; reward: number; done: boolean; updatedAt?: number; version?: number }
export interface CashPoint { at: number; cash: number }
export interface GoldenHour { startsAt: number; endsAt: number }

export interface Airline {
  name: string;
  logoColor: string;
  logoIcon: string;
  baseAirport: string;
  secondBaseAirport?: string;
  cash: number;
  level: number;
  xp: number;
  difficulty: Difficulty;
  createdAt: number;
  lastTickAt: number;
  autoManage?: boolean; // Level 15 unlock
  reputation?: number; // 0-100, mặc định 70
  inviteCode?: string;
  updatedAt?: number;
  version?: number;
  negativeSince?: number | null;
  ipoShares?: number;
  lifetimeFlights?: number;
  lifetimePassengers?: number;
}

export type FunnyEventChoice = { id: string; label: string; preview: string; cashMin: number; cashMax: number; reputation: number; chain?: { id: string; title: string; durationHours: number; severity: number } };
export type FunnySituation = { id: string; group: string; title: string; description: string; choices: FunnyEventChoice[] };
export type ActiveConsequence = { id: string; title: string; startsAt: number; expiresAt: number; severity: number };

export interface Transaction {
  id: string;
  at: number;
  type: 'Vốn khởi nghiệp' | 'Khai thác' | 'Mua máy bay' | 'Bán máy bay' | 'Bảo trì' | 'Nâng cấp' | 'Mở đường bay' | 'Mở sân bay' | 'Slot sân bay' | 'Căn cứ thứ 2' | 'Vay ngân hàng' | 'Trả nợ' | 'Lương nhân sự' | 'Nhiệm vụ' | 'Sự kiện' | 'Tái cơ cấu';
  category?: 'ticket' | 'fuel' | 'maintenance' | 'salary' | 'airport' | 'asset' | 'loan' | 'other';
  amount: number;
  note: string;
  updatedAt?: number;
  version?: number;
}

export interface GameEvent {
  id: string;
  at: number;
  kind: 'fuel_surge' | 'fuel_drop' | 'storm' | 'festival' | 'inspection';
  title: string;
  description: string;
  effectLabel: string;
  fuelMultiplier?: number;
  demandMultiplier?: number;
  affectedAirports?: string[];
  expiresAt: number;
  resolved?: boolean;
  updatedAt?: number;
  version?: number;
}

export interface Mission {
  id: string;
  title: string;
  description?: string;
  target: number;
  progress: number;
  reward: number;
  rewardXp?: number;
  done: boolean;
  category: 'starter' | 'daily' | 'weekly' | 'achievement';
  icon?: string;
  updatedAt?: number;
  version?: number;
}

export interface WeeklySeason {
  id: string;
  quests: Mission[];
}

export interface Staff {
  id: string;
  role: 'Phi công' | 'Tiếp viên' | 'Kỹ sư';
  name: string;
  skill: number; // 1 - 5 sao
  salaryPerHour: number;
  morale: number; // 0 - 100%
  updatedAt?: number;
  version?: number;
}

export interface OfflineSummary {
  hoursOffline: number;
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  routeBreakdown: {
    from: string;
    to: string;
    planeModel: string;
    profit: number;
    flights: number;
  }[];
}

export interface GameState {
  airline: Airline | null;
  planes: Plane[];
  routes: Route[];
  airports: Airport[];
  transactions: Transaction[];
  staff: Staff[];
  research: {
    fuel: number;       // 0 - 5
    service: number;    // 0 - 5
    maintenance: number;// 0 - 5
  };
  researchPoints: number;
  missions: Mission[];
  notices: { id: string; text: string; time: number; unread: boolean; type?: 'info' | 'warn' | 'success' }[];
  currentEvent: GameEvent | null;
  eventHistory: GameEvent[];
  loan: number;
  theme: 'light' | 'dark';
  currency: 'USD' | 'VND';
  soundEnabled: boolean;
  tutorialDone: boolean;
  pendingLevelUp?: { oldLevel: number; newLevel: number; reward: number };
  pendingOfflineSummary?: OfflineSummary | null;
  /** Chế độ đơn giản chỉ ẩn giao diện nâng cao, không đổi công thức game. */
  simpleMode?: boolean;
  weeklyStarterRewardClaimed?: boolean;
  currentSituation?: FunnySituation | null;
  situationNextAt?: number;
  activeConsequences?: ActiveConsequence[];
  redPriceSince?: Record<string, number>;
  greenPriceSince?: Record<string, number>;
  routeTitles?: string[];
  friendCodes?: string[];
  competitorPriceAt?: number;
  marketingPenaltyUntil?: number;
  updatedAt?: number;
  version?: number;
  timeSpeed?: 1;
  gameTimeMs?: number;
  flights?: Flight[];
  nextFlightNumber?: number;
  streak?: number;
  goldenHour?: GoldenHour | null;
  goldenHourNextAt?: number;
  activityLog?: ActivityItem[];
  milestones?: Milestone[];
  cashHistory?: CashPoint[];
  ipoCount?: number;
  pendingIpo?: { shares: number; valuation: number; flights: number; passengers: number } | null;
  pendingMilestone?: Milestone | null;
  xpProfitRemainder?: number;
  researchProfitRemainder?: number;
  lastCostTransactionAt?: number;
  pendingOperatingCost?: number;
  /** Retention meta: điểm danh hàng ngày + mùa tuần. */
  lastDailyReset?: string;
  lastLoginDate?: string;
  loginClaimedDate?: string;
  loginStreak?: number;
  weeklySeason?: WeeklySeason | null;
  streakShield?: boolean;
  streakBest?: number;
  /** Online: nhân nhu cầu toàn server (poll /api/world-state 60s/lần). */
  worldDemand?: number;
  onlineToken?: string | null;
  onlineReady?: boolean;
}
