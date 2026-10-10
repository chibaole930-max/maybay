'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngBounds } from 'leaflet';
import { Crosshair, Maximize2, Minimize2, Plane as PlaneIcon, Eye, EyeOff } from 'lucide-react';
import type { Airport, Flight, Plane, Route } from '@/types';
import { airportsReal } from '@/lib/airports-real';
import { bearingDegrees, greatCirclePath, greatCirclePoint } from '@/lib/geo';
import { formatCurrency } from '@/lib/formulas';

type Props = {
  theme: 'light' | 'dark';
  level: number;
  airports: Airport[];
  routes: Route[];
  planes: Plane[];
  flights: Flight[];
  gameTimeMs: number;
  timeSpeed: 1 | 2 | 4;
  currency: 'USD' | 'VND';
  baseAirport: string;
};

const regionCenter: Record<string, { center: [number, number]; zoom: number }> = {
  VN: { center: [16.4, 107.5], zoom: 5 },
  'ĐNÁ': { center: [11, 106], zoom: 4 },
  'Đông Á': { center: [31, 122], zoom: 3 },
  'Bay xa': { center: [27, 50], zoom: 2 },
};

function AirportFocus({ code }: { code: string }) {
  const map = useMap();
  const airport = airportsReal.find((item) => item.code === code);
  useEffect(() => { if (airport) map.flyTo([airport.lat, airport.lng], 6, { duration: 0.8 }); }, [airport, map]);
  return null;
}

function RegionFocus({ region }: { region: string }) {
  const map = useMap();
  const focus = regionCenter[region];
  useEffect(() => { if (focus) map.flyTo(focus.center, focus.zoom, { duration: 0.7 }); }, [focus, map]);
  return null;
}

function FlightMarkers({ flights, gameTimeMs, speed, planes, airports, currency }: Pick<Props, 'flights' | 'gameTimeMs' | 'timeSpeed' | 'planes' | 'airports' | 'currency'> & { speed: 1 | 2 | 4 }) {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const map = useMap();
  useMapEvents({ moveend: () => setBounds(map.getBounds()), zoomend: () => setBounds(map.getBounds()) });
  const visible = flights.filter((flight) => {
    const from = airportsReal.find((airport) => airport.code === flight.from);
    const to = airportsReal.find((airport) => airport.code === flight.to);
    if (!from || !to) return false;
    const progress = Math.max(0, Math.min(1, (gameTimeMs - flight.departedAt) / (flight.arrivesAt - flight.departedAt)));
    const point = greatCirclePoint({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }, progress);
    return !bounds || bounds.contains([point.lat, point.lng]);
  });
  return <>{visible.map((flight) => {
    const from = airportsReal.find((airport) => airport.code === flight.from)!;
    const to = airportsReal.find((airport) => airport.code === flight.to)!;
    const progress = Math.max(0, Math.min(1, (gameTimeMs - flight.departedAt) / (flight.arrivesAt - flight.departedAt)));
    const point = greatCirclePoint({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }, progress);
    const heading = bearingDegrees({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
    const plane = planes.find((item) => item.id === flight.planeId);
    const eta = Math.max(0, Math.ceil((flight.arrivesAt - gameTimeMs) / (60000 * speed)));
    const icon = L.divIcon({ className: 'live-plane-marker', html: `<span style="transform:rotate(${heading}deg)">✈</span>`, iconSize: [34, 34], iconAnchor: [17, 17] });
    return <Marker key={flight.id} position={[point.lat, point.lng]} icon={icon}><Popup><b>{flight.code} · {flight.from} → {flight.to}</b><br />Còn {eta} giây · {plane?.name || plane?.model || 'Máy bay'}<br />Doanh thu dự kiến {formatCurrency(flight.payout, currency)}</Popup></Marker>;
  })}</>;
}

export function AirlineMap(props: Props) {
  const { theme, level, airports, routes, planes, flights, gameTimeMs, timeSpeed, currency, baseAirport } = props;
  const [region, setRegion] = useState('VN');
  const [hideLosses, setHideLosses] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [home, setHome] = useState(false);
  const [focus, setFocus] = useState('');
  const gameAirports = useMemo(() => new Map(airports.map((airport) => [airport.code, airport])), [airports]);
  const activeCount = routes.filter((route) => route.active).length;
  const coords = (code: string) => airportsReal.find((airport) => airport.code === code);

  // CARTO API key from environment variable
  const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
  const keyParam = cartoApiKey ? `?key=${cartoApiKey}` : '';

  return <section className={`real-map-card card ${expanded ? 'real-map-expanded' : ''}`}>
    <div className="real-map-heading">
      <div><span className="eyebrow">BẢN ĐỒ TRỰC TIẾP</span><h2 className="section-title">Mạng bay toàn cầu</h2><p className="muted">{activeCount} tuyến hoạt động · {flights.length} chuyến đang bay</p></div>
      <div className="real-map-actions">
        <button className="btn ghost compact" onClick={() => setHideLosses((value) => !value)}>{hideLosses ? <Eye size={16}/> : <EyeOff size={16}/>} {hideLosses ? 'Hiện tuyến lỗ' : 'Ẩn tuyến lỗ'}</button>
        <button className="btn ghost compact" onClick={() => setHome((value) => !value)}><Crosshair size={16}/> Về căn cứ</button>
        <button className="btn ghost compact map-expand" onClick={() => setExpanded((value) => !value)}>{expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>} {expanded ? 'Thu gọn' : 'Mở rộng'}</button>
      </div>
    </div>
    <div className="real-map-regions">{Object.keys(regionCenter).map((item) => <button key={item} className={`btn compact ${region === item ? '' : 'ghost'}`} onClick={() => { setRegion(item); setFocus(item); }}>{item}</button>)}</div>
    <div className="real-map-layout">
      <div className="leaflet-map-wrap">
        <MapContainer center={[16.5, 108]} zoom={4} minZoom={2} maxZoom={11} scrollWheelZoom className="leaflet-game-map" preferCanvas>
          {/* Đổi riêng TileLayer sang Google Maps (@react-google-maps/api + API key) để dùng tile Google; marker và đường bay giữ nguyên. */}
          <TileLayer attribution="&copy; OpenStreetMap &copy; CARTO" url={theme === 'dark' ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png${keyParam}` : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${keyParam}`} />
          {focus && <RegionFocus region={focus} />}{home && <AirportFocus code={baseAirport} />}
          {routes.map((route) => {
            const from = coords(route.from), to = coords(route.to);
            if (!from || !to || (hideLosses && route.active && route.profitPerHour < 0)) return null;
            const profitColor = !route.active ? '#94a3b8' : route.profitPerHour >= 0 ? '#16a34a' : '#dc2626';
            return <Polyline key={route.id} positions={greatCirclePath({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng })} pathOptions={{ color: profitColor, weight: 3, opacity: 0.85, dashArray: '8 10', className: 'leaflet-route-flow' }}>
              <Popup><b>{route.from} → {route.to}</b><br />{formatCurrency(route.profitPerHour, currency)}/giờ<br />{route.active ? 'Đang khai thác' : 'Đang tạm dừng'}</Popup>
            </Polyline>;
          })}
          {airportsReal.map((airport) => {
            const owned = gameAirports.get(airport.code);
            const unlocked = level >= airport.unlockLevel;
            const routeCount = routes.filter((route) => route.from === airport.code || route.to === airport.code).length;
            const icon = L.divIcon({ className: `airport-dot ${unlocked ? '' : 'airport-dot-locked'}`, html: `<span>${airport.code}</span>`, iconSize: [34, 22], iconAnchor: [17, 11] });
            return <Marker key={airport.code} position={[airport.lat, airport.lng]} icon={icon} opacity={unlocked ? 1 : 0.45}>
              <Popup><b>{airport.code} · {airport.name}</b><br />{airport.city}, {airport.country}<br />Nhu cầu {airport.demand}/10 · Phí {airport.landingFee.toLocaleString('vi-VN')} $<br />Còn {Math.max(0, (owned?.slots || 0) - (owned?.slotsUsed || 0))} slot · {routeCount} tuyến{!unlocked && <><br /><b>Mở khóa cấp {airport.unlockLevel}</b></>}</Popup>
            </Marker>;
          })}
          <FlightMarkers flights={flights} gameTimeMs={gameTimeMs} timeSpeed={timeSpeed} speed={timeSpeed} planes={planes} airports={airports} currency={currency}/>
        </MapContainer>
      </div>
      <aside className="live-flight-panel"><div className="live-flight-title"><PlaneIcon size={17}/><b>Chuyến bay đang bay</b><span>{flights.length}</span></div>{flights.length ? flights.map((flight) => {
        const route = routes.find((item) => item.id === flight.routeId);
        const eta = Math.max(0, Math.ceil((flight.arrivesAt - gameTimeMs) / (60000 * timeSpeed)));
        return <div className="live-flight-row" key={flight.id}><div className="live-flight-route"><b>{flight.code}</b><span>{flight.from} → {flight.to}</span></div><div className="flight-progress"><i style={{ width: `${flight.progress}%` }}/></div><small>{flight.progress}% · hạ cánh sau {eta} giây</small><small className="live-flight-payout">Dự kiến +{formatCurrency(flight.payout, currency)} · {route?.frequencyPerWeek || 0} chuyến/tuần</small></div>;
      }) : <div className="empty-flights"><span>✈</span><b>Đang chờ chuyến cất cánh</b><small>Máy bay sẽ xuất hiện tại đây theo lịch đường bay.</small></div>}</aside>
    </div>
    <div className="real-map-teasers">
      <div><b>Việt Nam · cấp 1</b><small>12 sân bay · đường bay nội địa cho hãng mới.</small></div>
      <div className={level < 5 ? 'locked-region' : ''}><b>Đông Nam Á · cấp 5</b><small>Thị trường du lịch đông, cơ hội mở tuyến quốc tế gần.</small></div>
      <div className={level < 10 ? 'locked-region' : ''}><b>Đông Á · cấp 10</b><small>Nhu cầu cao, vé đường dài và cạnh tranh mạnh.</small></div>
      <div className={level < 15 ? 'locked-region' : ''}><b>Bay xa · cấp 15</b><small>Châu Âu, Trung Đông, Úc và châu Mỹ cần máy bay thân rộng.</small></div>
    </div>
  </section>;
}
