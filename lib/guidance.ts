/**
 * Gợi ý "nên làm gì tiếp theo" — tính từ state thật, không hard-code theo cấp.
 *
 * Trước đây dashboard chỉ có 4 nhánh điều kiện (có máy bay chưa, có tuyến chưa,
 * máy bay mòn chưa, còn lại thì bảo nhiệm vụ). Người mới bị kẹt khi đội bay 3 máy
 * bay mà không hiểu vì sao lợi nhuận không tăng. Ở đây mỗi bước kèm luôn:
 * - `why`: tại sao bước này là bước đó (đọc được, không phải mỹ thuật),
 * - `earn`: đổi lại bước này mang về bao nhiêu tiền/XP,
 * - `detail`: con số cụ thể đang khiến họ bị chặn (tiền thiếu, tuyến lỗ, v.v.).
 */

import { formatCurrency } from './formulas';
import { difficultyOf, xpRequiredFor, PROFIT_PER_XP } from './tuning';
import type { GameState } from '@/types';

export interface NextAction {
  id: string;
  title: string;
  text: string;
  /** Vì sao đây là bước hợp lý nhất lúc này. */
  why: string;
  /** Đổi lại bước này được gì. */
  earn: string;
  cta: string;
  href: string;
  /** Mức độ gấp: 0 = bình thường, 1 = đang mất tiền, 2 = gần phá sản. */
  urgency: 0 | 1 | 2;
}

/** Máy bay phủ sinh lợi nhuận âm — nguyên nhân chết âm thầm phổ biến nhất của người mới. */
const losingRoutes = (state: GameState) => state.routes.filter((r) => r.active && (r.profitPerHour || 0) < 0);

export function nextBestAction(state: GameState, format: (n: number) => string = (n) => formatCurrency(n, 'USD')): NextAction {
  const cash = state.airline?.cash ?? 0;
  const level = state.airline?.level ?? 1;
  const difficulty = difficultyOf(state);
  const planes = state.planes ?? [];
  const routes = state.routes ?? [];
  const openStarter = (state.missions ?? []).find((m) => m.category === 'starter' && !m.done);
  const xpNeeded = xpRequiredFor(level);

  // 1. Hết tiền — luôn ưu tiên tuyệt đối, kể cả khi còn máy bay.
  if (cash < 0) {
    return {
      id: 'rescue',
      title: 'Số dư âm — cứu hãng trước khi phá sản',
      text: `Bạn đang âm ${format(Math.abs(cash))}. Hãng âm tiền quá 10 ngày game sẽ bị phá sản hoá, mất 50% tài sản.`,
      why: 'Âm tiền là trạng thái không thể chấp nhận được — mọi việc khác đều phải đứng sau.',
      earn: 'Bán bớt 1 máy bay hoặc dừng tuyến lỗ ngay lấy lại dòng tiền.',
      cta: 'Đến tài chính',
      href: '/finance',
      urgency: 2,
    };
  }

  // 2. Chưa có máy bay.
  if (!planes.length) {
    return {
      id: 'first-plane',
      title: 'Mua máy bay đầu tiên',
      text: 'ATR 72 rẻ, tầm bay ngắn và phù hợp các chặng nội địa như SGN → DAD.',
      why: 'Chưa có máy bay thì không chuyến nào cất cánh được — đây là bước mở đầu tiên.',
      earn: `Số dư hiện có ${format(cash)}, đủ mua ATR 72 và còn dự phòng.`,
      cta: 'Chọn ATR 72',
      href: '/fleet?open=catalog',
      urgency: 0,
    };
  }

  // 3. Có máy bay nhưng chưa có tuyến — vẫn chưa có đồng nào.
  if (!routes.length) {
    return {
      id: 'first-route',
      title: 'Mở đường bay đầu tiên',
      text: 'Chúng tôi đã chọn sẵn máy bay phù hợp và mức giá vé gợi ý cho tuyến ngắn.',
      why: 'Máy bay đứng yên thì không sinh tiền — tuyến bay là nơi doanh thu bắt đầu.',
      earn: 'Mỗi chuyến hạ cánh là một khoản tiền cộng vào két.',
      cta: 'Thiết lập đường bay',
      href: '/routes?create=1&suggest=1',
      urgency: 0,
    };
  }

  // 4. Tuyến đang lỗ — âm mỗi giờ, càng để lâu càng lỗ.
  const losers = losingRoutes(state);
  if (losers.length) {
    const worst = losers.sort((a, b) => (a.profitPerHour || 0) - (b.profitPerHour || 0))[0];
    return {
      id: 'fix-losing-route',
      title: `${losers.length} tuyến đang lỗ`,
      text: `${worst.from} → ${worst.to} đang âm ${format(Math.abs(worst.profitPerHour || 0))}/giờ game.`,
      why: 'Máy bay bay đường càng lâu càng lỗ, tiền vơ ra mà không về két.',
      earn: 'Hạ giá vé quanh mức gợi ý, giảm tần suất bay hoặc ngừng tuyến.',
      cta: 'Xem tuyến lỗ',
      href: `/routes?route=${encodeURIComponent(worst.id)}`,
      urgency: 1,
    };
  }

  // 5. Máy bay mòn — chuyến trễ phá chuỗi đúng giờ.
  const worn = planes.filter((p) => p.wear >= 70);
  if (worn.length) {
    return {
      id: 'maintenance',
      title: `${worn.length} máy bay đến hạn bảo trì`,
      text: `Mòn từ 70% trở lên thì tỉ lệ trễ chuyến nhảy lên 18%, làm vỡ chuỗi đúng giờ (+2% lợi nhuận mỗi 5 chuyến).`,
      why: 'Bảo trì rẻ hơn nhiều so với một chuỗi trễ chuyến bị mất.',
      earn: 'Bảo trì xong là lợi nhuận tuyến quay lại ổn định.',
      cta: 'Đến đội bay',
      href: '/fleet',
      urgency: 1,
    };
  }

  // 6. Có điểm nghiên cứu đủ dùng mà chưa dùng — nâng cấp miễn phí đang nằm đó.
  if ((state.researchPoints ?? 0) > 0 && level >= 5) {
    const cheapest = Math.min(...Object.values(state.research ?? {}).map((v) => v)) + 1;
    if ((state.researchPoints ?? 0) >= cheapest) {
      return {
        id: 'research',
        title: 'Nâng cấp nghiên cứu',
        text: `Bạn có ${state.researchPoints} điểm nghiên cứu, đủ nâng nhánh rẻ nhất (cần ${cheapest}).`,
        why: 'Nghiên cứu tiết kiệm nhiên liệu và cải thiện dịch vụ vĩnh viễn — không tốn tiền mặt nữa.',
        earn: 'Mỗi cấp nghiên cứu là giảm chi phí và tăng hệ số lấp đầy vĩnh viễn.',
        cta: 'Mở nghiên cứu',
        href: '/research',
        urgency: 0,
      };
    }
  }

  // 7. Đã ổn → nhắc mục tiêu kế tiếp: tuyến mới, điểm nghiên cứu, cấp mới.
  const openRoutes = routes.filter((r) => r.active).length;
  const nextUnlock = level < 8 ? 8 : level < 12 ? 12 : 99;
  const profitHint = Math.max(0, xpNeeded - (state.airline?.xp ?? 0)) * PROFIT_PER_XP;
  return {
    id: 'grow',
    title: openRoutes < 2 ? 'Mở thêm tuyến để đa dạng rủi ro' : 'Đẩy lợi nhuận lên tầm tiếp theo',
    text:
      level >= nextUnlock
        ? 'Bạn đã mở khóa khu vực sân bay mới — thử tuyến quốc tế dài hơn.'
        : `Cấp ${nextUnlock} mở khoá ${nextUnlock === 8 ? 'căn cứ thứ 2 và vay vốn' : 'sân bay bay xa'}. Còn ${profitHint > 0 ? `khoảng ${format(profitHint)} lợi nhuận nữa` : 'một ít lợi nhuận nữa'} để lên cấp.`,
    why: 'Một tuyến đơn lẻ rủi ro cao và dễ bị cạnh tranh. Nhiều tuyến là hãng bay thật sự.',
    earn: `Mỗi ${format(PROFIT_PER_XP)} lợi nhuận ròng = 1 XP. Độ khó ${difficulty.label}: nhu cầu ×${difficulty.demandMultiplier}.`,
    cta: 'Mở đường bay',
    href: '/routes',
    urgency: 0,
  };
}

/** Giải thích ngắn cho một chỉ số — dùng cho tooltip "số liệu khó đọc". */
export const NUMBER_HELP: Record<string, string> = {
  'Lợi nhuận dự kiến':
    'Tổng lợi nhuận của các tuyến đang bay trong 1 giờ game. 1 phút thực = 1 giờ game, nên nhân với số phút bạn định chơi để biết hàng giờ sẽ vào bao nhiêu tiền.',
  'Thu nhập / phút thực':
    'Tiền thực tế vừa cộng vào két trong 60 giây qua — khác "dự kiến" ở chỗ đã trừ chi phí thật (nhiên liệu, bảo trì, phí sân bay).',
  'Số dư khả dụng':
    'Tiền mặt trong két. Chỉ dùng được khi không còn khoản vay nào chưa trả.',
  'Hệ số lấp đầy':
    'Tỉ lệ ghế đã bán. Dưới 50% nghĩa là đang bán rẻ hơn thị trường — tăng giá nhẹ sẽ kiếm thêm mà không sợ mất khách.',
  'Độ hao mòn':
    'Máy bay mòn dần theo giờ bay. Từ 70% trở lên tỉ lệ trễ chuyến nhảy từ 1,5% lên 18% — bảo trì trước khi tới mốc đó.',
  'XP':
    `Mỗi ${formatCurrency(PROFIT_PER_XP, 'USD')} lợi nhuận ròng cho 1 XP. XP dùng để mở khoá sân bay, nhân sự, nghiên cứu.`,
  'Điểm nghiên cứu':
    'Kiếm được từ lợi nhuận ròng. Dùng để nâng cấp tiết kiệm nhiên liệu, dịch vụ và bảo dưỡng — tiết kiệm tiền mặt dài hạn.',
  'Danh tiếng':
    'Danh tiếng cao = nhiều khách chịu giá cao hơn. Dưới 40 điểm bị báo chí chế giễu và chi phí marketing nhân đôi.',
};