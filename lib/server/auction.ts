import { randomUUID } from 'node:crypto';
import { mutateDB, type Pilot, type SlotAuction } from './onlineStore';

/**
 * Đấu giá slot sân bay.
 *
 * **Ký quỹ.** Người đứng giá bị trừ tiền ngay khi đặt, và chỉ giữ lại phần chênh
 * lệch so với giá mình đang nắm. Đổi người đứng giá thì người cũ được hoàn toàn
 * bộ phần đã ký quỹ, người mới trả phần chênh lệch. Nhờ vậy lúc chốt phiên chỉ
 * cần trừ nốt `escrowed` — không phải dò lại toàn bộ lịch sử giá, và người thắng
 * chưa bao giờ phải trả nhiều hơn số tiền họ đã bị giữ.
 *
 * Người mở phiên không đặt giá nên không bị ký quỹ gì; `price` lúc đầu chỉ là mốc
 * để người khác đấu vào, và `escrowed = 0` nên lúc chốt sẽ trừ đúng giá đấu thắng.
 *
 * Phiên hết hạn được chốt trong lượt ghi kế tiếp. Client poll nên không cần
 * cron: chỉ cần có ai xem là phiên cũ được dọn.
 */

export const AUCTION_MS = 5 * 60 * 1000;
/** Bước giá tối thiểu — chặn spam đấu giá tăng vô hạn và trả phí KV. */
export const MIN_STEP = 100_000;
export const MIN_BID = 500_000;
export const MAX_BID = 1e9;

/** Độ chênh tối thiểu giữa hai lượt đấu liên tiếp. */
const minimumBid = (current: number): number => current + MIN_STEP;

const startPriceFor = (slots: number): number => Math.max(MIN_BID, slots * 400_000);

type SettleResult<T> = { ok: true; auction: SlotAuction } & T | { ok: false; error: string };

/**
 * Chốt các phiên đã quá hạn và ghi danh sách còn lại vào `db.auctions`.
 *
 * **Tự gán `db.auctions`** — bắt buộc. Nếu để người gọi tự gán thì sẽ có chỗ
 * quên, và hậu quả là phiên đã chốt vẫn nằm trong DB: lượt sau chốt lại lần
 * nữa và người thắng bị trừ tiền nhiều lần cho cùng một slot.
 *
 * Hàm thuần về phía I/O — chạy bên trong lượt ghi, không tự ghi ra ngoài.
 */
function settleExpired(db: { pilots: Pilot[]; auctions: SlotAuction[] }, now: number): SlotAuction[] {
  const expired = db.auctions.filter((a) => a.endsAt <= now);
  for (const auction of expired) {
    // Chưa ai đấu vào (`escrowed = 0`) thì hủy im lặng, không tốn tiền ai.
    if (auction.escrowed <= 0) continue;
    const winner = db.pilots.find((p) => p.id === auction.bidderId);
    // Tài khoản đã xoá: không có ai để trả, phiên hủy.
    if (!winner) continue;
    // Tiền đã bị giữ lúc đặt giá nên chỉ cần xác nhận vẫn còn đủ trước khi trừ
    // nốt — phòng khi tài khoản bị sửa dữ liệu ngoài dự kiến.
    if (winner.value < auction.escrowed) continue;
    winner.value -= auction.escrowed;
    winner.slots = (winner.slots ?? 0) + auction.slots;
  }
  db.auctions = db.auctions.filter((a) => a.endsAt > now);
  return db.auctions;
}

/**
 * Chốt phiên hết hạn rồi trả về danh sách phiên đang mở.
 *
 * Gọi ở đầu mọi thao tác đấu giá nên không cần lịch chạy nền.
 *
 * Phải gán `db.auctions` — bỏ qua bước này thì phiên đã chốt vẫn nằm trong DB
 * và lượt sau sẽ chốt lại, tức là trừ tiền người thắng nhiều lần.
 */
export function listAuctions(): Promise<SlotAuction[]> {
  return mutateDB((db) => settleExpired(db, Date.now()));
}

/**
 * Mở phiên đấu giá mới cho một sân bay. Giá mở đầu theo số slot, người mở không
 * bị trừ tiền.
 */
export async function openAuction(pilot: Pilot, airport: string, slots: number): Promise<SettleResult<{ created: boolean }>> {
  const code = String(airport || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(code)) return { ok: false, error: 'Ma san bay khong hop le.' };
  const count = Math.max(1, Math.min(10, Math.round(slots)));

  return mutateDB((db) => {
    const now = Date.now();
    settleExpired(db, now);
    if (db.auctions.some((a) => a.airport === code)) {
      return { ok: false as const, error: 'San bay nay dang co phien dau gia.' };
    }
    const auction: SlotAuction = {
      id: randomUUID(), airport: code, price: startPriceFor(count), slots: count,
      bidder: '', bidderId: '', bidderName: '', openerId: pilot.id,
      escrowed: 0, endsAt: now + AUCTION_MS,
    };
    db.auctions.push(auction);
    return { ok: true as const, auction, created: true };
  });
}

/**
 * Đặt giá. Giá phải cao hơn giá hiện tại ít nhất `MIN_STEP`.
 *
 * Người đang giá phải nâng giá của chính mình; người khác vượt thì phần chênh
 * lệch được giữ lại và người cũ nhận lại toàn bộ phần đã ký quỹ.
 */
export async function placeBid(pilot: Pilot, auctionId: string, amount: number): Promise<SettleResult<{ newPrice: number }>> {
  const bid = Math.round(amount);
  if (!Number.isFinite(bid) || bid < MIN_BID || bid > MAX_BID) {
    return { ok: false, error: `Gia dat phai tu ${MIN_BID.toLocaleString('vi-VN')} den ${MAX_BID.toLocaleString('vi-VN')} $.` };
  }

  return mutateDB((db) => {
    const now = Date.now();
    settleExpired(db, now);

    const auction = db.auctions.find((a) => a.id === auctionId);
    if (!auction) return { ok: false as const, error: 'Phien dau gia khong con hieu luc.' };

    const minimum = minimumBid(auction.price);
    if (bid < minimum) return { ok: false as const, error: `Gia phai it nhat ${minimum.toLocaleString('vi-VN')} $.` };

    const row = db.pilots.find((p) => p.id === pilot.id);
    if (!row) return { ok: false as const, error: 'Tai khoan khong con ton tai.' };

    const held = auction.bidderId === pilot.id ? auction.escrowed : 0;
    const delta = bid - held;
    if (delta > 0 && row.value < delta) {
      return { ok: false as const, error: 'Ban khong du tien cho muc dat gia nay.' };
    }
    if (delta > 0) row.value -= delta;

    // Người bị vượt nhận lại toàn bộ phần đã ký quỹ — không còn giữ giá nữa.
    if (auction.bidderId && auction.bidderId !== pilot.id) {
      const outbid = db.pilots.find((p) => p.id === auction.bidderId);
      if (outbid) outbid.value = Math.min(1e13, outbid.value + auction.escrowed);
    }

    auction.price = bid;
    auction.bidder = pilot.code;
    auction.bidderId = pilot.id;
    auction.bidderName = pilot.name.slice(0, 32);
    auction.escrowed = bid;
    auction.endsAt = now + AUCTION_MS; // đặt giá kéo dài thêm cho người sau

    return { ok: true as const, auction, newPrice: bid };
  });
}

/**
 * Hủy phiên mình vừa mở khi chưa ai đấu vào. Khi đã có người đặt giá thì không
 * hủy được — nếu không người kia đã bị giữ tiền mà chờ mãi không ai chốt.
 */
export async function cancelAuction(pilot: Pilot, auctionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return mutateDB((db) => {
    settleExpired(db, Date.now());
    const auction = db.auctions.find((a) => a.id === auctionId);
    if (!auction) return { ok: false as const, error: 'Phien dau gia khong con hieu luc.' };
    if (auction.openerId !== pilot.id) return { ok: false as const, error: 'Chi nguoi mo phien moi huy duoc.' };
    if (auction.escrowed > 0) return { ok: false as const, error: 'Da co nguoi dat gia — phia se tu dong ket thuc.' };
    db.auctions = db.auctions.filter((a) => a.id !== auctionId);
    return { ok: true as const };
  });
}