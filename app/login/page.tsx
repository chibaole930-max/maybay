'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Eye, EyeOff, KeyRound, Plane, ShieldCheck, UserPlus } from 'lucide-react';
import { netClient } from '@/lib/net/netClient';
import { firebaseConfigured, firebaseMissingEnv } from '@/lib/firebase/client';
import { useGameStore } from '@/store/useGameStore';

type Tab = 'login' | 'register';
type Errors = Partial<Record<'email' | 'password' | 'confirm' | 'name' | 'form', string>>;

const EMAIL_HINT = 'Email dùng để đăng nhập và khôi phục tài khoản';

export default function LoginPage() {
  const router = useRouter();
  const airline = useGameStore((s) => s.airline);
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // Cho phep mo thang tab Dang ky bang link /login?tab=register.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (wanted === 'register' || wanted === 'login') setTab(wanted);
  }, []);

  // Đã có phiên đăng nhập thì đưa thẳng vào game.
  useEffect(() => {
    let stop = false;
    netClient.me().then((account) => {
      if (stop) return;
      if (account) router.replace('/dashboard');
      else setChecking(false);
    });
    return () => { stop = true; };
  }, [router]);

  const emailError = useMemo(() => {
    const value = email.trim();
    if (!value) return '';
    // Cùng cách kiểm với Firebase: tránh gửi đi rồi mới bị từ chối.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ.';
    return '';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return '';
    if (password.length < 6) return 'Mật khẩu cần tối thiểu 6 ký tự.';
    return '';
  }, [password]);

  const nameError = useMemo(() => {
    const value = name.trim().replace(/\s+/g, ' ');
    if (!value) return '';
    if (value.length < 3 || value.length > 32) return 'Tên hãng bay phải từ 3 đến 32 ký tự.';
    return '';
  }, [name]);

  const confirmError = useMemo(() => {
    if (!confirm) return '';
    return confirm === password ? '' : 'Mật khẩu nhận lại chưa khớp.';
  }, [confirm, password]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setErrors({});
    setPassword('');
    setConfirm('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (emailError) next.email = emailError;
    if (passwordError) next.password = passwordError;
    if (tab === 'register') {
      if (nameError) next.name = nameError;
      if (confirmError) next.confirm = confirmError;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setErrors({});
    const result = tab === 'login'
      ? await netClient.firebaseSignIn(email.trim(), password)
      : await netClient.firebaseRegister(email.trim(), password, name.trim());

    setBusy(false);
    if (!result.ok) {
      // Firebase báo lỗi bằng mã kỹ thuật; `netClient` đã dịch sang tiếng Việt.
      const message = result.error;
      if (/email/i.test(message)) setErrors({ email: message });
      else if (/mật khẩu|đăng nhập lại/i.test(message)) setErrors({ password: message });
      else if (/tên hãng bay/i.test(message)) setErrors({ name: message });
      else setErrors({ form: message });
      return;
    }
    router.push(airline ? '/dashboard' : '/onboarding');
  };

  if (checking) {
    return (
      <main className="onboard-bg" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <span className="muted">Đang kiểm tra phiên đăng nhập…</span>
      </main>
    );
  }

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
      <div className="card onboard-card" style={{ width: 'min(100%, 460px)', padding: '32px 28px', boxShadow: '0 16px 40px rgba(11, 31, 58, 0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="tile-ic" style={{ width: 52, height: 52, margin: '0 auto 12px' }}>
            <Plane size={26} />
          </div>
          <h1 className="title" style={{ fontSize: 22 }}>
            {tab === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
          </h1>
          <p className="sub">{tab === 'login' ? 'Vào lại hãng bay của bạn, trên mọi thiết khoản' : 'Một tài khoản giữ trọn tiến độ của bạn'}</p>
        </div>

        {!firebaseConfigured && (
          <div className="badge danger" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16, lineHeight: 1.5, fontWeight: 400 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Chưa cấu hình Firebase — đăng nhập tạm thời không dùng được. Thiếu:{' '}
              <code>{firebaseMissingEnv.join(', ')}</code>
            </span>
          </div>
        )}

        <div className="seg-tabs">
          {([['login', 'Đăng nhập', KeyRound], ['register', 'Đăng ký', UserPlus]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              aria-pressed={tab === id}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} noValidate>
          {tab === 'register' && (
            <div style={{ marginBottom: 16 }}>
              <label className="label" htmlFor="airline-name">Tên hãng bay</label>
              <input
                id="airline-name"
                className="input"
                value={name}
                maxLength={32}
                placeholder="Ví dụ: Cánh Én Việt"
                onChange={(e) => setName(e.target.value)}
                autoComplete="organization"
              />
              {(errors.name || nameError) && <FieldError message={errors.name || nameError} />}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              maxLength={120}
              placeholder="vidu@hangbay.vn"
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
            {(errors.email || emailError) && <FieldError message={errors.email || emailError} />}
            {!emailError && !errors.email && <Hint text={EMAIL_HINT} />}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="password">Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="input"
                type={reveal ? 'text' : 'password'}
                value={password}
                maxLength={72}
                placeholder="Tối thiểu 6 ký tự"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="reveal-btn"
              >
                {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {(errors.password || passwordError) && <FieldError message={errors.password || passwordError} />}
          </div>

          {tab === 'register' && (
            <div style={{ marginBottom: 16 }}>
              <label className="label" htmlFor="confirm">Nhập lại mật khẩu</label>
              <input
                id="confirm"
                className="input"
                type={reveal ? 'text' : 'password'}
                value={confirm}
                maxLength={72}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {(errors.confirm || confirmError) && <FieldError message={errors.confirm || confirmError} />}
            </div>
          )}

          {errors.form && (
            <p className="badge danger" style={{ display: 'block', marginBottom: 14, textAlign: 'center' }}>{errors.form}</p>
          )}

          <button className="btn" type="submit" disabled={busy || !firebaseConfigured} style={{ width: '100%', marginTop: 4 }}>
            {busy ? 'Đang xử lý…' : tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight size={16} />
          </button>
        </form>

        <p className="muted" style={{ fontSize: 12, marginTop: 18, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.6 }}>
          <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          Mật khẩu do Firebase quản lý và không bao giờ tới máy chủ game. Máy chủ chỉ
          nhận token đã ký rồi cấp cookie httpOnly nên trang khác đọc không được.
        </p>

        <div style={{ borderTop: '1px solid var(--line)', marginTop: 18, paddingTop: 16, textAlign: 'center' }}>
          <span className="muted" style={{ fontSize: 13 }}>Chưa muốn làm tài khoản? </span>
          <Link href="/onboarding?quick=1" style={{ fontSize: 13, fontWeight: 600 }}>Chơi ngay không cần đăng nhập →</Link>
        </div>
      </div>
    </main>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="field-err">{message}</p>;
}

function Hint({ text }: { text: string }) {
  return <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>{text}</p>;
}