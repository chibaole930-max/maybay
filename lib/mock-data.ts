import type { Airport, Mission, Plane, Staff } from '@/types';
import { airportsReal } from './airports-real';

const airportSeed: Airport[] = [
  // Căn cứ & sân bay lớn miền Nam
  { code: 'SGN', name: 'Sân bay quốc tế Tân Sơn Nhất', city: 'TP. Hồ Chí Minh', country: 'Việt Nam', landingFee: 180, demand: 10, slots: 14, slotsUsed: 0, lat: 10.8188, lon: 106.6519 },
  // Miền Bắc
  { code: 'HAN', name: 'Sân bay quốc tế Nội Bài', city: 'Hà Nội', country: 'Việt Nam', landingFee: 170, demand: 10, slots: 14, slotsUsed: 0, lat: 21.2187, lon: 105.8042 },
  // Miền Trung & Tây Nguyên
  { code: 'DAD', name: 'Sân bay quốc tế Đà Nẵng', city: 'Đà Nẵng', country: 'Việt Nam', landingFee: 110, demand: 8, slots: 10, slotsUsed: 0, lat: 16.0439, lon: 108.1994 },
  { code: 'CXR', name: 'Sân bay quốc tế Cam Ranh', city: 'Khánh Hòa', country: 'Việt Nam', landingFee: 100, demand: 8, slots: 8, slotsUsed: 0, lat: 11.9982, lon: 109.2194 },
  { code: 'HUI', name: 'Sân bay quốc tế Phú Bài', city: 'Thừa Thiên Huế', country: 'Việt Nam', landingFee: 75, demand: 6, slots: 6, slotsUsed: 0, lat: 16.4015, lon: 107.7030 },
  { code: 'VII', name: 'Sân bay quốc tế Vinh', city: 'Nghệ An', country: 'Việt Nam', landingFee: 70, demand: 6, slots: 6, slotsUsed: 0, lat: 18.7376, lon: 105.6708 },
  { code: 'HPH', name: 'Sân bay quốc tế Cát Bi', city: 'Hải Phòng', country: 'Việt Nam', landingFee: 85, demand: 7, slots: 7, slotsUsed: 0, lat: 20.8194, lon: 106.7249 },
  { code: 'PQC', name: 'Sân bay quốc tế Phú Quốc', city: 'Kiên Giang', country: 'Việt Nam', landingFee: 105, demand: 8, slots: 8, slotsUsed: 0, lat: 10.1698, lon: 103.9931 },
  { code: 'DLI', name: 'Sân bay Liên Khương', city: 'Lâm Đồng (Đà Lạt)', country: 'Việt Nam', landingFee: 80, demand: 7, slots: 6, slotsUsed: 0, lat: 11.7500, lon: 108.3670 },
  { code: 'VCA', name: 'Sân bay quốc tế Cần Thơ', city: 'Cần Thơ', country: 'Việt Nam', landingFee: 80, demand: 6, slots: 6, slotsUsed: 0, lat: 10.0851, lon: 105.7119 },
  { code: 'VCS', name: 'Sân bay Côn Đảo', city: 'Bà Rịa - Vũng Tàu', country: 'Việt Nam', landingFee: 65, demand: 5, slots: 5, slotsUsed: 0, lat: 8.7318, lon: 106.6326 },
  { code: 'THD', name: 'Sân bay Thọ Xuân', city: 'Thanh Hóa', country: 'Việt Nam', landingFee: 65, demand: 5, slots: 5, slotsUsed: 0, lat: 19.9017, lon: 105.4678 },
  { code: 'UIH', name: 'Sân bay Phù Cát', city: 'Bình Định (Quy Nhơn)', country: 'Việt Nam', landingFee: 70, demand: 6, slots: 6, slotsUsed: 0, lat: 13.9550, lon: 109.0422 },
  { code: 'VDO', name: 'Sân bay quốc tế Vân Đồn', city: 'Quảng Ninh', country: 'Việt Nam', landingFee: 75, demand: 6, slots: 6, slotsUsed: 0, lat: 21.1207, lon: 107.4154 },
  { code: 'VDH', name: 'Sân bay Đồng Hới', city: 'Đồng Hới', country: 'Việt Nam', landingFee: 60, demand: 5, slots: 5, slotsUsed: 0, lat: 17.5150, lon: 106.5906 },
  { code: 'TBB', name: 'Sân bay Tuy Hòa', city: 'Tuy Hòa', country: 'Việt Nam', landingFee: 62, demand: 5, slots: 5, slotsUsed: 0, lat: 13.0496, lon: 109.3337 },
  { code: 'PXU', name: 'Sân bay Pleiku', city: 'Pleiku', country: 'Việt Nam', landingFee: 58, demand: 5, slots: 5, slotsUsed: 0, lat: 14.0045, lon: 108.0172 },
  { code: 'BMV', name: 'Sân bay Buôn Ma Thuột', city: 'Buôn Ma Thuột', country: 'Việt Nam', landingFee: 60, demand: 5, slots: 5, slotsUsed: 0, lat: 12.6683, lon: 108.1203 },
  // Quốc tế
  { code: 'BKK', name: 'Sân bay quốc tế Suvarnabhumi', city: 'Bangkok', country: 'Thái Lan', landingFee: 240, demand: 9, slots: 8, slotsUsed: 0, lat: 13.6900, lon: 100.7500 },
  { code: 'SIN', name: 'Sân bay quốc tế Changi', city: 'Singapore', country: 'Singapore', landingFee: 300, demand: 10, slots: 8, slotsUsed: 0, lat: 1.3644, lon: 103.9915 },
  { code: 'NRT', name: 'Sân bay quốc tế Narita', city: 'Tokyo', country: 'Nhật Bản', landingFee: 420, demand: 10, slots: 8, slotsUsed: 0, lat: 35.7720, lon: 140.3929 },
  { code: 'ICN', name: 'Sân bay quốc tế Incheon', city: 'Seoul', country: 'Hàn Quốc', landingFee: 390, demand: 10, slots: 8, slotsUsed: 0, lat: 37.4602, lon: 126.4407 },
  { code: 'TPE', name: 'Sân bay quốc tế Đào Viên', city: 'Đài Bắc', country: 'Đài Loan', landingFee: 320, demand: 9, slots: 8, slotsUsed: 0, lat: 25.0797, lon: 121.2342 },
  { code: 'KUL', name: 'Sân bay quốc tế Kuala Lumpur', city: 'Kuala Lumpur', country: 'Malaysia', landingFee: 280, demand: 9, slots: 8, slotsUsed: 0, lat: 2.7456, lon: 101.7072 },
  { code: 'MNL', name: 'Sân bay quốc tế Ninoy Aquino', city: 'Manila', country: 'Philippines', landingFee: 270, demand: 8, slots: 8, slotsUsed: 0, lat: 14.5086, lon: 121.0198 },
  { code: 'CGK', name: 'Sân bay quốc tế Soekarno–Hatta', city: 'Jakarta', country: 'Indonesia', landingFee: 310, demand: 9, slots: 8, slotsUsed: 0, lat: -6.1256, lon: 106.6559 },
  { code: 'DPS', name: 'Sân bay quốc tế Ngurah Rai', city: 'Bali', country: 'Indonesia', landingFee: 300, demand: 8, slots: 7, slotsUsed: 0, lat: -8.7482, lon: 115.1672 },
  { code: 'HKG', name: 'Sân bay quốc tế Hồng Kông', city: 'Hồng Kông', country: 'Hồng Kông', landingFee: 420, demand: 10, slots: 8, slotsUsed: 0, lat: 22.3080, lon: 113.9185 },
  { code: 'PVG', name: 'Sân bay quốc tế Phố Đông', city: 'Thượng Hải', country: 'Trung Quốc', landingFee: 450, demand: 10, slots: 8, slotsUsed: 0, lat: 31.1443, lon: 121.8083 },
  { code: 'PEK', name: 'Sân bay quốc tế Thủ Đô', city: 'Bắc Kinh', country: 'Trung Quốc', landingFee: 460, demand: 9, slots: 8, slotsUsed: 0, lat: 40.0799, lon: 116.6031 },
  { code: 'LHR', name: 'Sân bay London Heathrow', city: 'Luân Đôn', country: 'Vương quốc Anh', landingFee: 950, demand: 10, slots: 7, slotsUsed: 0, lat: 51.4700, lon: -0.4543 },
  { code: 'CDG', name: 'Sân bay Paris–Charles de Gaulle', city: 'Paris', country: 'Pháp', landingFee: 850, demand: 10, slots: 7, slotsUsed: 0, lat: 49.0097, lon: 2.5479 },
  { code: 'FRA', name: 'Sân bay Frankfurt', city: 'Frankfurt', country: 'Đức', landingFee: 820, demand: 9, slots: 7, slotsUsed: 0, lat: 50.0379, lon: 8.5622 },
  { code: 'DXB', name: 'Sân bay quốc tế Dubai', city: 'Dubai', country: 'Các Tiểu vương quốc Ả Rập Thống nhất', landingFee: 780, demand: 10, slots: 7, slotsUsed: 0, lat: 25.2532, lon: 55.3657 },
  { code: 'SYD', name: 'Sân bay Sydney', city: 'Sydney', country: 'Úc', landingFee: 900, demand: 9, slots: 7, slotsUsed: 0, lat: -33.9399, lon: 151.1753 },
  { code: 'LAX', name: 'Sân bay quốc tế Los Angeles', city: 'Los Angeles', country: 'Hoa Kỳ', landingFee: 1100, demand: 10, slots: 7, slotsUsed: 0, lat: 33.9416, lon: -118.4085 },
  { code: 'HKT', name: 'Sân bay quốc tế Phuket', city: 'Phuket', country: 'Thái Lan', landingFee: 230, demand: 8, slots: 7, slotsUsed: 0, lat: 8.1132, lon: 98.3169 },
  { code: 'PNH', name: 'Sân bay quốc tế Phnom Penh', city: 'Phnom Penh', country: 'Campuchia', landingFee: 180, demand: 7, slots: 7, slotsUsed: 0, lat: 11.5466, lon: 104.8441 },
  { code: 'VTE', name: 'Sân bay quốc tế Wattay', city: 'Viêng Chăn', country: 'Lào', landingFee: 160, demand: 6, slots: 6, slotsUsed: 0, lat: 17.9883, lon: 102.5633 },
  { code: 'RGN', name: 'Sân bay quốc tế Yangon', city: 'Yangon', country: 'Myanmar', landingFee: 190, demand: 7, slots: 6, slotsUsed: 0, lat: 16.9073, lon: 96.1332 },
  { code: 'BWN', name: 'Sân bay quốc tế Brunei', city: 'Bandar Seri Begawan', country: 'Brunei', landingFee: 200, demand: 6, slots: 6, slotsUsed: 0, lat: 4.9442, lon: 114.9283 },
  { code: 'REP', name: 'Sân bay quốc tế Siem Reap', city: 'Siem Reap', country: 'Campuchia', landingFee: 170, demand: 7, slots: 6, slotsUsed: 0, lat: 13.4107, lon: 103.8130 },
  { code: 'KIX', name: 'Sân bay quốc tế Kansai', city: 'Osaka', country: 'Nhật Bản', landingFee: 430, demand: 9, slots: 7, slotsUsed: 0, lat: 34.4347, lon: 135.2440 },
  { code: 'FUK', name: 'Sân bay Fukuoka', city: 'Fukuoka', country: 'Nhật Bản', landingFee: 380, demand: 8, slots: 7, slotsUsed: 0, lat: 33.5859, lon: 130.4507 },
  { code: 'GMP', name: 'Sân bay Gimpo', city: 'Seoul', country: 'Hàn Quốc', landingFee: 370, demand: 8, slots: 7, slotsUsed: 0, lat: 37.5583, lon: 126.7906 },
  { code: 'CAN', name: 'Sân bay quốc tế Bạch Vân', city: 'Quảng Châu', country: 'Trung Quốc', landingFee: 410, demand: 9, slots: 7, slotsUsed: 0, lat: 23.3924, lon: 113.2988 },
  { code: 'AMS', name: 'Sân bay Amsterdam Schiphol', city: 'Amsterdam', country: 'Hà Lan', landingFee: 880, demand: 9, slots: 7, slotsUsed: 0, lat: 52.3105, lon: 4.7683 },
  { code: 'MAD', name: 'Sân bay Adolfo Suárez Madrid–Barajas', city: 'Madrid', country: 'Tây Ban Nha', landingFee: 800, demand: 9, slots: 7, slotsUsed: 0, lat: 40.4983, lon: -3.5676 },
  { code: 'YYZ', name: 'Sân bay Toronto Pearson', city: 'Toronto', country: 'Canada', landingFee: 1020, demand: 9, slots: 7, slotsUsed: 0, lat: 43.6777, lon: -79.6248 },
  { code: 'GRU', name: 'Sân bay quốc tế Guarulhos', city: 'São Paulo', country: 'Brazil', landingFee: 1050, demand: 9, slots: 7, slotsUsed: 0, lat: -23.4356, lon: -46.4731 },
];

const realByCode = new Map(airportsReal.map((airport) => [airport.code, airport]));
/** Nguồn tọa độ chuẩn 32 sân bay; giữ thêm sân bay cũ để tương thích tiến trình trước đây. */
export const airports: Airport[] = airportSeed.map((airport) => {
  const code = airport.code === 'HUI' ? 'HUE' : airport.code === 'VII' ? 'VIN' : airport.code;
  const real = realByCode.get(code);
  return real ? { ...airport, code, name: 'Sân bay ' + real.name, city: real.city, country: real.country, lat: real.lat, lon: real.lng, demand: real.demand, landingFee: real.landingFee } : { ...airport, code };
});

// Danh mục 24 máy bay chuẩn theo giá cả và thông số thực tế cân bằng gameplay
// [Model, Manufacturer, Price, Capacity, RangeKm, SpeedKmh, FuelCostPerHour, MaintPerHour, Year]
const modelsData: [string, string, number, number, number, number, number, number, number][] = [
  // Khởi đầu & chặng ngắn (Regional)
  ['ATR 72-600', 'ATR', 3500000, 70, 1500, 510, 780, 450, 2018],
  ['COMAC ARJ21', 'COMAC', 4800000, 90, 3700, 828, 1400, 650, 2020],
  ['Embraer E175', 'Embraer', 5500000, 88, 3700, 797, 1500, 700, 2019],
  ['Embraer E190-E2', 'Embraer', 7200000, 114, 5200, 829, 1800, 800, 2021],
  // Thân hẹp phổ thông (Narrow-body)
  ['Airbus A220-300', 'Airbus', 9800000, 130, 6200, 830, 2100, 950, 2020],
  ['Boeing 737-800', 'Boeing', 11500000, 189, 5765, 842, 2800, 1200, 2018],
  ['Airbus A320neo', 'Airbus', 12800000, 180, 6300, 840, 2600, 1150, 2022],
  ['Boeing 737 MAX 8', 'Boeing', 13200000, 178, 6570, 842, 2550, 1150, 2022],
  ['COMAC C919', 'COMAC', 11800000, 158, 5555, 834, 2650, 1100, 2024],
  ['Airbus A319neo', 'Airbus', 11000000, 140, 6850, 830, 2400, 1050, 2021],
  ['Boeing 737 MAX 10', 'Boeing', 14500000, 204, 6110, 842, 2900, 1300, 2023],
  ['Airbus A321neo', 'Airbus', 15500000, 220, 7400, 840, 3100, 1350, 2022],
  ['Airbus A321LR', 'Airbus', 17000000, 206, 7400, 840, 3050, 1400, 2021],
  ['Boeing 757-200', 'Boeing', 8800000, 200, 7222, 850, 3500, 1500, 2004],
  // Thân rộng & tầm xa (Wide-body & Long-haul)
  ['Boeing 767-300ER', 'Boeing', 19500000, 269, 11070, 851, 4800, 2100, 2015],
  ['Boeing 787-8', 'Boeing', 26000000, 242, 13620, 903, 5200, 2300, 2021],
  ['Airbus A330-800', 'Airbus', 28000000, 257, 15094, 880, 5600, 2400, 2020],
  ['Boeing 787-9', 'Boeing', 32000000, 296, 14140, 903, 5800, 2500, 2022],
  ['Airbus A330-900', 'Airbus', 34000000, 287, 13334, 880, 6100, 2600, 2021],
  ['Boeing 787-10', 'Boeing', 38000000, 336, 11910, 903, 6500, 2800, 2023],
  ['Airbus A350-900', 'Airbus', 42000000, 325, 15000, 903, 6800, 2900, 2022],
  ['Boeing 777-300ER', 'Boeing', 48000000, 396, 13649, 892, 8200, 3500, 2020],
  ['Airbus A350-1000', 'Airbus', 52000000, 369, 16100, 903, 7600, 3300, 2023],
  ['Airbus A380-800', 'Airbus', 75000000, 525, 15200, 903, 11500, 4800, 2019],
];

export const planes: Plane[] = modelsData.map((m, i) => ({
  id: `plane-catalog-${i + 1}`,
  model: m[0],
  manufacturer: m[1],
  price: m[2],
  capacity: m[3],
  rangeKm: m[4],
  speedKmh: m[5],
  fuelCostPerHour: m[6],
  maintenancePerHour: m[7],
  wear: 0,
  year: m[8],
  totalFlightHours: 0,
}));

// 7 Nhiệm vụ tân thủ chuẩn theo spec
export const starterMissions: Mission[] = [
  {
    id: 'starter-1-buy-plane',
    title: 'Bước 1: Mua chiếc máy bay đầu tiên',
    description: 'Vào Đội bay và mua chiếc máy bay đầu tiên để mở màn đế chế hàng không.',
    target: 1,
    progress: 0,
    reward: 500000,
    rewardXp: 150,
    done: false,
    category: 'starter',
    icon: '✈️',
  },
  {
    id: 'starter-2-first-route',
    title: 'Bước 2: Khai trương đường bay đầu tiên',
    description: 'Thiết lập đường bay giữa 2 thành phố (ví dụ: SGN - DAD hoặc HAN - DAD).',
    target: 1,
    progress: 0,
    reward: 750000,
    rewardXp: 200,
    done: false,
    category: 'starter',
    icon: '🗺️',
  },
  {
    id: 'starter-3-hire-staff',
    title: 'Bước 3: Xây dựng tổ bay tối thiểu',
    description: 'Thuê đủ phi công, tiếp viên và kỹ sư bảo dưỡng cho hoạt động bay.',
    target: 3,
    progress: 0,
    reward: 400000,
    rewardXp: 150,
    done: false,
    category: 'starter',
    icon: '👨‍✈️',
  },
  {
    id: 'starter-4-first-revenue',
    title: 'Bước 4: Thu lợi nhuận thương mại',
    description: 'Khai thác đường bay và tích lũy ít nhất 200.000 $ doanh thu.',
    target: 200000,
    progress: 0,
    reward: 600000,
    rewardXp: 250,
    done: false,
    category: 'starter',
    icon: '💰',
  },
  {
    id: 'starter-5-upgrade-plane',
    title: 'Bước 5: Hiện đại hóa tàu bay',
    description: 'Nâng cấp Winglets tiết kiệm nhiên liệu hoặc khoang thương gia cho 1 máy bay.',
    target: 1,
    progress: 0,
    reward: 800000,
    rewardXp: 200,
    done: false,
    category: 'starter',
    icon: '⚡',
  },
  {
    id: 'starter-6-three-routes',
    title: 'Bước 6: Mở rộng mạng lưới 3 đường bay',
    description: 'Khai thác tối thiểu 3 tuyến bay nối các sân bay trên toàn quốc.',
    target: 3,
    progress: 0,
    reward: 1500000,
    rewardXp: 400,
    done: false,
    category: 'starter',
    icon: '🌐',
  },
  {
    id: 'starter-7-reach-level-5',
    title: 'Bước 7: Vươn tầm đẳng cấp Cấp 5',
    description: 'Tích lũy XP từ các chuyến bay để thăng cấp lên Hãng bay Cấp 5.',
    target: 5,
    progress: 1,
    reward: 2000000,
    rewardXp: 500,
    done: false,
    category: 'starter',
    icon: '👑',
  },
];

// Nhiệm vụ hàng ngày & tuần
export const dailyMissions: Mission[] = [  {
    id: 'daily-pax-10k',
    title: 'Vận chuyển 10.000 hành khách',
    description: 'Đáp ứng nhu cầu đi lại trên tất cả các đường bay.',
    target: 10000,
    progress: 0,
    reward: 350000,
    rewardXp: 120,
    done: false,
    category: 'daily',
    icon: '🧳',
  },
  {
    id: 'daily-maintenance',
    title: 'Bảo trì định kỳ an toàn',
    description: 'Thực hiện ít nhất 2 lần bảo trì kỹ thuật cho đội bay.',
    target: 2,
    progress: 0,
    reward: 250000,
    rewardXp: 100,
    done: false,
    category: 'daily',
    icon: '🔧',
  },
  {
    id: 'daily-profit-500k',
    title: 'Đạt 500.000 $ lợi nhuận ròng',
    description: 'Tối ưu hóa giá vé và hệ số lấp đầy để tăng thu nhập.',
    target: 500000,
    progress: 0,
    reward: 500000,
    rewardXp: 200,
    done: false,
    category: 'daily',
    icon: '📈',
  },
];

// Pool 8 quest tuần — mỗi mùa Thứ 2→CN bốc 3 quest. Giữ target vừa sức 15-30 phút/ngày.
export const weeklyMissionPool: Mission[] = [
  { id: 'weekly-pax-50k', title: 'Chuyên chở 50.000 hành khách', description: 'Khai thác đều các tuyến trong tuần.', target: 50000, progress: 0, reward: 1200000, rewardXp: 400, done: false, category: 'weekly', icon: '🧳' },
  { id: 'weekly-profit-5m', title: 'Lãi ròng 5.000.000 $ trong tuần', description: 'Tối ưu giá vé và lấp đầy.', target: 5000000, progress: 0, reward: 1500000, rewardXp: 500, done: false, category: 'weekly', icon: '📈' },
  { id: 'weekly-ontime-100', title: '100 chuyến hạ cánh đúng giờ', description: 'Giữ hao mòn dưới 80% để tránh delay.', target: 100, progress: 0, reward: 1000000, rewardXp: 350, done: false, category: 'weekly', icon: '⏱️' },
  { id: 'weekly-maintain-10', title: '10 lần bảo trì an toàn', description: 'Chăm đội bay như chăm phi công.', target: 10, progress: 0, reward: 800000, rewardXp: 300, done: false, category: 'weekly', icon: '🔧' },
  { id: 'weekly-routes-5', title: 'Duy trì 5 tuyến có lãi', description: 'Mọi tuyến active đều profit/giờ > 0.', target: 5, progress: 0, reward: 1200000, rewardXp: 400, done: false, category: 'weekly', icon: '🗺️' },
  { id: 'weekly-reputation-80', title: 'Đạt 80 điểm danh tiếng', description: 'Giá tốt + xử lý sự kiện khéo.', target: 80, progress: 70, reward: 1000000, rewardXp: 350, done: false, category: 'weekly', icon: '⭐' },
  { id: 'weekly-fleet-5', title: 'Sở hữu 5 máy bay', description: 'Mở rộng hangar trong tuần.', target: 5, progress: 0, reward: 1300000, rewardXp: 450, done: false, category: 'weekly', icon: '✈️' },
  { id: 'weekly-golden-20', title: '20 chuyến hạ cánh trong Golden Hour', description: 'Bay đúng khung giờ vàng x1.5 nhu cầu.', target: 20, progress: 0, reward: 1100000, rewardXp: 400, done: false, category: 'weekly', icon: '🌟' },
];

// Lịch điểm danh 7 ngày — ngày 7 tặng ATR 72 miễn phí (tái dùng logic dashboard).
export const LOGIN_REWARDS: { day: number; label: string; cash: number; xp: number; planeBonus?: boolean }[] = [
  { day: 1, label: 'Ngày 1 · 200.000 $', cash: 200000, xp: 80 },
  { day: 2, label: 'Ngày 2 · 400.000 $', cash: 400000, xp: 120 },
  { day: 3, label: 'Ngày 3 · 600.000 $', cash: 600000, xp: 150 },
  { day: 4, label: 'Ngày 4 · 800.000 $', cash: 800000, xp: 200 },
  { day: 5, label: 'Ngày 5 · 1.000.000 $', cash: 1000000, xp: 250 },
  { day: 6, label: 'Ngày 6 · 1.500.000 $ + 1 điểm nghiên cứu', cash: 1500000, xp: 300 },
  { day: 7, label: 'Ngày 7 · ATR 72 miễn phí', cash: 500000, xp: 400, planeBonus: true },
];

// 30 Thành tựu chi tiết
export const achievementsList: { id: string; title: string; desc: string; icon: string; target: number; metric: string }[] = [
  { id: 'ach-1', title: 'Triệu phú đầu tiên', desc: 'Sở hữu số dư tiền mặt đạt 1.000.000 $', icon: '💰', target: 1000000, metric: 'cash' },
  { id: 'ach-2', title: 'Đại gia hàng không', desc: 'Sở hữu số dư tiền mặt vượt 50.000.000 $', icon: '🏦', target: 50000000, metric: 'cash' },
  { id: 'ach-3', title: 'Đế chế trăm triệu đô', desc: 'Giá trị hãng hàng không đạt 100.000.000 $', icon: '💎', target: 100000000, metric: 'valuation' },
  { id: 'ach-4', title: 'Cất cánh lần đầu', desc: 'Mua chiếc máy bay đầu tiên vào đội bay', icon: '🛫', target: 1, metric: 'planes' },
  { id: 'ach-5', title: 'Biệt đội 5 chiếc', desc: 'Sở hữu ít nhất 5 máy bay trong hangar', icon: '🛩️', target: 5, metric: 'planes' },
  { id: 'ach-6', title: 'Đội bay hùng hậu', desc: 'Mở rộng đội bay lên 10 chiếc', icon: '✈️', target: 10, metric: 'planes' },
  { id: 'ach-7', title: 'Hạm đội bầu trời', desc: 'Sở hữu từ 25 máy bay trở lên', icon: '🚀', target: 25, metric: 'planes' },
  { id: 'ach-8', title: 'Chúa tể không phận', desc: 'Sở hữu 50 máy bay đa dạng chủng loại', icon: '🌌', target: 50, metric: 'planes' },
  { id: 'ach-9', title: 'Đường bay đầu tay', desc: 'Khai trương tuyến bay thương mại đầu tiên', icon: '📍', target: 1, metric: 'routes' },
  { id: 'ach-10', title: 'Mạng bay 3 miền', desc: 'Khai thác tối thiểu 5 đường bay', icon: '🗺️', target: 5, metric: 'routes' },
  { id: 'ach-11', title: 'Mạng lưới bao phủ', desc: 'Khai thác từ 10 đường bay đồng thời', icon: '🌐', target: 10, metric: 'routes' },
  { id: 'ach-12', title: 'Trục vàng Bắc - Nam', desc: 'Mở tuyến bay huyết mạch SGN - HAN', icon: '⭐', target: 1, metric: 'route_sgn_han' },
  { id: 'ach-13', title: 'Vươn ra biển lớn', desc: 'Mở đường bay quốc tế đầu tiên (BKK, SIN...)', icon: '🌏', target: 1, metric: 'intl_routes' },
  { id: 'ach-14', title: 'Kết nối châu Á', desc: 'Mở toàn bộ 5 đường bay quốc tế trong game', icon: '🏯', target: 5, metric: 'intl_routes' },
  { id: 'ach-15', title: 'Thợ bảo trì gương mẫu', desc: 'Thực hiện 10 lần bảo trì máy bay định kỳ', icon: '🔧', target: 10, metric: 'maintenance_count' },
  { id: 'ach-16', title: 'An toàn tuyệt đối', desc: 'Thực hiện 50 lần bảo dưỡng thành công', icon: '🛡️', target: 50, metric: 'maintenance_count' },
  { id: 'ach-17', title: 'Khoang hạng nhất', desc: 'Nâng cấp ghế thương gia cho 5 máy bay', icon: '🛋️', target: 5, metric: 'business_upgrades' },
  { id: 'ach-18', title: 'Hàng không xanh', desc: 'Gắn Winglets tiết kiệm nhiên liệu cho 5 máy bay', icon: '🌱', target: 5, metric: 'winglet_upgrades' },
  { id: 'ach-19', title: 'Nhà nghiên cứu tài ba', desc: 'Đạt tối đa cấp 5 của một nhánh nghiên cứu', icon: '🧪', target: 5, metric: 'max_research_branch' },
  { id: 'ach-20', title: 'Đỉnh cao công nghệ', desc: 'Hoàn thành tất cả 15 cấp độ nghiên cứu', icon: '🔬', target: 15, metric: 'total_research' },
  { id: 'ach-21', title: 'Căn cứ thứ 2', desc: 'Thành lập sân bay căn cứ phụ thứ hai', icon: '🏢', target: 1, metric: 'second_base' },
  { id: 'ach-22', title: 'Trùm giữ Slot', desc: 'Sở hữu tổng cộng từ 30 slot sân bay', icon: '🎫', target: 30, metric: 'total_slots' },
  { id: 'ach-23', title: 'Đội ngũ tinh hoa', desc: 'Thuê và đào tạo ít nhất 6 nhân sự đạt 5 sao', icon: '🌟', target: 6, metric: 'five_star_staff' },
  { id: 'ach-24', title: 'Nhà quản trị cấp cao', desc: 'Đạt cấp độ 10 trong game', icon: '🎖️', target: 10, metric: 'level' },
  { id: 'ach-25', title: 'Huyền thoại hàng không', desc: 'Đạt cấp độ 20 trong game', icon: '👑', target: 20, metric: 'level' },
  { id: 'ach-26', title: 'Khủng long bầu trời', desc: 'Sở hữu siêu phi cơ Airbus A380-800', icon: '🐘', target: 1, metric: 'has_a380' },
  { id: 'ach-27', title: 'Uy tín tín dụng', desc: 'Vay và trả nợ ngân hàng thành công', icon: '🤝', target: 1, metric: 'loan_repaid' },
  { id: 'ach-28', title: 'Hãng bay số 1 Việt Nam', desc: 'Vượt qua VietSky Airways trên Bảng xếp hạng', icon: '🥇', target: 1, metric: 'rank_first' },
  { id: 'ach-29', title: 'Tự động hóa toàn diện', desc: 'Mở khóa chế độ Tự động quản lý (Cấp 15)', icon: '🤖', target: 15, metric: 'auto_manage' },
  { id: 'ach-30', title: 'Hãng bay thế kỷ', desc: 'Hoạt động bền vững đạt 500 giao dịch thương mại', icon: '🏆', target: 500, metric: 'total_transactions' },
];

// 20 hãng đối thủ AI mang tên Việt Nam
export const aiAirlines = [
  'VietSky Airways',
  'Saigon Air',
  'Mekong Airlines',
  'Đại Việt Air',
  'Cánh Én Việt',
  'Bamboo Horizon',
  'Hoa Sen Airlines',
  'Pacific Dragon',
  'Thăng Long Air',
  'Biển Đông Airways',
  'Phượng Hoàng Việt',
  'Sông Hồng Airlines',
  'VinaJet Express',
  'Trường Sơn Air',
  'Lotus Wings',
  'Miền Trung Airlines',
  'Đất Việt Airways',
  'Blue Mekong',
  'Sao Vàng Air',
  'Thiên Long Airlines',
];

// Đội ngũ nhân viên mẫu khởi đầu
export const initialStaffCandidates: Staff[] = [
  { id: 'staff-1', role: 'Phi công', name: 'Nguyễn Văn Hùng', skill: 3, salaryPerHour: 35, morale: 95 },
  { id: 'staff-2', role: 'Phi công', name: 'Trần Minh Đức', skill: 4, salaryPerHour: 48, morale: 90 },
  { id: 'staff-3', role: 'Tiếp viên', name: 'Lê Hoàng Mai', skill: 3, salaryPerHour: 18, morale: 98 },
  { id: 'staff-4', role: 'Tiếp viên', name: 'Phạm Thu Thảo', skill: 4, salaryPerHour: 24, morale: 92 },
  { id: 'staff-5', role: 'Kỹ sư', name: 'Vũ Quốc Bảo', skill: 4, salaryPerHour: 32, morale: 94 },
  { id: 'staff-6', role: 'Kỹ sư', name: 'Đỗ Tuấn Kiệt', skill: 5, salaryPerHour: 45, morale: 96 },
];

export const randomEventTemplates = [
  {
    kind: 'fuel_surge' as const,
    title: 'Giá dầu thế giới tăng vọt!',
    description: 'Căng thẳng địa chính trị khiến giá nhiên liệu Jet A-1 tăng 20% trong 1 giờ tới.',
    effectLabel: 'Chi phí nhiên liệu +20% toàn mạng bay',
    fuelMultiplier: 1.2,
  },
  {
    kind: 'fuel_drop' as const,
    title: 'Nguồn cung dầu dồi dào, giá nhiên liệu giảm mạnh!',
    description: 'OPEC+ tăng sản lượng, giá nhiên liệu máy bay giảm 20% trong 1 giờ tới.',
    effectLabel: 'Chi phí nhiên liệu -20% toàn mạng bay',
    fuelMultiplier: 0.8,
  },
  {
    kind: 'storm' as const,
    title: 'Bão nhiệt đới đổ bộ dải ven biển miền Trung!',
    description: 'Thời tiết xấu gây trễ chuyến và giảm nhu cầu bay qua Đà Nẵng, Cam Ranh, Huế.',
    effectLabel: 'Giảm 50% doanh thu các tuyến qua DAD, CXR, HUI',
    affectedAirports: ['DAD', 'CXR', 'HUI'],
  },
  {
    kind: 'festival' as const,
    title: 'Lễ hội Festival du lịch kích cầu toàn quốc!',
    description: 'Nhu cầu hành khách bùng nổ trong kỳ nghỉ lễ, tỷ lệ lấp đầy máy bay tăng vọt.',
    effectLabel: 'Nhu cầu hành khách +30% trong 2 giờ tới',
    demandMultiplier: 1.3,
  },
  {
    kind: 'inspection' as const,
    title: 'Cục Hàng không kiểm tra an toàn đột xuất!',
    description: 'Đoàn thanh tra kiểm tra độ an toàn đội bay. Máy bay có hao mòn trên 80% sẽ bị phạt cảnh cáo.',
    effectLabel: 'Phạt tiền nếu máy bay hao mòn > 80%',
  },
];
