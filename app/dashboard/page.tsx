'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plane,
  Map,
  Wallet,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Clock3,
  Wrench,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Flame,
  Timer,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import {
  GameShell,
  PageHeading,
  StatCard,
  AnimatedCounter,
} from '@/components/game-shell';
import { useGameStore } from '@/store/useGameStore';
import { formatCurrency } from '@/lib/formulas';
import { planes as catalogPlanes, airports as airportCatalog, LOGIN_REWARDS } from '@/lib/mock-data';
import { msUntilMidnight } from '@/lib/game-engine';
import { basePrice, distanceKm } from '@/lib/formulas';

function LoginStrip() {
  const streak = useGameStore((s) => s.loginStreak || 0);
  const claimed = useGameStore((s) => s.loginClaimedDate || '');
  const claimLogin = useGameStore((s) => s.claimLogin);
  const currency = useGameStore((s) => s.currency);
  const today = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
  const done = claimed === today;
  const day = Math.min(7, Math.max(1, streak || 1));
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const ms = msUntilMidnight(now);
  const hh = Math.floor(ms / 3600000), mm = Math.floor((ms % 3600000) / 60000);
  return (
    <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 220px' }}>
        <span className="eyebrow">ĐIỂM DANH · CHUỖI {streak} NGÀY</span>
        <b style={{ display: 'block', fontSize: 16 }}>Quà hôm nay: {LOGIN_REWARDS[day - 1]?.label}</b>
        <small className="muted">Chuỗi ≥3 ngày +1h offline, ≥7 ngày +2h. Reset quest lúc 0h (còn {hh}h{mm}p).</small>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {LOGIN_REWARDS.map((r) => <span key={r.day} className="badge" style={{ background: r.day <= day ? '#12a67822' : 'var(--bg)', color: r.day <= day ? '#12a678' : 'var(--muted)' }}>D{r.day}{r.day === day && !done ? ' •' : ''}</span>)}
        </div>
      </div>
      <button className="btn" disabled={done} onClick={claimLogin}>{done ? 'Đã điểm danh ✓' : `Điểm danh ngày ${day} 🎁`}</button>
    </div>
  );
}

function WeeklyStrip() {
  const season = useGameStore((s) => s.weeklySeason);
  const claimMission = useGameStore((s) => s.claimMission);
  const currency = useGameStore((s) => s.currency);
  if (!season) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div><span className="eyebrow">MÙA TUẦN {season.id}</span><b style={{ display: 'block', fontSize: 16 }}>3 nhiệm vụ tuần — reset Thứ 2</b></div>
        <Link className="btn ghost" href="/missions">Chi tiết</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {season.quests.map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          return (
            <div key={q.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{q.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><b>{q.title}</b><span className="muted">{Math.floor(q.progress).toLocaleString('vi-VN')}/{q.target.toLocaleString('vi-VN')}</span></div>
                <div className="progress" style={{ height: 6 }}><i style={{ width: `${pct}%` }} /></div>
              </div>
              <button className="btn secondary" disabled={!q.done || q.reward <= 0} onClick={() => claimMission(q.id)} style={{ fontSize: 12, padding: '6px 12px' }}>{q.reward <= 0 ? 'Đã nhận' : q.done ? `Nhận ${formatCurrency(q.reward, currency)}` : `${pct}%`}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const game = useGameStore();
  const [bundleNotice,setBundleNotice]=useState(false);
  const [coach,setCoach]=useState(-1);
  const [coachRect,setCoachRect]=useState<DOMRect|null>(null);
  const [activityFilter,setActivityFilter]=useState<'all'|'flights'|'events'|'company'>('all');
  const {
    airline,
    planes,
    routes,
    transactions,
    missions,
    currency,
  } = useGameStore();

  // Tính toán doanh thu & chi phí thực tế
  const totalRevenueTx = transactions
    .filter((t) => t.amount > 0 && t.type === 'Khai thác')
    .reduce((acc, t) => acc + t.amount, 0);

  const profitPerHour = routes
    .filter((r) => r.active)
    .reduce((acc, r) => acc + (r.profitPerHour || 0), 0);

  // Biểu đồ 7 ngày
  const chartData = useMemo(() => {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const base = Math.max(100000, totalRevenueTx / 7);
    return days.map((day, idx) => ({
      name: day,
      thu: Math.round(base * (0.7 + idx * 0.08)),
      chi: Math.round(base * 0.35 * (0.8 + idx * 0.05)),
    }));
  }, [totalRevenueTx]);

  // Máy bay có độ hao mòn cao
  const highWearPlanes = planes.filter((p) => p.wear >= 70);

  // Top 5 đường bay sinh lời nhất
  const topRoutes = useMemo(() => {
    return [...routes].sort((a, b) => (b.profitPerHour || 0) - (a.profitPerHour || 0)).slice(0, 5);
  }, [routes]);

  // Nhiệm vụ chưa hoàn thành
  const activeMissions = missions.filter((m) => !m.done).slice(0, 4);
  const nextStep = !planes.length ? { title:'Mua máy bay đầu tiên', text:'ATR 72 là lựa chọn tiết kiệm, phù hợp các chặng ngắn.', cta:'Chọn ATR 72', href:'/fleet?open=catalog' } : !routes.length ? { title:'Mở đường bay SGN → DAD', text:'Chúng tôi đã chọn sẵn máy bay phù hợp và mức giá gợi ý.', cta:'Thiết lập đường bay', href:'/routes?create=1&suggest=1' } : highWearPlanes.length ? { title:'Bảo trì máy bay đến hạn', text:'Giảm hao mòn để máy bay tiếp tục khai thác an toàn.', cta:'Đến đội bay', href:'/fleet' } : { title:'Hoàn thành nhiệm vụ tiếp theo', text:'Nhiệm vụ giúp hãng nhận thưởng và kinh nghiệm.', cta:'Xem nhiệm vụ', href:'/missions' };
  const dayNo = airline ? Math.min(7,Math.max(1,Math.floor((game.gameTimeMs || 0)/(24*3600000))+1)) : 1;
  const gameSpeed = game.timeSpeed || 1;
  const prestigeMultiplier = 1 + (airline?.ipoShares || 0) * 0.08;
  const streakMultiplier = 1 + Math.min(0.2, Math.floor((game.streak || 0) / 5) * 0.02);
  const adjustedHourly = profitPerHour * prestigeMultiplier * streakMultiplier;
  const liveFlights = [...(game.flights || [])].sort((a,b)=>a.arrivesAt-b.arrivesAt);
  const liveCashChart = (game.cashHistory || []).filter((_,i)=>i%15===0).concat((game.cashHistory || []).slice(-1)).filter((point,i,all)=>all.findIndex(x=>x.at===point.at)===i).map(point=>({time:new Date(point.at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),cash:point.cash}));
  const activityItems = (game.activityLog || []).filter((item) =>
    activityFilter === 'all' ||
    (activityFilter === 'flights' && (item.kind === 'takeoff' || item.kind === 'landing')) ||
    (activityFilter === 'events' && (item.kind === 'situation' || item.kind === 'competitor')) ||
    (activityFilter === 'company' && (item.kind === 'achievement' || item.kind === 'milestone' || item.kind === 'ipo'))
  );
  const upcomingMilestones = (game.milestones || []).filter((milestone) => !milestone.done).map((milestone) => {
    const current = milestone.metric === 'flights' ? airline?.lifetimeFlights || 0 : milestone.metric === 'passengers' ? airline?.lifetimePassengers || 0 : milestone.metric === 'cash' ? airline?.cash || 0 : milestone.metric === 'routes' ? routes.length : milestone.metric === 'planes' ? planes.length : airline?.reputation || 70;
    return { ...milestone, current: Math.min(milestone.target, current), remaining: Math.max(0, milestone.target - current), ratio: Math.min(1, current / milestone.target) };
  }).sort((a,b)=>b.ratio-a.ratio).slice(0,3);
  useEffect(()=>{if(!game.tutorialDone&&!sessionStorage.getItem('airline-coach-v2')){setCoach(0);sessionStorage.setItem('airline-coach-v2','1')}},[game.tutorialDone]);
  useEffect(()=>{const starter=game.missions.filter(m=>m.category==='starter');if(dayNo===7&&starter.length>0&&starter.every(m=>m.done)&&!game.weeklyStarterRewardClaimed){const freePlane=catalogPlanes.find(p=>p.model==='ATR 72-600');if(freePlane){game.update(x=>({...x,weeklyStarterRewardClaimed:true,planes:[...x.planes,{...freePlane,id:`weekly-atr-${Date.now()}`,name:'Phần thưởng hành trình 7 ngày',wear:0}],transactions:[{id:`weekly-tx-${Date.now()}`,at:Date.now(),type:'Nhiệm vụ',amount:0,note:'Nhận máy bay miễn phí khi hoàn thành hành trình 7 ngày'},...x.transactions]}));game.notify('Chúc mừng! Bạn nhận được một chiếc ATR 72 miễn phí.','success')}}},[dayNo,game.missions,game.weeklyStarterRewardClaimed]);
  const coachSteps=[['[data-coach="next"]','Thẻ này đề xuất bước phù hợp nhất với tình hình hãng bay.'],['[data-coach="bundle"]','Gói khởi nghiệp mua ATR 72 và mở tuyến SGN – DAD trong một lần bấm.'],['[data-coach="fleet-kpi"]','Đội bay là nơi mua, nâng cấp và bảo trì máy bay.'],['[data-coach="routes-kpi"]','Đường bay kết nối sân bay và tạo doanh thu.'],['[data-coach="missions"]','Hành trình bảy ngày chia mục tiêu thành các nhiệm vụ nhỏ.'],['[data-coach="chart"]','Theo dõi thu chi để biết hãng đang hoạt động ra sao.']];
  useEffect(()=>{if(coach<0)return;const el=document.querySelector(coachSteps[coach]?.[0]||'');setCoachRect(el?.getBoundingClientRect()||null);const onResize=()=>setCoachRect(el?.getBoundingClientRect()||null);window.addEventListener('resize',onResize);return()=>window.removeEventListener('resize',onResize)},[coach]);
  const buyStarterBundle=()=>{const atr=catalogPlanes.find(p=>p.model==='ATR 72-600');if(!atr||!game.airline)return;if(game.airline.cash<atr.price){router.push('/fleet?open=catalog');return;}game.buy(atr.id);const owned=useGameStore.getState().planes.at(-1);if(owned){const a=airportCatalog.find(x=>x.code==='SGN')!,b=airportCatalog.find(x=>x.code==='DAD')!;game.createRoute({from:'SGN',to:'DAD',planeId:owned.id,ticketPrice:Math.round(basePrice(distanceKm(a,b))*1),frequencyPerWeek:7});}game.notify('Gói khởi nghiệp hoàn tất! ATR 72 đang khai thác tuyến SGN – DAD.','success');setBundleNotice(true);window.setTimeout(()=>setBundleNotice(false),2800);};

  return (
    <>
      <PageHeading
        title="Trung tâm điều hành"
        subtitle={`Chào mừng trở lại, Tổng giám đốc ${airline?.name || ''}! Dưới đây là hiện trạng khai thác hãng bay.`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link className="btn secondary" href="/fleet">
              <Plane size={16} /> Đội bay
            </Link>
            <Link className="btn" href="/routes">
              <Plus size={16} /> Mở đường bay
            </Link>
          </div>
        }
      />

      {!game.hardcore&&<div className="recommendation-card" data-coach="next"><span className="rec-orbit"><Sparkles size={21}/></span><div className="rec-copy"><span className="eyebrow">NÊN LÀM GÌ TIẾP THEO?</span><h2>{nextStep.title}</h2><p>{nextStep.text}</p></div><Link className="btn rec-button" href={nextStep.href}>{nextStep.cta}<ChevronRight size={16}/></Link></div>}

      <LoginStrip />
      <WeeklyStrip />

      <section className="live-income-section">
        <div className="live-income-heading"><div><span className="eyebrow"><span className="live-pulse"/> DÒNG TIỀN TRỰC TIẾP</span><h2>Thu nhập đang vận hành</h2></div><span className="live-game-clock"><Clock3 size={15}/> Tốc độ game {gameSpeed}×</span></div>
        <div className="live-income-kpis"><div><small>Thu nhập / phút thực</small><b className={adjustedHourly>=0?'positive':'negative'}>{adjustedHourly>=0?'+':''}{formatCurrency(adjustedHourly*gameSpeed/60,currency)}</b></div><div><small>Dự kiến / giờ game</small><b className={adjustedHourly>=0?'positive':'negative'}>{adjustedHourly>=0?'+':''}{formatCurrency(adjustedHourly,currency)}</b></div><div><small>Dự kiến / ngày game</small><b className={adjustedHourly>=0?'positive':'negative'}>{adjustedHourly>=0?'+':''}{formatCurrency(adjustedHourly*24,currency)}</b></div></div>
        <div className="live-ops-grid">
          <div className="live-ops-chart"><div className="live-panel-title"><div><b>Số dư trong 60 phút qua</b><small>Tiền tăng theo từng lần hạ cánh</small></div><span className="live-dot">TRỰC TIẾP</span></div><div className="live-cash-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={liveCashChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)"/><XAxis dataKey="time" minTickGap={46} tick={{fontSize:10,fill:'var(--muted)'}}/><YAxis hide domain={['auto','auto']}/><Tooltip formatter={(value:any)=>[formatCurrency(Number(value),currency),'Số dư']} contentStyle={{background:'var(--surface)',borderColor:'var(--line)',borderRadius:12}}/><Line type="stepAfter" dataKey="cash" stroke="#16a34a" strokeWidth={2.5} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div></div>
          <div className="live-arrivals"><div className="live-panel-title"><div><b>Sắp nhận</b><small>Doanh thu cộng khi hạ cánh</small></div><Plane size={17}/></div>{liveFlights.length?liveFlights.slice(0,3).map(flight=>{const eta=Math.max(0,Math.ceil((flight.arrivesAt-(game.gameTimeMs||0))/(60000*gameSpeed)));const multiplier=prestigeMultiplier*(1+Math.min(.2,Math.floor(((game.streak||0)+1)/5)*.02));const payout=flight.payout*multiplier;return <div className="arrival-row" key={flight.id}><div><b>{flight.code}</b><span>{flight.from} → {flight.to}</span></div><strong>+{formatCurrency(payout,currency)}</strong><small>hạ cánh sau {eta} giây</small></div>}):<div className="arrival-empty"><span>🛫</span><b>Chưa có chuyến bay trên không</b><small>Mở tuyến đầu tiên để bắt đầu nhận tiền khi máy bay hạ cánh.</small><Link className="btn" href={planes.length?'/routes?create=1&suggest=1':'/fleet?open=catalog'}>{planes.length?'Mở đường bay':'Mua máy bay'}</Link></div>}</div>
        </div>
        <div className="live-route-earnings"><div className="live-panel-title"><div><b>Hiệu quả từng đường bay</b><small>Lợi nhuận dự tính trung bình mỗi giờ game</small></div><Link href="/routes">Quản lý tuyến <ArrowRight size={14}/></Link></div>{routes.filter(r=>r.active).length?routes.filter(r=>r.active).slice().sort((a,b)=>(b.profitPerHour||0)-(a.profitPerHour||0)).map(route=>{const value=(route.profitPerHour||0)*prestigeMultiplier*streakMultiplier;const max=Math.max(1,...routes.map(r=>Math.abs(r.profitPerHour||0)));return <button className="route-earning-row" key={route.id} onClick={()=>router.push(`/routes?route=${encodeURIComponent(route.id)}`)}><span>{route.from} → {route.to}</span><i><b style={{width:`${Math.max(4,Math.abs(value)/max*100)}%`,background:value>=0?'#16a34a':'#dc2626'}}/></i><strong className={value>=0?'positive':'negative'}>{value>=0?'+':''}{formatCurrency(value,currency)}</strong></button>}):<div className="route-earning-empty">Mở một đường bay để xem tuyến nào đang tạo lợi nhuận.</div>}</div>
        <div className="live-activity"><div className="live-panel-title"><div><b><Activity size={16}/> Nhật ký hãng bay</b><small>Cất cánh, hạ cánh và những chuyện không nằm trong giáo trình</small></div><div className="activity-filters">{([ ['all','Tất cả'],['flights','Chuyến bay'],['events','Sự kiện'],['company','Cột mốc'] ] as const).map(([key,label])=><button key={key} className={activityFilter===key?'active':''} onClick={()=>setActivityFilter(key)}>{label}</button>)}</div></div>{activityItems.length?activityItems.slice(0,8).map(item=><div className={`activity-row activity-${item.kind}`} key={item.id}><span className="activity-icon">{item.kind==='landing'?'🛬':item.kind==='takeoff'?'🛫':item.kind==='situation'?'🎭':item.kind==='competitor'?'📉':item.kind==='milestone'?'🏆':item.kind==='ipo'?'📈':'✨'}</span><span>{item.text}</span>{item.amount!==undefined&&<b>{item.amount>=0?'+':''}{formatCurrency(item.amount,currency)}</b>}</div>):<div className="route-earning-empty">Nhật ký sẽ xuất hiện khi đội bay bắt đầu khai thác.</div>}</div>
        <div className="live-milestones"><div className="live-panel-title"><div><b>Những cột mốc kế tiếp</b><small>Tiến độ mở khóa thành tựu của hãng</small></div><Link href="/missions">Xem tất cả</Link></div>{upcomingMilestones.length?upcomingMilestones.map(milestone=><div className="milestone-progress-row" key={milestone.id}><div><b>{milestone.title}</b><small>{milestone.metric==='flights'?`Còn ${milestone.remaining.toLocaleString('vi-VN')} chuyến bay`:milestone.metric==='passengers'?`Còn ${milestone.remaining.toLocaleString('vi-VN')} hành khách`:milestone.metric==='cash'?`Còn ${formatCurrency(milestone.remaining,currency)}`:milestone.metric==='routes'?`Còn ${milestone.remaining} đường bay`:milestone.metric==='planes'?`Còn ${milestone.remaining} máy bay`:`Còn ${milestone.remaining} điểm danh tiếng`}</small></div><div className="milestone-progress"><i style={{width:`${milestone.ratio*100}%`}}/></div><strong>{Math.floor(milestone.ratio*100)}%</strong></div>):<div className="route-earning-empty">Toàn bộ cột mốc đã hoàn thành. Hãng bay huyền thoại!</div>}</div>
      </section>

      {(airline?.reputation??70)<40&&<div className="card reputation-crisis"><div><span className="eyebrow">DANH TIẾNG DƯỚI 2 SAO</span><h2>Truyền thông đang chế giễu hãng bạn</h2><p>Hệ số lấp đầy giảm theo danh tiếng. Chiến dịch tiếp thị phục hồi 5 điểm; hiện chi phí tăng gấp đôi.</p></div><button className="btn" onClick={game.marketingCampaign}>Chạy chiến dịch · 100.000 $</button></div>}

      {!planes.length&&!routes.length&&<div className="startup-banner" data-coach="bundle"><div className="startup-art"><svg viewBox="0 0 120 90" aria-label="Máy bay sẵn sàng cất cánh"><path d="M8 53 105 17 73 59l-9 23-13-19z" fill="white"/><path d="m51 61 28-19-9 26-9 10z" fill="#38bdf8"/></svg></div><div className="startup-text"><span className="eyebrow">BẮT ĐẦU NHANH</span><h2>Gói khởi nghiệp</h2><p>Mua ATR 72, khai trương tuyến SGN → DAD và bắt đầu tạo doanh thu.</p></div><button className="btn startup-button" onClick={buyStarterBundle}>Xác nhận gói · {formatCurrency(3500000,currency)} <ArrowRight size={15}/></button></div>}

      <div className="journey-card card" data-coach="missions"><div className="section-head"><div><span className="eyebrow">HÀNH TRÌNH KHỞI NGHIỆP</span><h2 className="section-title" style={{margin:'4px 0 0'}}>Ngày {dayNo} / 7</h2></div><span className="journey-icon">✦</span></div><div className="journey-track">{Array.from({length:7},(_,i)=><i key={i} className={i<dayNo?'passed':''}/>)}</div><p className="muted journey-note">Hoàn thành các mục tiêu nhỏ để nhận thưởng và mở rộng hãng bay.</p>{missions.filter(m=>m.category==='starter').slice(dayNo===1?0:dayNo,dayNo===1?2:dayNo+1).map(m=><div className="journey-mission" key={m.id}><span>{m.done?'✓':<i className="mission-dot"/>}</span><div><b>{m.title.replace(/^Bước \d+: /,'')}</b><small>{m.description}</small></div><span className="mission-reward">+{formatCurrency(m.reward,currency)}</span></div>)}<div className="week-reward">🎁 Hoàn thành hành trình để nhận một máy bay miễn phí</div></div>

      {/* 4 StatCards */}
      <div className="stat-grid">
        <div><StatCard
          title="Số dư khả dụng"
          value={<AnimatedCounter value={airline?.cash || 0} currency={currency} />}
          sub="Tiền mặt trong két"
          icon={<Wallet size={20} />}
          color="#0a58ca"
        /></div>
        <div data-coach="fleet-kpi"><StatCard
          title="Quy mô đội bay"
          value={`${planes.length} chiếc`}
          sub={planes.length === 0 ? 'Chưa có máy bay' : `${planes.filter((p) => p.wear < 50).length} máy bay tối ưu`}
          icon={<Plane size={20} />}
          color="#12a678"
        /></div>
        <div data-coach="routes-kpi"><StatCard
          title="Mạng đường bay"
          value={`${routes.length} tuyến`}
          sub={`${routes.filter((r) => r.active).length} tuyến đang bay`}
          icon={<Map size={20} />}
          color="#e89a20"
        /></div>
        <StatCard
          title="Lợi nhuận dự kiến"
          value={
            <span style={{ color: profitPerHour >= 0 ? '#12a678' : '#e84b3c' }}>
              {formatCurrency(profitPerHour, currency)}/giờ
            </span>
          }
          sub="Tổng các tuyến đang hoạt động"
          icon={<TrendingUp size={20} />}
          color="#7b4fe0"
        />
      </div>

      {/* Middle Row: Chart & Starter Missions */}
      <div className="grid-2" style={{ marginTop: 24 }}>
        {/* Chart */}
        <div className="card" data-coach="chart">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div>
              <h2 className="section-title" style={{ marginBottom: 4 }}>
                Hiệu suất thu chi khai thác
              </h2>
              <div className="muted" style={{ fontSize: 12 }}>
                Xu hướng doanh thu và chi phí 7 ngày gần nhất
              </div>
            </div>
            <span className="badge">Thời gian thực</span>
          </div>

          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0a58ca" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0a58ca" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffb800" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ffb800" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value), currency), '']}
                  contentStyle={{
                    background: 'var(--surface)',
                    borderColor: 'var(--line)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="thu"
                  name="Doanh thu"
                  stroke="#0a58ca"
                  strokeWidth={2.5}
                  fill="url(#incomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="chi"
                  name="Chi phí"
                  stroke="#ffb800"
                  strokeWidth={2}
                  fill="url(#costGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>
            Lợi nhuận được cộng đều đặn mỗi 10 giây và tiếp tục tích lũy khi ngoại tuyến.
          </div>
        </div>

        {/* Starter Missions Card */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2 className="section-title" style={{ margin: 0 }}>
              Nhiệm vụ trọng tâm
            </h2>
            <Link
              href="/missions"
              className="muted"
              style={{ fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
            >
              Xem tất cả ({missions.filter((m) => m.done).length}/{missions.length})
            </Link>
          </div>

          {activeMissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ fontSize: 36 }}>🏆</div>
              <b style={{ display: 'block', marginTop: 8 }}>Xuất sắc! Đã hoàn thành mọi mục tiêu!</b>
              <div className="muted" style={{ fontSize: 12 }}>Đón chờ các thử thách nhiệm vụ tiếp theo.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {activeMissions.map((m) => {
                const percent = Math.min(100, Math.round((m.progress / m.target) * 100));
                return (
                  <div key={m.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <b>{m.title}</b>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {Math.floor(m.progress).toLocaleString('vi-VN')} / {m.target.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="progress">
                      <i style={{ width: `${percent}%` }} />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
                      <span style={{ color: '#0a58ca', fontWeight: 700 }}>
                        Thưởng +{formatCurrency(m.reward, currency)}
                      </span>
                      <span className="muted">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            className="btn secondary"
            href="/missions"
            style={{ width: '100%', marginTop: 20 }}
          >
            Quản lý tất cả nhiệm vụ <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>

      {/* Bottom Section: Top Routes & Quick Fleet Health */}
      <div className="card" style={{ marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>
              Mạng đường bay sinh lời hàng đầu
            </h2>
            <div className="muted" style={{ fontSize: 12 }}>
              Các tuyến mang lại dòng tiền chủ lực cho hãng
            </div>
          </div>
          <Link className="btn ghost" href="/routes">
            Xem toàn bộ {routes.length} tuyến
          </Link>
        </div>

        {routes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗺️</div>
            <h3 style={{ fontSize: 17, marginBottom: 6 }}>Đội bay chưa có đường bay khai thác</h3>
            <p className="muted" style={{ fontSize: 13, maxWidth: 440, margin: '0 auto 18px' }}>
              Sau khi mua máy bay, hãy thiết lập tuyến đường nối sân bay căn cứ với các điểm du lịch
              như Đà Nẵng, Phú Quốc, Nha Trang để bắt đầu thu lợi nhuận.
            </p>
            <Link className="btn" href="/routes">
              <Plus size={16} /> Mở đường bay đầu tiên
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ĐƯỜNG BAY</th>
                  <th>MÁY BAY KHAI THÁC</th>
                  <th>GIÁ VÉ</th>
                  <th>TẦN SUẤT</th>
                  <th>LẤP ĐẦY</th>
                  <th>LỢI NHUẬN / GIỜ</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {topRoutes.map((r) => {
                  const assignedPlane = planes.find((p) => p.id === r.planeId);
                  return (
                    <tr key={r.id}>
                      <td>
                        <b style={{ fontSize: 14 }}>
                          {r.from} <span style={{ color: '#0a58ca' }}>⟷</span> {r.to}
                        </b>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{assignedPlane?.name || assignedPlane?.model || '—'}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{assignedPlane?.manufacturer}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {formatCurrency(r.ticketPrice, currency)}
                      </td>
                      <td>{r.frequencyPerWeek} chuyến/tuần</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress" style={{ width: 50, height: 6 }}>
                            <i style={{ width: `${Math.round((r.loadFactor || 0.8) * 100)}%` }} />
                          </div>
                          <span style={{ fontSize: 11 }}>{Math.round((r.loadFactor || 0.8) * 100)}%</span>
                        </div>
                      </td>
                      <td>
                        <b
                          style={{
                            color: (r.profitPerHour || 0) >= 0 ? '#12a678' : '#e84b3c',
                            fontSize: 14,
                          }}
                        >
                          {(r.profitPerHour || 0) >= 0 ? '+' : ''}
                          {formatCurrency(r.profitPerHour || 0, currency)}
                        </b>
                      </td>
                      <td>
                        <span className={`badge ${r.active ? '' : 'warn'}`}>
                          {r.active ? 'Đang bay' : 'Tạm dừng'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Footer hint */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--muted)',
          marginTop: 20,
        }}
      >
        <Clock3 size={15} />
        <span>
          Lợi nhuận được tính toán realtime theo pure engine. Bạn có thể đóng trình duyệt, hệ thống
          vẫn tích lũy thu nhập tối đa 8 giờ offline.
        </span>
      </div>
      {bundleNotice&&<div className="celebration"><div className="confetti-burst">✦ ✈ ✨ 🎉 ✦</div><b>Gói khởi nghiệp đã sẵn sàng!</b></div>}
      {coach>=0&&!game.pendingMilestone&&!game.pendingLevelUp&&!game.pendingIpo&&!game.pendingOfflineSummary&&<div className="coach-layer"><div className="coach-dim"/><div className="coach-spotlight" style={coachRect?{left:coachRect.left-7,top:coachRect.top-7,width:coachRect.width+14,height:coachRect.height+14}:undefined}/><div className="coach-inline"><div className="coach-inline-top"><span>HƯỚNG DẪN · {coach+1}/6</span><button onClick={()=>{setCoach(-1);game.update(x=>({...x,tutorialDone:true}))}}>Bỏ qua</button></div><p>{coachSteps[coach]?.[1]}</p><button className="btn" onClick={()=>{if(coach===5){setCoach(-1);game.update(x=>({...x,tutorialDone:true}))}else setCoach(coach+1)}}>{coach===5?'Bắt đầu chơi':'Tiếp tục'} <ArrowRight size={15}/></button></div></div>}
    </>
  );
}

export default function Dashboard() {
  return (
    <GameShell>
      <DashboardContent />
    </GameShell>
  );
}
