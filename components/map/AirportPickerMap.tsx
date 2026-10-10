'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Plus, X } from 'lucide-react';
import type { Airport } from '@/types';
import { draftAirport, type AirportDraft } from '@/lib/geo-naming';

/** Đặt một chấm khi người chơi bấm vào bản đồ. */
function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

/** Đưa bản đồ về đúng vị trí sân bay vừa chọn. */
function Recenter({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 6, { duration: 0.6 });
  }, [map, target]);
  return null;
}

const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY;
const tileUrl = (theme: 'light' | 'dark') => {
  const base = theme === 'dark' ? 'dark_all' : 'voyager';
  const key = CARTO_KEY ? `?key=${CARTO_KEY}` : '';
  return `https://{s}.basemaps.cartocdn.com/rastertiles/${base}/{z}/{x}/{y}{r}.png${key}`;
};

type Props = {
  theme: 'light' | 'dark';
  existingAirports: Airport[];
  draft: AirportDraft | null;
  onDraftChange: (draft: AirportDraft | null) => void;
  onConfirm: (draft: AirportDraft) => void;
};

export function AirportPickerMap({ theme, existingAirports, draft, onDraftChange, onConfirm }: Props) {
  const handlePick = (lat: number, lng: number) => {
    onDraftChange(draftAirport(lat, lng, existingAirports.map((a) => a.code)));
  };

  const newPin = useMemo(
    () => L.divIcon({ className: 'airport-pin-new', html: '✈', iconSize: [30, 30], iconAnchor: [15, 15] }),
    []
  );

  const clearDraft = () => onDraftChange(null);

  return (
    <div className="airport-picker">
      <div className="airport-picker-map">
        <MapContainer center={[16.5, 108]} zoom={3} minZoom={2} maxZoom={12} scrollWheelZoom className="leaflet-airport-picker">
          <TileLayer attribution="&copy; OpenStreetMap &copy; CARTO" url={tileUrl(theme)} />
          <ClickToPlace onPick={handlePick} />
          <Recenter target={draft ? { lat: draft.lat, lng: draft.lng } : null} />
          {existingAirports.map((airport) => (
            <Marker
              key={airport.code}
              position={[airport.lat, airport.lon]}
              icon={L.divIcon({
                className: 'airport-pin-existing',
                html: `<span>${airport.code}</span>`,
                iconSize: [44, 20],
                iconAnchor: [22, 10],
              })}
            >
              <Popup>
                <b>{airport.code}</b> · {airport.name}
                <br />
                {airport.city}, {airport.country}
              </Popup>
            </Marker>
          ))}
          {draft && (
            <Marker position={[draft.lat, draft.lng]} icon={newPin}>
              <Popup>{draft.code} — vị trí đang chọn</Popup>
            </Marker>
          )}
        </MapContainer>

        {!draft && (
          <div className="airport-picker-hint">
            <MapPin size={16} /> Bấm vào bản đồ để đặt sân bay mới
          </div>
        )}
      </div>

      {draft && (
        <form
          className="airport-picker-form"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(draft);
          }}
        >
          <div className="airport-picker-head">
            <div>
              <b>
                Vị trí mới: {draft.lat.toFixed(3)}, {draft.lng.toFixed(3)}
              </b>
              <small>
                {draft.country} · mở khóa cấp {draft.unlockLevel}
              </small>
            </div>
            <button type="button" className="btn ghost compact" onClick={clearDraft}>
              <X size={14} /> Bỏ chọn
            </button>
          </div>

          <label className="airport-picker-field">
            Tên sân bay
            <input
              value={draft.name}
              maxLength={60}
              onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
              placeholder="Ví dụ: Sân bay Quốc tế Mới"
            />
          </label>

          <label className="airport-picker-field">
            Thành phố / khu vực
            <input
              value={draft.city}
              maxLength={40}
              onChange={(event) => onDraftChange({ ...draft, city: event.target.value })}
            />
          </label>

          <div className="airport-picker-row">
            <label className="airport-picker-field">
              Phí hạ cánh ($)
              <input
                type="number"
                min={10}
                max={2000}
                step={5}
                value={draft.landingFee}
                onChange={(event) => onDraftChange({ ...draft, landingFee: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="airport-picker-field">
              Nhu cầu (1-10)
              <input
                type="number"
                min={1}
                max={10}
                value={draft.demand}
                onChange={(event) =>
                  onDraftChange({ ...draft, demand: Math.min(10, Math.max(1, Number(event.target.value) || 1)) })
                }
              />
            </label>
          </div>

          <div className="airport-picker-foot">
            <span className="muted">
              Mã sân bay: <b>{draft.code}</b>
            </span>
            <button type="submit" className="btn">
              <Plus size={15} /> Xây dựng sân bay
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
