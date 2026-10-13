'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Plane,
  TrendingUp,
  Map,
  ShieldCheck,
  Award,
  Zap,
  Globe2,
  Sparkles,
} from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

export default function Home() {
  const router = useRouter();
  const airline = useGameStore((s) => s.airline);
  const hydrate = useGameStore((s) => s.hydrate);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Navbar */}
      <nav
        className="landing-nav"
        style={{
          height: 76,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1200,
          margin: 'auto',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>✈️</span>
          <b style={{ fontSize: 17, color: 'var(--text)', letterSpacing: -0.3 }}>
            VIETNAM AIRLINE TYCOON
          </b>
        </div>
        <div className="landing-nav-actions">
          <Link className="btn ghost" href="/login">
            {mounted && hydrate && airline ? 'Đổi tài khoản' : 'Đăng nhập'}
          </Link>
          {mounted && hydrate && airline ? (
            <Link className="btn" href="/dashboard">
              <span className="nav-label">Tiếp tục chơi</span>
              <span className="nav-name"> ({airline.name})</span> <ArrowRight size={16} />
            </Link>
          ) : (
            <Link className="btn" href="/login">
              <span className="nav-label">Chơi miễn phí</span> <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ maxWidth: 1200, margin: '20px auto 40px', padding: '0 24px' }}>
        <div className="hero">
          <div style={{ maxWidth: 660, position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: 'rgba(255, 255, 255, 0.16)',
                borderRadius: 30,
                fontSize: 12,
                fontWeight: 700,
                backdropFilter: 'blur(8px)',
              }}
            >
              <Sparkles size={14} color="#ffb800" />
              <span>GAME MÔ PHỎNG QUẢN LÝ HÀNG KHÔNG VIỆT NAM</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(36px, 6vw, 64px)',
                lineHeight: 1.1,
                letterSpacing: -1.5,
                margin: '20px 0 16px',
                fontWeight: 800,
              }}
            >
              Bầu trời Việt Nam
              <br />
              <span style={{ color: '#ffb800' }}>trong tầm tay bạn.</span>
            </h1>

            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#d2e1f4', maxWidth: 540 }}>
              Khởi nghiệp từ một chiếc máy bay cánh quạt ATR 72. Kết nối các đô thị từ Bắc chí Nam.
              Cạnh tranh khốc liệt với 20 hãng đối thủ AI để xây dựng đế chế hàng không số 1 Việt Nam.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <Link
                className="btn"
                href={mounted && hydrate && airline ? '/dashboard' : '/login'}
                style={{
                  padding: '14px 28px',
                  fontSize: 16,
                  background: '#ffb800',
                  color: '#0b1f3a',
                  fontWeight: 800,
                }}
              >
                {mounted && hydrate && airline ? 'Vào phòng điều hành' : 'Đăng ký để chơi miễn phí'} <ArrowRight size={18} />
              </Link>
              <Link className="btn ghost" href="/tutorial" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                Xem hướng dẫn 5 phút
              </Link>
            </div>

            <div
              style={{
                marginTop: 28,
                fontSize: 12,
                color: '#a9bfd9',
                display: 'flex',
                gap: 18,
                flexWrap: 'wrap',
              }}
            >
              <span>✓ 100% Tiếng Việt chuẩn xác</span>
              <span>✓ Lưu offline tự động</span>
              <span>✓ Tương thích trọn vẹn Mobile & PC</span>
            </div>
          </div>
          <div className="plane-art"><svg viewBox="0 0 160 110" aria-label="Máy bay cất cánh"><path d="M10 62 147 16l-54 55-14 32-17-26z" fill="#fff"/><path d="m62 77 40-31-13 39-13 14z" fill="#38bdf8"/></svg></div>
        </div>

        {/* Highlight Stats Banner */}
        <div
          className="stat-grid"
          style={{
            marginTop: 24,
          }}
        >
          <div className="card" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>24</span>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Dòng máy bay danh tiếng</div>
            <div className="muted" style={{ fontSize: 11 }}>ATR, Airbus, Boeing, Embraer, COMAC</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>18</span>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Sân bay kết nối</div>
            <div className="muted" style={{ fontSize: 11 }}>Nội địa 3 miền & Quốc tế khu vực</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-ink)' }}>20</span>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Hãng đối thủ AI</div>
            <div className="muted" style={{ fontSize: 11 }}>Cạnh tranh giá vé và thị phần sống động</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#7b4fe0' }}>30</span>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Huy hiệu thành tựu</div>
            <div className="muted" style={{ fontSize: 11 }}>Thử thách đa dạng trên hành trình</div>
          </div>
        </div>

        {/* Core Game Features */}
        <div style={{ textAlign: 'center', margin: '64px auto 30px' }}>
          <h2 style={{ fontSize: 30, color: 'var(--text)', letterSpacing: -0.5 }}>
            Vòng lặp quản trị sâu sắc & hấp dẫn
          </h2>
          <p className="muted" style={{ fontSize: 15, marginTop: 6 }}>
            Lấy cảm hứng từ những tựa game quản lý hàng không kinh điển thế giới.
          </p>
        </div>

        <div className="grid-3">
          <div className="card">
            <span style={{ color: 'var(--blue)', display: 'block', marginBottom: 12 }}>
              <Plane size={32} />
            </span>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Xây dựng & Nâng cấp Đội bay</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              Mua bán, đổi tên và theo dõi tỷ lệ hao mòn máy bay. Trang bị ghế hạng thương gia và cánh phụ
              Winglets tiết kiệm nhiên liệu để tối đa hóa doanh thu.
            </p>
          </div>

          <div className="card">
            <span style={{ color: 'var(--success)', display: 'block', marginBottom: 12 }}>
              <Map size={32} />
            </span>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Quy hoạch Mạng đường bay</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              Bản đồ tương tác SVG trực quan. Tự do cân chỉnh giá vé, tần suất bay và phân tích hệ số lấp
              đầy theo thời gian thực trước khi khai trương.
            </p>
          </div>

          <div className="card">
            <span style={{ color: '#ffb800', display: 'block', marginBottom: 12 }}>
              <TrendingUp size={32} />
            </span>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Tài chính & Thu nhập Ngoại tuyến</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              Thu lợi nhuận realtime mỗi 10 giây và tiếp tục tích lũy tới 8 giờ khi bạn tắt máy.
              Bảng thu chi minh bạch cùng cơ chế vay vốn ngân hàng linh hoạt.
            </p>
          </div>
        </div>

        <section className="landing-steps"><h2>Ba bước để hãng bay cất cánh</h2><div className="grid-3">{[['01','Đặt tên hãng','Chọn thương hiệu hoặc bắt đầu nhanh với cấu hình gợi ý.'],['02','Mua máy bay','ATR 72 phù hợp để khai thác các chặng ngắn trong nước.'],['03','Mở tuyến đầu tiên','Kết nối SGN với Đà Nẵng, đặt giá vé và bắt đầu kiếm lời.']].map(([n,t,d])=><article className="card" key={n}><span className="step-number">{n}</span><h3>{t}</h3><p className="muted">{d}</p></article>)}</div></section>
        <section className="landing-section"><h2>Chọn máy bay phù hợp</h2><div className="table-wrap card"><table><thead><tr><th>MẪU MÁY BAY</th><th>SỨC CHỨA</th><th>TẦM BAY</th><th>GIÁ TỪ</th></tr></thead><tbody><tr><td><b>ATR 72-600</b></td><td>70 khách</td><td>1.500 km</td><td>3.500.000 $</td></tr><tr><td><b>Embraer E175</b></td><td>88 khách</td><td>3.700 km</td><td>5.500.000 $</td></tr><tr><td><b>Airbus A220-300</b></td><td>130 khách</td><td>6.200 km</td><td>9.800.000 $</td></tr></tbody></table></div></section>
        <section className="landing-section"><h2>Câu hỏi thường gặp</h2><div className="faq-grid">{[['Tôi có cần kinh nghiệm chơi game quản lý không?','Không. Gợi ý trên màn hình và hướng dẫn tương tác sẽ giúp bạn bắt đầu từng bước.'],['Trò chơi có miễn phí không?','Có. Đây là trò chơi mô phỏng miễn phí với dữ liệu giả lập.'],['Tiến trình được lưu ở đâu?','Tiến trình được lưu tự động trong trình duyệt trên thiết bị của bạn.'],['Tôi có kiếm tiền khi đóng trang không?','Có. Hãng tiếp tục tính lợi nhuận ngoại tuyến tối đa 8 giờ.'],['Làm sao để mở thêm máy bay và tính năng?','Khai thác đường bay, hoàn thành nhiệm vụ và lên cấp để mở rộng dần.']].map(([q,a])=><details className="faq-item card" key={q}><summary>{q}</summary><p className="muted">{a}</p></details>)}</div></section>

        {/* Footer */}
        <div className="landing-footer" style={{ textAlign: 'center', padding: '40px 0 30px' }}>
          <ShieldCheck size={28} color="var(--blue)" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Vietnam Airline Tycoon · Mô phỏng hàng không với tiến trình lưu trực tiếp trên thiết bị.
          </div>
        </div>
      </section>
    </main>
  );
}
