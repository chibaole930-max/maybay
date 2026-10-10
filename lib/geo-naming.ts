/** Sinh mã, tên và chỉ số sân bay từ toạ độ. Dùng chung cho API route và client. */

export type Region = 'Việt Nam' | 'Đông Nam Á' | 'Đông Á' | 'Bay xa';

export type AirportDraft = {
  code: string;
  name: string;
  city: string;
  country: string;
  region: Region;
  lat: number;
  lng: number;
  demand: number;
  landingFee: number;
  unlockLevel: number;
};

// Bán kính xấp xỉ mỗi quốc gia, dùng để đoán vùng khi người chơi bấm bản đồ.
type Box = { country: string; region: Region; lat: [number, number]; lng: [number, number] };

const REGION_BOXES: Box[] = [
  { country: 'Việt Nam', region: 'Việt Nam', lat: [8.5, 23.4], lng: [102.1, 109.5] },
  { country: 'Lào', region: 'Đông Nam Á', lat: [13.9, 22.5], lng: [100.0, 107.7] },
  { country: 'Campuchia', region: 'Đông Nam Á', lat: [10.3, 14.7], lng: [102.3, 107.6] },
  { country: 'Thái Lan', region: 'Đông Nam Á', lat: [5.6, 20.5], lng: [97.3, 105.7] },
  { country: 'Myanmar', region: 'Đông Nam Á', lat: [9.7, 28.5], lng: [92.1, 101.3] },
  { country: 'Việt Nam', region: 'Đông Nam Á', lat: [8.5, 23.4], lng: [100.0, 102.1] },
  { country: 'Malaysia', region: 'Đông Nam Á', lat: [0.8, 7.4], lng: [99.6, 119.3] },
  { country: 'Singapore', region: 'Đông Nam Á', lat: [1.0, 1.6], lng: [103.5, 104.1] },
  { country: 'Indonesia', region: 'Đông Nam Á', lat: [-11.0, 6.1], lng: [95.0, 141.1] },
  { country: 'Philippines', region: 'Đông Nam Á', lat: [4.6, 21.1], lng: [116.9, 126.6] },
  { country: 'Brunei', region: 'Đông Nam Á', lat: [4.3, 5.4], lng: [114.0, 115.3] },
  { country: 'Trung Quốc', region: 'Đông Á', lat: [18.0, 53.6], lng: [73.5, 135.1] },
  { country: 'Nhật Bản', region: 'Đông Á', lat: [24.0, 45.5], lng: [122.9, 153.1] },
  { country: 'Hàn Quốc', region: 'Đông Á', lat: [33.0, 38.7], lng: [124.5, 131.0] },
  { country: 'Đài Loan', region: 'Đông Á', lat: [21.8, 25.4], lng: [119.2, 122.1] },
  { country: 'Mongolia', region: 'Đông Á', lat: [41.5, 52.2], lng: [87.7, 119.9] },
  { country: 'Ấn Độ', region: 'Bay xa', lat: [6.7, 35.7], lng: [68.1, 97.4] },
  { country: 'Ả Rập Saudi', region: 'Bay xa', lat: [16.3, 32.2], lng: [34.5, 55.7] },
  { country: 'UAE', region: 'Bay xa', lat: [22.6, 26.1], lng: [51.5, 56.4] },
  { country: 'Thổ Nhĩ Kỳ', region: 'Bay xa', lat: [35.8, 42.1], lng: [25.6, 44.8] },
  { country: 'Nga', region: 'Bay xa', lat: [41.1, 82.1], lng: [19.6, 180.0] },
  { country: 'Đức', region: 'Bay xa', lat: [47.2, 55.1], lng: [5.8, 15.1] },
  { country: 'Pháp', region: 'Bay xa', lat: [41.3, 51.1], lng: [-5.2, 9.6] },
  { country: 'Anh', region: 'Bay xa', lat: [49.8, 60.9], lng: [-8.7, 1.8] },
  { country: 'Ý', region: 'Bay xa', lat: [35.4, 47.1], lng: [6.6, 18.6] },
  { country: 'Tây Ban Nha', region: 'Bay xa', lat: [35.9, 43.8], lng: [-9.4, 3.4] },
  { country: 'Bồ Đào Nha', region: 'Bay xa', lat: [36.9, 42.2], lng: [-9.6, -6.1] },
  { country: 'Hà Lan', region: 'Bay xa', lat: [50.7, 53.6], lng: [3.3, 7.3] },
  { country: 'Ba Lan', region: 'Bay xa', lat: [49.0, 54.9], lng: [14.1, 24.2] },
  { country: 'Thụy Sĩ', region: 'Bay xa', lat: [45.8, 47.8], lng: [5.9, 10.5] },
  { country: 'Áo', region: 'Bay xa', lat: [46.3, 49.1], lng: [9.5, 17.2] },
  { country: 'Thụy Điển', region: 'Bay xa', lat: [55.3, 69.1], lng: [11.0, 24.2] },
  { country: 'Na Uy', region: 'Bay xa', lat: [57.9, 71.2], lng: [4.6, 31.1] },
  { country: 'Phần Lan', region: 'Bay xa', lat: [59.8, 70.1], lng: [20.5, 31.6] },
  { country: 'Hy Lạp', region: 'Bay xa', lat: [34.8, 41.8], lng: [19.3, 28.3] },
  { country: 'Ireland', region: 'Bay xa', lat: [51.4, 55.4], lng: [-10.5, -6.0] },
  { country: 'Mỹ', region: 'Bay xa', lat: [24.5, 71.4], lng: [-179.0, -66.9] },
  { country: 'Canada', region: 'Bay xa', lat: [41.6, 83.1], lng: [-141.0, -52.6] },
  { country: 'Mexico', region: 'Bay xa', lat: [14.5, 32.7], lng: [-118.4, -86.7] },
  { country: 'Brazil', region: 'Bay xa', lat: [-33.8, 5.3], lng: [-73.9, -34.8] },
  { country: 'Argentina', region: 'Bay xa', lat: [-55.1, -21.8], lng: [-73.6, -53.6] },
  { country: 'Chile', region: 'Bay xa', lat: [-55.9, -17.5], lng: [-75.6, -66.4] },
  { country: 'Colombia', region: 'Bay xa', lat: [-4.3, 12.4], lng: [-79.0, -66.9] },
  { country: 'Peru', region: 'Bay xa', lat: [-18.4, -0.1], lng: [-81.4, -68.7] },
  { country: 'Nam Phi', region: 'Bay xa', lat: [-34.9, -22.1], lng: [16.5, 32.9] },
  { country: 'Ai Cập', region: 'Bay xa', lat: [22.0, 31.7], lng: [24.7, 36.9] },
  { country: 'Nigeria', region: 'Bay xa', lat: [4.2, 13.9], lng: [2.7, 14.7] },
  { country: 'Kenya', region: 'Bay xa', lat: [-4.7, 5.5], lng: [33.9, 41.9] },
  { country: 'Ả Rập Thống nhất', region: 'Bay xa', lat: [22.6, 26.1], lng: [51.5, 56.4] },
  { country: 'Qatar', region: 'Bay xa', lat: [24.5, 26.2], lng: [50.7, 51.6] },
  { country: 'Israel', region: 'Bay xa', lat: [29.4, 33.3], lng: [34.2, 35.9] },
];

const REGION_UNLOCK: Record<Region, number> = { 'Việt Nam': 1, 'Đông Nam Á': 5, 'Đông Á': 10, 'Bay xa': 15 };

const REGION_FEE: Record<Region, [number, number]> = {
  'Việt Nam': [60, 190],
  'Đông Nam Á': [150, 320],
  'Đông Á': [340, 470],
  'Bay xa': [430, 1120],
};

/** Gần đúng vùng của một toạ độ; rơi ngoài mọi hộp thì coi như đường bay xa. */
export function regionFor(lat: number, lng: number): { country: string; region: Region } {
  // Ưu tiên hộp hẹp nhất để lồng vùng nhỏ (Singapore) thắng vùng lớn.
  let best: { box: Box; span: number } | null = null;
  for (const box of REGION_BOXES) {
    const inLat = lat >= box.lat[0] && lat <= box.lat[1];
    const inLng = box.lng[0] < 0 ? lng >= box.lng[0] && lng <= box.lng[1] : lng >= box.lng[0] && lng <= box.lng[1];
    if (!inLat || !inLng) continue;
    const span = (box.lat[1] - box.lat[0]) * Math.cos((lat * Math.PI) / 180) * (box.lng[1] - box.lng[0]);
    if (!best || span < best.span) best = { box, span };
  }
  if (!best) return { country: 'Vùng chưa xác định', region: 'Bay xa' };
  return { country: best.box.country, region: best.box.region };
}

/** Mã IATA giả dựng từ toạ độ; ổn định để cùng một toạ độ luôn cho cùng một mã. */
export function codeFor(lat: number, lng: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const latPart = Math.abs(Math.round(lat * 10));
  const lngPart = Math.abs(Math.round(lng * 10));
  const letter = (n: number) => alphabet[n % 26];
  return `${letter(latPart)}${letter(lngPart)}${letter((latPart + lngPart) % 26)}`;
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Tạo bản nháp sân bay từ toạ đồ bấm trên bản đồ. */
export function draftAirport(lat: number, lng: number, existingCodes: string[] = []): AirportDraft {
  const { country, region } = regionFor(lat, lng);
  const [feeMin, feeMax] = REGION_FEE[region];
  let code = codeFor(lat, lng);
  let suffix = 0;
  while (existingCodes.includes(code)) {
    suffix += 1;
    code = `${codeFor(lat, lng)}${suffix}`;
  }
  const demand = Math.max(1, Math.min(10, Math.round(between(3, 10))));
  return {
    code,
    name: `Sân bay mới ${code}`,
    city: `${country}`,
    country,
    region,
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
    demand,
    landingFee: Math.round(between(feeMin, feeMax) / 5) * 5,
    unlockLevel: REGION_UNLOCK[region],
  };
}
