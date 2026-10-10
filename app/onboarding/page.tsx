'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Plane, Building2, Shield, Sparkles } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { airports } from '@/lib/mock-data';

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
  const handleQuickStart = () => { start({name:'Cánh Én Việt',color:colors[0],icon:icons[0],base:'SGN',difficulty:'de'}); router.push('/dashboard'); };
  const quickHandled = useRef(false);
  useEffect(() => { if (window.location.search.includes('quick=1') && !quickHandled.current) { quickHandled.current=true; handleQuickStart(); } }, []);

  const selectedBaseAirport = airports.find((a) => a.code === base);

  return (
    <main
      className="onboard-bg"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px 16px',
        background: 'linear-gradient(135deg, #eef5fc, #f4f7fc)',
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
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: '#0a58ca18',
              color: '#0a58ca',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 12px',
              fontSize: 28,
            }}
          >
            ✈️
          </div>
          <h1 className="title" style={{ fontSize: 24 }}>
            Thành lập Hãng hàng không mới
          </h1>
          <p className="sub">Bước {step} trên 2 · Bắt đầu hành trình chinh phục không phận Việt Nam</p>
        </div>

        <button type="button" className="btn quick-btn" onClick={handleQuickStart}><Sparkles size={17}/> Chơi nhanh <span>Bắt đầu với hãng Cánh Én Việt</span><ArrowRight size={17}/></button>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 30 }}>
          {[1, 2].map((n) => (
            <div
              key={n}
              style={{
                height: 6,
                flex: 1,
                borderRadius: 6,
                background: n <= step ? '#0a58ca' : 'rgba(0,0,0,0.08)',
                transition: 'background 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* STEP 1: Name, Color, Icon */}
        {step === 1 && (
          <div>
            <label className="label">
              Tên thương hiệu hãng bay <span style={{ color: '#e84b3c' }}>*</span>
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
                color: name.length > 0 && !isNameValid ? '#e84b3c' : 'var(--muted)',
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
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: c,
                    border: color === c ? '3px solid #0b1f3a' : '2px solid transparent',
                    boxShadow: color === c ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    transform: color === c ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.15s',
                  }}
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
                  className="btn ghost"
                  style={{
                    fontSize: 22,
                    padding: 8,
                    minWidth: 48,
                    minHeight: 48,
                    borderColor: icon === i ? '#0a58ca' : undefined,
                    background: icon === i ? '#0a58ca15' : undefined,
                  }}
                >
                  {i}
                </button>
              ))}
            </div>

            {/* Live Preview badge */}
            <div
              style={{
                marginTop: 24,
                padding: '12px 16px',
                borderRadius: 14,
                background: 'var(--bg)',
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
            <label className="label">Chọn độ khó và quy mô khởi nghiệp</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  id: 'de' as const,
                  title: 'Dễ (Easy)',
                  cash: '15.000.000 $',
                  desc: 'Vốn dồi dào, nhu cầu hành khách cao, kinh doanh thuận lợi cho tân thủ.',
                },
                {
                  id: 'thuong' as const,
                  title: 'Thường (Normal)',
                  cash: '10.000.000 $',
                  desc: 'Trải nghiệm chuẩn mực, kinh tế cân bằng, thử thách thực tế.',
                },
                {
                  id: 'kho' as const,
                  title: 'Khó (Hard)',
                  cash: '6.000.000 $',
                  desc: 'Vốn eo hẹp, nhu cầu thị trường giảm 10%, đòi hỏi tư duy chiến lược cao.',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setDifficulty(item.id)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderColor: difficulty === item.id ? '#0a58ca' : 'var(--line)',
                    background: difficulty === item.id ? 'rgba(10, 88, 202, 0.04)' : 'var(--surface)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: 14 }}>{item.title}</b>
                      <span className="badge" style={{ color: '#0a58ca' }}>
                        {item.cash}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {item.desc}
                    </div>
                  </div>
                  {difficulty === item.id && <Check color="#0a58ca" size={20} />}
                </div>
              ))}
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
              className="btn"
              onClick={handleSubmit}
              style={{ background: '#12a678' }}
            >
              Cất cánh ngay! ✈️
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
