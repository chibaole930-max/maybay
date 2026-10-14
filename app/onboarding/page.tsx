'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Plane, Building2, Shield, Sparkles } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { airports } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/formulas';
import { DIFFICULTIES, STARTING_CASH } from '@/lib/tuning';

const colors = [
  '#0A58CA', // Xanh Dương Hàng Không
  '#12A678', // Xanh Ngọc Lục Bảo
  '#E84B3C', // Đỏ Cờ
  '#7B4FE0', // Tím Hoàng Gia
  '#E89A20', // Vàng Cam
  '#0B1F3A', // Xanh Đen Navy
  '#E45D9A', // Hồng Cánh Sen
  '#1597B8', // Xanh Biển Thái Bình Dương
];

const icons = ['✈️', '🦅', '🌟', '🌺', '🪽', '☁️', '🧭', '🌏'];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [icon, setIcon] = useState(icons[0]);
  const [base, setBase] = useState('SGN');
  const [difficulty, setDifficulty] = useState<'de' | 'thuong' | 'kho'>('thuong');

  const start = useGameStore((s) => s.start);
  const router = useRouter();

  const isNameValid = name.trim().length >= 3 && name.trim().length <= 24;

  const handleSubmit = () => { if (!isNameValid) return; start({ name: name.trim(), color, icon, base: 'SGN', difficulty }); router.push('/dashboard'); };
  // Không còn chế độ khách: phải đăng nhập thì mới tạo được hãng bay, nên
  // `?quick=1` cũng bị chặn. Để người dùng tới từ link cũ không rơi vào
  // trang trắng.
  const quickHandled = useRef(false);
  useEffect(() => {
    if (!window.location.search.includes('quick=1') || quickHandled.current) return;
    quickHandled.current = true;
    router.replace('/login');
  }, [router]);

  const selectedBaseAirport = airports.find((a) => a.code === base);

  return (
    <main
      className="onboard-bg"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="card onboard-card"
        style={{
          width: 'min(100%, 640px)',
          padding: '36px 32px',
          boxShadow: '0 16px 40px rgba(11, 31, 58, 0.08)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="tile-ic" style={{ width: 56, height: 56, margin: '0 auto 12px', fontSize: 28 }}>
            ✈️
          </div>
          <h1 className="title" style={{ fontSize: 24 }}>
            Thành lập Hãng hàng không mới
          </h1>
          <p className="sub">Bước {step} trên 2 · Bắt đầu hành trình chinh phục không phận Việt Nam</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 30 }}>
          {[1, 2].map((n) => (
            <div
              key={n}
              style={{
                height: 6,
                flex: 1,
                borderRadius: 6,
                background: n <= step ? 'var(--blue)' : 'var(--surface-sunken)',
                transition: 'background 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* STEP 1: Name, Color, Icon */}
        {step === 1 && (
          <div>
            <label className="label">
              Tên thương hiệu hãng bay <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              className="input"
              maxLength={24}
              placeholder="Ví dụ: Cánh Én Việt, Saigon Sky, Bamboo Wings..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                marginTop: 6,
                color: name.length > 0 && !isNameValid ? 'var(--danger)' : 'var(--muted)',
              }}
            >
              <span>{name.length < 3 ? 'Tối thiểu 3 ký tự' : 'Hợp lệ'}</span>
              <span>{name.length}/24 ký tự</span>
            </div>

            <label className="label" style={{ marginTop: 24 }}>
              Màu sắc nhận diện thương hiệu
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={`swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c, width: 40, height: 40 }}
                />
              ))}
            </div>

            <label className="label" style={{ marginTop: 24 }}>
              Biểu tượng logo hãng
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {icons.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`logo-btn ${icon === i ? 'selected' : ''}`}
                >
                  {i}
                </button>
              ))}
            </div>

            {/* Live Preview badge */}
            <div
              className="card sub-card"
              style={{
                marginTop: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: color,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 22,
                  color: 'white',
                }}
              >
                {icon}
              </div>
              <div>
                <b style={{ fontSize: 14 }}>{name.trim() || 'Tên hãng của bạn'}</b>
                <div className="muted" style={{ fontSize: 11 }}>Xem trước nhận diện thương hiệu</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Base Airport */}
        {step === 99 && (
          <div>
            <label className="label">Lựa chọn Sân bay căn cứ (Hub)</label>
            <select
              className="select"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            >
              {airports
                .filter((a) => a.country === 'Việt Nam')
                .map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name} ({a.city})
                  </option>
                ))}
            </select>

            {selectedBaseAirport && (
              <div
                className="card"
                style={{
                  marginTop: 18,
                  background: 'var(--bg)',
                  borderColor: 'rgba(10, 88, 202, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: 15, color: '#0a58ca' }}>
                    🛫 {selectedBaseAirport.name}
                  </b>
                  <span className="badge">Căn cứ chính</span>
                </div>
                <div className="muted" style={{ fontSize: 12, margin: '8px 0 12px' }}>
                  {selectedBaseAirport.city}, Việt Nam · Phí hạ cánh: {selectedBaseAirport.landingFee} $/lượt
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  ✨ <b>Đặc quyền căn cứ:</b> Giảm <b>20%</b> toàn bộ phí cất và hạ cánh trên tất cả
                  các chuyến bay xuất phát hoặc hạ cánh tại {selectedBaseAirport.code}.
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Difficulty */}
        {step === 2 && (
          <div>
            <label className="label">Chọn độ khó vận hành</label>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: 12.5 }}>
              Mọi hãng bay đều khởi đầu với {formatCurrency(STARTING_CASH, 'USD')} — không chọn vốn.
              Độ khó chỉ quyết định thị trường và chi phí sau đó.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(['de', 'thuong', 'kho'] as const).map((id) => {
                const config = DIFFICULTIES[id];
                const item = {
                  id,
                  title: `${config.label} (${id === 'de' ? 'Easy' : id === 'kho' ? 'Hard' : 'Normal'})`,
                  cash: `Nhu cầu ×${config.demandMultiplier} · Chi phí ×${config.costMultiplier}`,
                  desc: config.tagline,
                };
                return (
                <div
                  key={item.id}
                  onClick={() => setDifficulty(item.id)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderColor: difficulty === item.id ? 'var(--blue)' : 'var(--line)',
                    background: difficulty === item.id ? 'var(--blue-light)' : 'var(--surface)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: 14 }}>{item.title}</b>
                      <span className="badge info">
                        {item.cash}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {item.desc}
                    </div>
                  </div>
                  {difficulty === item.id && <Check color="var(--blue)" size={20} />}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => (step === 1 ? router.push('/') : setStep(step - 1))}
          >
            {step === 1 ? 'Hủy' : 'Quay lại'}
          </button>

          {step < 2 ? (
            <button
              type="button"
              className="btn"
              disabled={step === 1 && !isNameValid}
              onClick={() => setStep(step + 1)}
            >
              Tiếp tục <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn success"
              onClick={handleSubmit}
            >
              Cất cánh ngay! ✈️
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
