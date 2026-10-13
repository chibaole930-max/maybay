'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Map as MapIcon,
  Plus,
  Pause,
  Play,
  Trash2,
  Edit3,
  TrendingUp,
  Clock,
  Compass,
  AlertCircle,
  X,
  Users,
  ShieldAlert,
  Plane,
} from 'lucide-react';
import { GameShell, PageHeading } from '@/components/game-shell';
import { useGameStore } from '@/store/useGameStore';
import { airports } from '@/lib/mock-data';
import {
  basePrice,
  distanceKm,
  formatCurrency,
  routeEconomics,
  isWideBody,
} from '@/lib/formulas';
import type { Route } from '@/types';

const AirlineMap = dynamic(() => import('@/components/map/AirlineMap').then((module) => module.AirlineMap), { ssr: false, loading: () => <div className="card map-loading">Đang tải bản đồ hàng không…</div> });

// Map projection helper for Vietnam & Southeast Asia airports
function getAirportSvgCoords(code: string): { x: number; y: number } {
  const apt = airports.find((a) => a.code === code);
  if (!apt) return { x: 350, y: 240 };
  return { x: ((apt.lon + 180) / 360) * 700, y: ((75 - apt.lat) / 135) * 480 };
}
function getGreatCirclePoints(from: string, to: string) {
  const a=airports.find(x=>x.code===from)!, b=airports.find(x=>x.code===to)!;
  const rad=(v:number)=>v*Math.PI/180, lat1=rad(a.lat),lon1=rad(a.lon),lat2=rad(b.lat),lon2=rad(b.lon);
  const p1=[Math.cos(lat1)*Math.cos(lon1),Math.cos(lat1)*Math.sin(lon1),Math.sin(lat1)],p2=[Math.cos(lat2)*Math.cos(lon2),Math.cos(lat2)*Math.sin(lon2),Math.sin(lat2)];
  const omega=Math.acos(Math.max(-1,Math.min(1,p1[0]*p2[0]+p1[1]*p2[1]+p1[2]*p2[2]))), sin=Math.sin(omega)||1;
  return Array.from({length:25},(_,i)=>{const t=i/24,A=Math.sin((1-t)*omega)/sin,B=Math.sin(t*omega)/sin,x=A*p1[0]+B*p2[0],y=A*p1[1]+B*p2[1],z=A*p1[2]+B*p2[2],lat=Math.atan2(z,Math.hypot(x,y))*180/Math.PI,lon=Math.atan2(y,x)*180/Math.PI;return {x:((lon+180)/360)*700,y:((75-lat)/135)*480};});
}
function airportUnlockLevel(code: string): number {
  if (['BKK','SIN','KUL','MNL','CGK','DPS','HKT','PNH','VTE','RGN','BWN','REP'].includes(code)) return 5;
  if (['NRT','ICN','TPE','HKG','PVG','PEK','KIX','FUK','GMP','CAN'].includes(code)) return 10;
  if (['LHR','CDG','FRA','DXB','SYD','LAX','AMS','MAD','YYZ','GRU'].includes(code)) return 15;
  return 1;
}

function RoutesContent() {
  const {
    airline,
    planes,
    routes,
    airports: ownedAirports,
    createRoute,
    editRoute,
    toggleRoute,
    removeRoute,
    notify,
    currency,
    research,
    currentEvent,
    theme,
    flights,
    gameTimeMs,
  } = useGameStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeTab,setRouteTab]=useState<'map'|'prices'>('map');
  useEffect(()=>{if(window.location.search.includes('create=1')){const from=airports.find(a=>a.code==='SGN')!,to=airports.find(a=>a.code==='DAD')!;setFromCode('SGN');setToCode('DAD');setSelectedPlaneId(planes.find(p=>p.rangeKm>=distanceKm(from,to))?.id||'');setCustomPrice(Math.round(basePrice(distanceKm(from,to))*1));setFrequency(7);setIsCreateOpen(true)}},[]);

  // Form creation state
  const [fromCode, setFromCode] = useState(airline?.baseAirport || 'SGN');
  const [toCode, setToCode] = useState('DAD');
  const [selectedPlaneId, setSelectedPlaneId] = useState(planes[0]?.id || '');
  const [frequency, setFrequency] = useState(7);
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  // Edit form state
  const [editPrice, setEditPrice] = useState(100);
  const [editFrequency, setEditFrequency] = useState(7);
  const [editPlaneId, setEditPlaneId] = useState('');

  // Selected plane and airports
  const fromAirport = airports.find((a) => a.code === fromCode)!;
  const toAirport = airports.find((a) => a.code === toCode)!;
  const currentPlane = planes.find((p) => p.id === selectedPlaneId) || planes[0];

  const distance = useMemo(() => {
    if (!fromAirport || !toAirport) return 0;
    return distanceKm(fromAirport, toAirport);
  }, [fromAirport, toAirport]);

  const recommendedPrice = useMemo(() => basePrice(distance), [distance]);
  const activePrice = customPrice !== null ? customPrice : recommendedPrice;

  // Planes suitable for this distance
  const eligiblePlanes = planes.filter((p) => p.rangeKm >= distance && (distance <= 4000 || isWideBody(p)));
  const openAirports = airports.filter(a => airportUnlockLevel(a.code) <= (airline?.level || 1));

  // Live real-time preview economics
  const previewEcon = useMemo(() => {
    if (!currentPlane || !fromAirport || !toAirport || fromCode === toCode) return null;
    const baseAirports = [airline?.baseAirport || 'SGN'];
    if (airline?.secondBaseAirport) baseAirports.push(airline.secondBaseAirport);

    return routeEconomics(
      {
        from: fromCode,
        to: toCode,
        ticketPrice: activePrice,
        frequencyPerWeek: frequency,
        competition: 2,
      },
      currentPlane,
      fromAirport,
      toAirport,
      {
        baseAirports,
        reputation: airline?.reputation ?? 70,
        international: fromAirport.country !== 'Việt Nam' || toAirport.country !== 'Việt Nam',
        fuelSaveBonus: (research.fuel || 0) * 0.025,
        serviceBonus: 1 + (research.service || 0) * 0.04,
        fuelMultiplier: currentEvent?.fuelMultiplier ?? 1,
        demandMultiplier: currentEvent?.demandMultiplier ?? 1,
        isStormAffected: currentEvent?.affectedAirports?.includes(fromCode) ||
          currentEvent?.affectedAirports?.includes(toCode),
      }
    );
  }, [
    currentPlane,
    fromAirport,
    toAirport,
    fromCode,
    toCode,
    activePrice,
    frequency,
    airline,
    research,
    currentEvent,
  ]);

  const handleCreateRoute = () => {
    if (!currentPlane || fromCode === toCode) return;
    createRoute({
      from: fromCode,
      to: toCode,
      planeId: currentPlane.id,
      ticketPrice: activePrice,
      frequencyPerWeek: frequency,
    });
    setIsCreateOpen(false);
    setCustomPrice(null);
  };

  const handleOpenEdit = (route: Route) => {
    setEditingRoute(route);
    setEditPrice(route.ticketPrice);
    setEditFrequency(route.frequencyPerWeek);
    setEditPlaneId(route.planeId);
  };

  useEffect(() => {
    const routeId = new URLSearchParams(window.location.search).get('route');
    const route = routeId ? routes.find((item) => item.id === routeId) : undefined;
    if (route && !editingRoute) handleOpenEdit(route);
  }, [routes, editingRoute]);

  const handleSaveEdit = () => {
    if (!editingRoute) return;
    editRoute(editingRoute.id, {
      ticketPrice: editPrice,
      frequencyPerWeek: editFrequency,
      planeId: editPlaneId,
    });
    notify(`Đã cập nhật cấu hình đường bay ${editingRoute.from} ⟷ ${editingRoute.to}.`, 'info');
    setEditingRoute(null);
  };

  return (
    <>
      <PageHeading
        title="Mạng lưới Đường bay"
        subtitle="Thiết kế và tối ưu các hành lang bay kết nối các thành phố lớn."
        action={
          <button
            className="btn"
            disabled={planes.length === 0}
            onClick={() => {
              setSelectedPlaneId(planes[0]?.id || '');
              setCustomPrice(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus size={16} /> Mở đường bay mới
          </button>
        }
      />

      {planes.length === 0 && (
        <div className="card warn-card">
          <div>
            <AlertCircle color="var(--accent-ink)" size={20} />
            <span>
              Bạn cần sở hữu ít nhất 1 chiếc máy bay trước khi mở đường bay thương mại.
            </span>
          </div>
          <Link className="btn" href="/fleet">
            Đến Đội bay để mua
          </Link>
        </div>
      )}

      {/* SVG Map and Routes Overview */}
      <div className="route-overview-layout">
        {/* Bản đồ nền CARTO; dữ liệu marker và đường bay dùng tọa độ sân bay thật. */}
        <AirlineMap theme={theme} level={airline?.level || 1} airports={ownedAirports} routes={routes} planes={planes} flights={flights || []} gameTimeMs={gameTimeMs || 0} timeSpeed={1} currency={currency} baseAirport={airline?.baseAirport || 'SGN'} />

        {/* Routes Operational List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              Danh sách tuyến ({routes.length})
            </h2>
            <span className="muted" style={{ fontSize: 12 }}>
              Cập nhật lợi nhuận theo giờ
            </span>
          </div>

          {routes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 10px', margin: 'auto' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✈️</div>
              <b>Chưa có đường bay thương mại</b>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Bấm vào nút &quot;Mở đường bay mới&quot; ở trên để bắt đầu kết nối các thành phố.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                maxHeight: 460,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {routes.map((r) => {
                const assignedPlane = planes.find((p) => p.id === r.planeId);
                const isBaseDiscount =
                  r.from === airline?.baseAirport ||
                  r.to === airline?.baseAirport ||
                  r.from === airline?.secondBaseAirport ||
                  r.to === airline?.secondBaseAirport;

                return (
                  <div
                    key={r.id}
                    className={`card route-card ${r.active ? '' : 'inactive'}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <b style={{ fontSize: 16 }}>
                            {r.from} <span style={{ color: 'var(--blue)' }}>⟷</span> {r.to}
                          </b>
                          {isBaseDiscount && (
                            <span className="badge">
                              -20% phí Hub
                            </span>
                          )}
                          <span className={`badge ${r.active ? '' : 'warn'}`}>
                            {r.active ? 'Đang bay' : 'Tạm dừng'}
                          </span>
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          {assignedPlane?.name || assignedPlane?.model || 'Chưa gán máy bay'} · {r.frequencyPerWeek} chuyến/tuần · Vé: {formatCurrency(r.ticketPrice, currency)}
                        </div>
                      </div>

                      {/* Controls */}
                      <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                        <button
                          className="btn ghost icon-btn"
                          onClick={() => toggleRoute(r.id)}
                          title={r.active ? 'Tạm dừng khai thác' : 'Tiếp tục khai thác'}
                          aria-label={r.active ? 'Tạm dừng khai thác' : 'Tiếp tục khai thác'}
                        >
                          {r.active ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          className="btn ghost icon-btn"
                          onClick={() => handleOpenEdit(r)}
                          title="Chỉnh sửa giá vé & tần suất"
                          aria-label="Chỉnh sửa giá vé và tần suất"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn ghost icon-btn"
                          onClick={() => removeRoute(r.id)}
                          style={{ color: 'var(--danger)' }}
                          title="Hủy đường bay và trả slot"
                          aria-label="Hủy đường bay và trả slot"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: '1px solid var(--line)',
                        fontSize: 12,
                      }}
                    >
                      <span className="muted">
                        Lấp đầy: <b>{Math.round((r.loadFactor || 0.8) * 100)}%</b> · Cạnh tranh: <b>{r.competition || 1} hãng AI</b>
                      </span>
                      <b
                        className={(r.profitPerHour || 0) >= 0 ? 'positive' : 'negative'}
                        style={{ fontSize: 14 }}
                      >
                        {(r.profitPerHour || 0) >= 0 ? '+' : ''}
                        {formatCurrency(r.profitPerHour || 0, currency)}/giờ
                      </b>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card price-watch-card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><span className="eyebrow">THEO DÕI GIÁ</span><h2 className="section-title" style={{margin:'4px 0'}}>Bạn và đối thủ đang bán thế nào?</h2></div><button className="btn ghost" onClick={()=>setRouteTab(routeTab==='prices'?'map':'prices')}>{routeTab==='prices'?'Đóng theo dõi giá':'Mở theo dõi giá'}</button></div>{routeTab==='prices'&&<div className="table-wrap"><table><thead><tr><th>Đường bay</th><th>Giá hãng bạn</th><th>Giá VietSky</th><th>Trạng thái</th></tr></thead><tbody>{routes.map(r=>{const rival=r.competitorTicketPrice||Math.round(basePrice(distanceKm(airports.find(a=>a.code===r.from)!,airports.find(a=>a.code===r.to)!))*(.9+((r.competition||1)%3)*.08));return <tr key={r.id}><td>{r.from} → {r.to}</td><td>{formatCurrency(r.ticketPrice,currency)}</td><td>{formatCurrency(rival,currency)}</td><td>{r.ticketPrice>rival*1.25?<b className="negative">Hớ giá · đối thủ đang hút khách</b>:<span className="positive">Cạnh tranh tốt</span>}</td></tr>})}</tbody></table></div>}{!routes.length&&<p className="muted">Mở đường bay để bắt đầu theo dõi giá đối thủ.</p>}</div>

      {/* CREATE ROUTE MODAL */}
      {isCreateOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 600px)', maxHeight: '90vh', overflowY: 'auto', padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 className="section-title" style={{ margin: 0, fontSize: 20 }}>
                  Khai trương đường bay mới
                </h2>
                <div className="muted" style={{ fontSize: 12 }}>
                  Tối ưu hóa giá vé và hệ số lấp đầy để đạt lợi nhuận cao nhất
                </div>
              </div>
              <button className="btn ghost icon-btn" onClick={() => setIsCreateOpen(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>

            {/* From & To Airport Selection */}
            <div className="grid-2" style={{ gap: 14 }}>
              <div>
                <label className="label">Sân bay xuất phát</label>
                <select className="select" value={fromCode} onChange={(e) => setFromCode(e.target.value)}>
                  {airports.map((a) => (
                    <option key={a.code} value={a.code} disabled={airportUnlockLevel(a.code) > (airline?.level || 1)}>
                      {a.code} · {a.city} (Nhu cầu {a.demand}/10)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Sân bay đến</label>
                <select className="select" value={toCode} onChange={(e) => setToCode(e.target.value)}>
                  {airports
                    .filter((a) => a.code !== fromCode)
                    .map((a) => (
                      <option key={a.code} value={a.code} disabled={airportUnlockLevel(a.code) > (airline?.level || 1)}>
                        {a.code} · {a.city} (Nhu cầu {a.demand}/10)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <button className="btn secondary route-suggest" onClick={()=>{const a=airports.find(x=>x.code==='SGN')!,b=airports.find(x=>x.code==='DAD')!;setFromCode('SGN');setToCode('DAD');setSelectedPlaneId(planes.find(p=>p.rangeKm>=distanceKm(a,b))?.id||'');setCustomPrice(Math.round(basePrice(distanceKm(a,b))*1));setFrequency(7)}}>✦ Gợi ý đường bay tốt nhất · SGN → DAD</button>

            {/* Plane assignment */}
            <label className="label" style={{ marginTop: 18 }}>
              Chỉ định máy bay khai thác
            </label>
            <select
              className="select"
              value={selectedPlaneId || currentPlane?.id}
              onChange={(e) => setSelectedPlaneId(e.target.value)}
            >
              {eligiblePlanes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.model} ({p.capacity} ghế · Tầm bay {p.rangeKm.toLocaleString()} km · Hao mòn {p.wear.toFixed(1)}%)
                </option>
              ))}
            </select>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              Khoảng cách hành trình: <b>{distance.toLocaleString('vi-VN')} km</b>
              {eligiblePlanes.length === 0 && (
                <span className="negative" style={{ display: 'block', marginTop: 2 }}>
                  ⚠️ Không có máy bay nào trong đội bay đủ tầm bay cho tuyến này ({distance} km)!
                </span>
              )}
            </div>

            {/* Ticket Price Slider */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="label" style={{ margin: 0 }}>
                  Giá vé mỗi khách: <b className="tabular-nums" style={{ color: 'var(--blue)', fontSize: 16 }}>{formatCurrency(activePrice, currency)}</b>
                </label>
                <span className="muted" style={{ fontSize: 11 }}>
                  Chuẩn đề xuất: {formatCurrency(recommendedPrice, currency)}
                </span>
              </div>
              <input
                type="range"
                min={Math.max(20, Math.round(recommendedPrice * 0.5))}
                max={Math.round(recommendedPrice * 2.0)}
                step={5}
                value={activePrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                style={{ marginTop: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
                <span>Giá rẻ kích cầu</span>
                <span>Giá tiêu chuẩn</span>
                <span>Giá vé cao cấp</span>
              </div><div className="price-zones"><span className={activePrice/recommendedPrice<=1?'selected green':''}>Giá tốt</span><span className={activePrice/recommendedPrice>1&&activePrice/recommendedPrice<=1.25?'selected yellow':''}>Hơi cao</span><span className={activePrice/recommendedPrice>1.25&&activePrice/recommendedPrice<=1.5?'selected orange':''}>Sắp ế</span><span className={activePrice/recommendedPrice>1.5?'selected red':''}>Ế chắc</span></div><div className={`price-sensitivity ${activePrice/recommendedPrice>1.5?'red':activePrice/recommendedPrice>1.25?'orange':activePrice/recommendedPrice>1?'yellow':'green'}`}><b>{activePrice/recommendedPrice>1.5?'Ế CHẮC — gần như không ai mua':activePrice/recommendedPrice>1.25?'Sắp ế, khách bắt đầu bỏ đi':activePrice/recommendedPrice>1?'Khách bắt đầu chê đắt':'Giá tốt, dễ kín ghế'}</b><span>Giá khuyến nghị tối đa: {formatCurrency(Math.round(recommendedPrice*(1.1+((fromAirport.demand+toAirport.demand)/20)*.15)),currency)} · Đối thủ đang bán khoảng {formatCurrency(Math.round(recommendedPrice*1.05),currency)}</span></div>
            </div>

            {/* Frequency Slider */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="label" style={{ margin: 0 }}>
                  Tần suất bay <span title="Số chuyến trong một tuần mô phỏng. Ví dụ 7 chuyến tương đương khoảng một chuyến mỗi ngày." className="term-help">?</span>: <b style={{ color: 'var(--blue)' }}>{frequency} chuyến / tuần</b>
                </label>
                <span className="muted" style={{ fontSize: 11 }}>
                  ~{(frequency / 7).toFixed(1)} chuyến / ngày
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={14}
                step={1}
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                style={{ marginTop: 8 }}
              />
            </div>

            {fromAirport.country !== toAirport.country && (()=>{const localHour=((Date.now()/3600000+toAirport.lon/15+distance/currentPlane.speedKmh)%24+24)%24;return localHour<5?<div className="night-warning">🌙 Giờ đến dự kiến rơi vào 0–5h địa phương; nhu cầu tuyến này giảm 15%.</div>:null})()}

            {/* Realtime Economics Preview Card */}
            {previewEcon && (
              <div className="card econ-preview">
                <b>
                  📊 Dự báo kinh tế đường bay (Thời gian thực)
                </b>
                <div className="econ-grid">
                  <div>
                    <span className="muted">Hệ số lấp đầy <span title="Tỷ lệ ghế có khách. Ví dụ 80% nghĩa là 80 ghế trong 100 ghế có người." className="term-help">?</span></span>
                    <br />
                    <b style={{ color: previewEcon.loadFactor > 0.75 ? 'var(--success)' : 'inherit' }}>
                      {Math.round(previewEcon.loadFactor * 100)}%
                    </b><small>~{Math.round(currentPlane.capacity*previewEcon.loadFactor*frequency/7)} khách/tuần</small>
                  </div>
                  <div>
                    <span className="muted">Doanh thu / giờ</span>
                    <br />
                    <b>+{formatCurrency(previewEcon.revenuePerHour, currency)}</b>
                  </div>
                  <div>
                    <span className="muted">Chi phí / giờ</span>
                    <br />
                    <b className="negative">-{formatCurrency(previewEcon.costPerHour, currency)}</b>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <span className="muted" style={{ fontSize: 12 }}>Lợi nhuận ròng ước tính:</span>
                  <b
                    className={previewEcon.profitPerHour >= 0 ? 'positive' : 'negative'}
                    style={{ fontSize: 16 }}
                  >
                    {previewEcon.profitPerHour >= 0 ? '+' : ''}
                    {formatCurrency(previewEcon.profitPerHour, currency)} / giờ
                  </b>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              className="btn"
              style={{ width: '100%', marginTop: 24 }}
              disabled={!currentPlane || eligiblePlanes.length === 0 || fromCode === toCode}
              onClick={handleCreateRoute}
            >
              Khai trương đường bay ngay ✈️
            </button>
          </div>
        </div>
      )}

      {/* EDIT ROUTE MODAL */}
      {editingRoute && (
        <div
          className="modal-backdrop"
          onClick={() => setEditingRoute(null)}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 480px)', padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  Điều chỉnh đường bay {editingRoute.from} ⟷ {editingRoute.to}
                </h3>
              </div>
              <button className="btn ghost icon-btn" onClick={() => setEditingRoute(null)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>

            <label className="label">Giá vé: {formatCurrency(editPrice, currency)}</label>
            <input
              type="range"
              min={30}
              max={1500}
              step={5}
              value={editPrice}
              onChange={(e) => setEditPrice(Number(e.target.value))}
            />

            <label className="label" style={{ marginTop: 16 }}>Tần suất: {editFrequency} chuyến/tuần</label>
            <input
              type="range"
              min={1}
              max={14}
              step={1}
              value={editFrequency}
              onChange={(e) => setEditFrequency(Number(e.target.value))}
            />

            <label className="label" style={{ marginTop: 16 }}>Thay đổi máy bay</label>
            <select
              className="select"
              value={editPlaneId}
              onChange={(e) => setEditPlaneId(e.target.value)}
            >
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.model} ({p.capacity} ghế)
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button className="btn ghost" onClick={() => setEditingRoute(null)}>
                Hủy
              </button>
              <button className="btn" onClick={handleSaveEdit}>
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Routes() {
  return (
    <GameShell>
      <RoutesContent />
    </GameShell>
  );
}
