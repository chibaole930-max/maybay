import type { Airport, Plane, Route } from '@/types';
import { routeDistanceKm } from './geo';

/**
 * Giới hạn giá trị trong khoảng [min, max]
 */
export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/**
 * Tính khoảng cách địa lý giữa 2 sân bay theo công thức Haversine (km)
 */
export function distanceKm(a: Airport, b: Airport): number {
  return routeDistanceKm(a,b);
}

/**
 * Tính giá vé cơ bản chuẩn theo khoảng cách (0.12 USD/km/khách)
 */
export const basePrice = (distKm: number): number => {
  return Math.max(35, Math.round(distKm * 0.12));
};

/** Hãng dưới 2 sao (40 điểm) phải chi gấp đôi cho mọi chiến dịch tiếp thị. */
export const marketingCostMultiplier = (reputation: number): number => reputation < 40 ? 2 : 1;
/** Máy bay thân rộng dùng được cho các hành trình quốc tế dài. */
export const isWideBody = (plane: Plane): boolean => /767|787|777|330|350|380/.test(plane.model);

/**
 * Tính hệ số lấp đầy (Load Factor) từ 5% đến 98%:
 * Độ nhạy giá 1.2; trên 150% giá cơ bản, mỗi 10% tăng thêm làm mất 25% khách.
 */
export function calculateLoadFactor(
  demand: number,
  ticketPrice: number,
  base: number,
  competition = 1,
  serviceBonus = 1,
  eventMultiplier = 1
): number {
  const priceRatio = base > 0 ? (ticketPrice - base) / base : 0;
  const premium = Math.max(0, priceRatio);
  const priceSensitivity = premium <= 0.5
    ? 1 - priceRatio * 1.2
    : Math.max(0.002, 0.4 * Math.pow(0.75, (premium - 0.5) / 0.1));
  const competitionDampener = 1 - Math.max(0, competition - 1) * 0.08;
  const effectiveDemand = clamp((demand * eventMultiplier) / 10, 0.2, 1.5);

  const rawLf = effectiveDemand * priceSensitivity * competitionDampener * serviceBonus;
  return clamp(rawLf, 0.05, 0.98);
}

/**
 * Tính toán kinh tế học chi tiết cho một đường bay:
 * - Doanh thu/giờ
 * - Chi phí nhiên liệu, bảo dưỡng, hạ cánh, nhân sự, lãi vay
 * - Lợi nhuận/giờ
 */
export function routeEconomics(
  route: Pick<Route, 'from' | 'to' | 'ticketPrice' | 'frequencyPerWeek' | 'competition'>,
  plane: Plane,
  from: Airport,
  to: Airport,
  options: {
    baseAirports?: string[];
    fuelSaveBonus?: number;       // Từ nghiên cứu + winglets (vd: 0.08)
    serviceBonus?: number;        // Từ nghiên cứu dịch vụ
    crewCostPerHour?: number;     // Chi phí tổ bay phân bổ
    loanInterestPerHour?: number; // Lãi vay phân bổ
    fuelMultiplier?: number;      // Từ sự kiện thị trường dầu
    demandMultiplier?: number;    // Từ sự kiện lễ hội
    isStormAffected?: boolean;    // Bão làm giảm doanh thu 50%
    reputation?: number;
    internationalNight?: boolean;
    international?: boolean;
    routeDemandBonus?: number;
  } = {}
) {
  const {
    baseAirports = ['SGN'],
    fuelSaveBonus = 0,
    serviceBonus = 1,
    crewCostPerHour = 45,
    loanInterestPerHour = 0,
    fuelMultiplier = 1,
    demandMultiplier = 1,
    isStormAffected = false,
    reputation = 70,
    internationalNight = false,
    international = from.country !== 'Việt Nam' || to.country !== 'Việt Nam',
    routeDemandBonus = 1,
  } = options;

  const distance = distanceKm(from, to);
  const base = basePrice(distance);

  // Nhu cầu bình quân của 2 đầu sân bay
  const avgDemand = (from.demand + to.demand) / 2;
  const lf = calculateLoadFactor(
    avgDemand,
    route.ticketPrice,
    base,
    (route.competition ?? 1) * (international ? 1.5 : 1),
    serviceBonus,
    demandMultiplier * clamp(1 + ((reputation - 70) / 100) * 0.8, 0.2, 1.24) * routeDemandBonus
  );

  // Tần suất bay quy đổi ra giờ hoạt động mỗi tuần (tổng 168 giờ)
  const flightHoursPerTrip = Math.max(0.4, distance / plane.speedKmh);
  const weeklyRatio = route.frequencyPerWeek / 168;

  // Doanh thu vé / giờ (hạng thương gia thưởng +15%)
  const businessMultiplier = plane.businessClass ? 1.15 : 1.0;
  const stormPenalty = isStormAffected ? 0.5 : 1.0;
  const nightFactor = internationalNight ? 0.85 : 1;
  const effectiveLoadFactor = lf * nightFactor;
  const revenuePerHour =
    route.ticketPrice * plane.capacity * effectiveLoadFactor * weeklyRatio * businessMultiplier * stormPenalty;

  // Chi phí nhiên liệu mỗi giờ
  const wingletsBonus = plane.winglets ? 0.08 : 0;
  const totalFuelBonus = clamp(fuelSaveBonus + wingletsBonus, 0, 0.4);
  const effectiveFuelRate = plane.fuelCostPerHour * fuelMultiplier * (1 - totalFuelBonus);
  const fuelCostPerHour = effectiveFuelRate * flightHoursPerTrip * weeklyRatio;

  // Chi phí bảo dưỡng theo giờ
  const maintenancePerHour = plane.maintenancePerHour * weeklyRatio;

  // Phí cất/hạ cánh: Sân bay căn cứ được giảm 20%
  const isFromBase = baseAirports.includes(from.code);
  const isToBase = baseAirports.includes(to.code);
  const landingFeeA = from.landingFee * (isFromBase ? 0.8 : 1.0);
  const landingFeeB = to.landingFee * (isToBase ? 0.8 : 1.0);
  const fromInternationalFactor = from.country !== 'Việt Nam' ? 2.5 : 1;
  const toInternationalFactor = to.country !== 'Việt Nam' ? 2.5 : 1;
  const transitFee = international && distance > 4000 ? 220 * (Math.floor(distance / 4000)) : 0;
  const totalLandingFee = (landingFeeA * fromInternationalFactor + landingFeeB * toInternationalFactor + transitFee) * weeklyRatio;

  // Tổng chi phí vận hành mỗi giờ
  const costPerHour =
    fuelCostPerHour +
    maintenancePerHour +
    totalLandingFee +
    crewCostPerHour * weeklyRatio * (distance > 4000 ? 1.3 : 1) +
    loanInterestPerHour;

  const profitPerHour = revenuePerHour - costPerHour;

  // Độ hao mòn tăng thêm trên mỗi giờ bay: haoMon += flightHours * 0.8
  const wearRatePerHour = flightHoursPerTrip * weeklyRatio * 0.8;

  return {
    distance,
    basePrice: base,
    loadFactor: effectiveLoadFactor,
    flightHours: flightHoursPerTrip,
    revenuePerHour: Math.round(revenuePerHour * 100) / 100,
    costPerHour: Math.round(costPerHour * 100) / 100,
    profitPerHour: Math.round(profitPerHour * 100) / 100,
    wearRatePerHour,
    breakdown: {
      fuelCost: fuelCostPerHour,
      maintenanceCost: maintenancePerHour,
      landingCost: totalLandingFee,
      crewCost: crewCostPerHour * weeklyRatio,
    },
  };
}

/**
 * Định giá toàn diện hãng hàng không:
 * giaTriHang = tiền mặt + tổng giá trị máy bay * 0.7 (trừ hao mòn) + giá trị slot sân bay * 25.000$
 */
export function airlineValue(cash: number, planes: Plane[], airports: Airport[]): number {
  const planesVal = planes.reduce((sum, p) => {
    // Giá trị thu hồi = 70% giá gốc trừ tỉ lệ hao mòn
    const depreciated = p.price * 0.7 * Math.max(0.3, 1 - (p.wear / 100) * 0.5);
    const upgradeValue = (p.businessClass ? 250000 : 0) + (p.winglets ? 150000 : 0);
    return sum + depreciated + upgradeValue;
  }, 0);

  const slotsVal = airports.reduce((sum, a) => sum + (a.slots || 0) * 25000, 0);

  return Math.max(0, Math.round(cash + planesVal + slotsVal));
}

/**
 * Giá bán lại máy bay (70% giá trị sau khấu hao độ hao mòn)
 */
export function getPlaneResaleValue(plane: Plane): number {
  const wearDeduction = 1 - (plane.wear / 100) * 0.5;
  const upgrades = (plane.businessClass ? 200000 : 0) + (plane.winglets ? 100000 : 0);
  return Math.round(plane.price * 0.7 * Math.max(0.3, wearDeduction) + upgrades);
}

/**
 * Chi phí bảo trì máy bay: dựa trên giá trị máy bay và % hao mòn
 */
export function getMaintenanceCost(plane: Plane, maintenanceResearchLevel = 0): number {
  const discount = 1 - maintenanceResearchLevel * 0.05;
  const baseCost = Math.max(5000, plane.price * 0.00015 + plane.wear * 1200);
  return Math.round(baseCost * discount);
}

/**
 * Định dạng tiền tệ linh hoạt USD hoặc VNĐ theo chuẩn Việt Nam
 */
export function formatCurrency(amount: number, currency: 'USD' | 'VND' = 'USD'): string {
  if (currency === 'USD') {
    return `$${Math.round(amount).toLocaleString('vi-VN')}`;
  }
  // Tỷ giá quy đổi cố định 1 USD = 25.400 VNĐ
  const vnd = Math.round(amount * 25400);
  return `₫${vnd.toLocaleString('vi-VN')}`;
}
