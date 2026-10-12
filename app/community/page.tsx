'use client';
import { useEffect, useState } from 'react';
import { GameShell, PageHeading } from '@/components/game-shell';
import { netClient, type AlliancePreview, type SeasonSummary, type SlotAuction, type UsedPlaneListing } from '@/lib/net/netClient';
function CommunityContent() {
  const [season, setSeason] = useState<SeasonSummary | null>(null), [alliance, setAlliance] = useState<AlliancePreview | null>(null), [market, setMarket] = useState<UsedPlaneListing[]>([]), [chat, setChat] = useState<{id:string;sender:string;message:string;at:number}[]>([]), [message, setMessage] = useState('');
  useEffect(() => { netClient.getSeason().then(setSeason); netClient.getAlliance().then(setAlliance); netClient.getUsedMarket().then(setMarket); }, []);
  useEffect(() => { let stop = false; const poll = async () => { try { const since = chat.length ? chat[chat.length - 1].at : 0; const msgs = await netClient.getChat(since); if (!stop && msgs.length) setChat((prev) => [...prev.slice(-50), ...msgs.filter((m) => !prev.some((p) => p.id === m.id))]); } catch {} }; const tm = setInterval(poll, 4000); return () => { stop = true; clearInterval(tm); }; });
  const [chatError, setChatError] = useState('');

  // Đấu giá slot sân bay — dữ liệu thật, nên phải tự quản lý vòng cập nhật.
  const [auctions, setAuctions] = useState<SlotAuction[]>([]);
  const [auctionBusy, setAuctionBusy] = useState(false);
  const [auctionError, setAuctionError] = useState('');
  const [newAirport, setNewAirport] = useState('');

  const refreshAuctions = async () => {
    setAuctionBusy(true);
    setAuctions(await netClient.getAuctions());
    setAuctionBusy(false);
  };

  useEffect(() => {
    void refreshAuctions();
    // 30s: phiên đấu giá thường dài 5 phút, cần thấy giá và thời gian còn lại.
    const tm = setInterval(() => void refreshAuctions(), 30_000);
    return () => clearInterval(tm);
  }, []);

  const doBid = async (auction: SlotAuction) => {
    const step = Math.max(100_000, Math.round(auction.price * 0.05));
    const bid = auction.price + step;
    const input = window.prompt(`Đặt giá cho slot ${auction.airport} ×${auction.slots}.\nGia hien tai: ${auction.price.toLocaleString('vi-VN')} $\nNhap gia ban muon dat (it nhat ${bid.toLocaleString('vi-VN')} $):`, String(bid));
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount)) { setAuctionError('Giá không hợp lệ.'); return; }
    setAuctionBusy(true);
    const result = await netClient.bidAuction(auction.id, amount);
    setAuctionBusy(false);
    if (result.error) { setAuctionError(result.error); return; }
    setAuctionError('');
    setAuctions(result.auctions);
  };

  const doOpen = async () => {
    const code = newAirport.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,4}$/.test(code)) { setAuctionError('Mã sân bay phải gồm 3–4 chữ hoặc số, ví dụ DAD.'); return; }
    setAuctionBusy(true);
    const result = await netClient.openAuction(code, 2);
    setAuctionBusy(false);
    if (result.error) { setAuctionError(result.error); return; }
    setAuctionError('');
    setNewAirport('');
    setAuctions(result.auctions);
  };
  const send = async () => {
    if (!message.trim()) return;
    try {
      const item = await netClient.sendChat('lien-minh', message.trim());
      setChat((prev) => [...prev, item]);
      setMessage('');
      setChatError('');
    } catch (err) {
      // Giữ nguyên nội dung ô soạn để không mất tin khi server từ chối (sai quyền, quá tần suất).
      setChatError(err instanceof Error ? err.message : 'Gửi tin nhắn thất bại.');
    }
  };
  return <><PageHeading title="Cộng đồng hàng không" subtitle={season?.status === 'live' ? 'Đang online thật: mùa giải, liên minh và chợ theo server.' : 'Mùa giải, liên minh và thị trường người chơi · Đang offline, dùng dữ liệu minh họa.'}/><section className="community-grid">
    <article className="card community-card"><span className="eyebrow">MÙA GIẢI · 30 NGÀY</span><h2>{season?.name ?? 'Đang tải mùa giải'}</h2><p>Còn {season?.daysLeft ?? '—'} ngày · Thưởng top 100: {season?.reward ?? 'đang cập nhật'}</p><b className="coming-soon">{season?.status === 'live' ? 'Đang live · reset theo server' : 'Sắp ra mắt · cần máy chủ'}</b><div className="progress"><i style={{width:'62%'}}/></div><small>Tiến độ mùa minh họa · điểm mùa đặt lại sau mỗi 30 ngày</small><div className="season-ranks">{[['1','VietSky','2.450.000'],['2','Saigon Air','2.120.000'],['3','Cánh Én Việt','1.890.000']].map(([rank,name,points])=><div key={rank}><b>#{rank} {name}</b><span>{points} điểm</span></div>)}</div></article>
    <article className="card community-card"><span className="eyebrow">SỰ KIỆN TOÀN SERVER</span><h2>Tuần lễ vàng</h2><p>Nhu cầu toàn server tăng 20% trong 02 ngày 14 giờ.</p><b className="coming-soon">Tham gia mô phỏng · thưởng 25.000 $</b></article>
    <article className="card community-card"><span className="eyebrow">LIÊN MINH · TỐI ĐA 10 HÃNG</span><h2>{alliance?.name ?? 'Đang tìm liên minh'}</h2><p>{alliance?.members ?? '—'}/{alliance?.capacity ?? 10} thành viên · Đóng góp: {alliance?.contribution ?? 0} điểm</p><div className="btn-row"><button className="btn" onClick={()=>window.alert('Luồng tạo/tham gia liên minh đang chạy bằng dữ liệu minh họa.')}>Tạo hoặc tham gia</button><button className="btn secondary" onClick={()=>window.alert('Chọn một máy bay trong đội để góp vào tuyến bay chung (mô phỏng).')}>Góp máy bay mở tuyến chung</button></div><div className="chat-preview">{chat.map(x=><p key={x.id}><b>{x.sender}:</b> {x.message}</p>)}<div className="field-row"><input className="input" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Nhắn tin liên minh"/><button className="btn" onClick={send}>Gửi</button></div>{chatError && <small className="negative">{chatError}</small>}</div></article>
    <article className="card community-card"><span className="eyebrow">CHỢ MÁY BAY CŨ & ĐẤU GIÁ SLOT</span><h2>Giao dịch của các hãng</h2><p>Tin rao mẫu từ cộng đồng. Giao dịch máy chủ sẽ mở sau.</p>{market.map(x=><div className="market-row" key={x.id}><span><b>{x.model}</b><small>{x.seller} · hao mòn {x.wear}%</small></span><b>{x.price.toLocaleString('vi-VN')} $</b></div>)}
      {/* Đấu giá slot sân bay — dữ liệu thật từ máy chủ. */}
      <div style={{marginTop:14,borderTop:'1px solid var(--line)',paddingTop:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <b style={{fontSize:14}}>Đấu giá slot sân bay</b>
          <button className="btn ghost compact" onClick={()=>void refreshAuctions()} style={{marginLeft:'auto'}}>{auctionBusy?'Đang tải…':'Làm mới'}</button>
        </div>
        {auctions.length===0 && <p className="muted" style={{fontSize:12}}>Chưa có phiên nào đang mở. Mở một phiên để người chơi khác đấu giá slot.</p>}
        {auctions.map(a=>(
          <div className="market-row" key={a.id}>
            <span>
              <b>Slot {a.airport} ×{a.slots}</b>
              <small>{a.bidder?`Giá cao nhất: ${a.bidderName} · còn ${Math.max(0,Math.round((a.endsAt-Date.now())/60000))} phút`:'Chưa ai đặt giá'} · hiện tại {a.price.toLocaleString('vi-VN')} $</small>
            </span>
            <button className="btn secondary" disabled={auctionBusy} onClick={()=>void doBid(a)}>Đặt giá</button>
          </div>
        ))}
        <div className="field-row" style={{marginTop:10,flexWrap:'wrap'}}>
          <input className="input" placeholder="Sân bay, ví dụ DAD" value={newAirport} onChange={e=>setNewAirport(e.target.value)} style={{maxWidth:140}}/>
          <button className="btn secondary" disabled={auctionBusy} onClick={()=>void doOpen()}>Mở phiên 2 slot</button>
        </div>
        {auctionError && <small className="negative" style={{display:'block',marginTop:8}}>{auctionError}</small>}
      </div>
      <button className="btn secondary" style={{marginTop:10}} onClick={()=>window.alert('Đăng bán máy bay: chọn máy bay và giá rào.')}>Đăng bán máy bay</button></article>
  </section></>;
}
export default function Community(){return <GameShell><CommunityContent/></GameShell>}
