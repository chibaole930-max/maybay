'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, KeyRound, Plane, ShieldCheck, UserPlus } from 'lucide-react';
import { netClient } from '@/lib/net/netClient';
import { useGameStore } from '@/store/useGameStore';

type Tab = 'login' | 'register';
type Errors = Partial<Record<'username' | 'password' | 'confirm' | 'name' | 'form', string>>;

const USERNAME_HINT = '3-20 ký tự, chỉ gồm chữ thường, số và . _ -';

export default function LoginPage() {
  const router = useRouter();
  const airline = useGameStore((s) => s.airline);
  const [tab, setTab] = useState<Tab>('login');
  const [username, setUsername] = useState('');
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

  const usernameError = useMemo(() => {
    const value = username.trim().toLowerCase();
    if (!value) return '';
    if (value.length < 3 || value.length > 20) return 'Tên đăng nhập phải từ 3 đến 20 ký tự.';
    if (!/^[a-z0-9._-]+$/.test(value)) return 'Chỉ gồm chữ thường, số và . _ -';
    if (/^[._-]|[._-]$/.test(value)) return 'Không được bắt đầu hoặc kết thúc bằng . _ -';
    return '';
  }, [username]);

  const passwordError = useMemo(() => {
    if (!password) return '';
    if (password.length < 6) return 'Mật khẩu cần tối thiểu 6 ký tự.';
    if (password.length > 72) return 'Mật khẩu tối đa 72 ký tự.';
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
    return confirm === password ? '' : 'Mật khẩu nhập lại chưa khớp.';
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
    if (usernameError) next.username = usernameError;
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
      ? await netClient.login(username.trim().toLowerCase(), password)
      : await netClient.register({ username: username.trim().toLowerCase(), password, name: name.trim() });

    setBusy(false);
    if (!result.ok) {
      // Server là nguồn duy nhất biết tên đăng nhập đã bị chiếm chưa.
      const message = result.error;
      if (/ten dang nhap/i.test(message)) setErrors({ username: message });
      else if (/mat khau|khong dung/i.test(message)) setErrors({ password: message });
      else if (/ten hang/i.test(message)) setErrors({ name: message });
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
            <label className="label" htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              className="input"
              value={username}
              maxLength={20}
              placeholder="vidu.canh.en"
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
            {(errors.username || usernameError) && <FieldError message={errors.username || usernameError} />}
            {!usernameError && !errors.username && <Hint text={USERNAME_HINT} />}
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

          <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
            {busy ? 'Đang xử lý…' : tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight size={16} />
          </button>
        </form>

        <p className="muted" style={{ fontSize: 12, marginTop: 18, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.6 }}>
          <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          Mật khẩu được hash bằng scrypt trước khi lưu. Phiên đăng nhập nằm trong cookie
          httpOnly nên trang web khác đọc không được.
        </p>

        <div style={{ borderTop: '1px solid var(--line)', marginTop: 18, paddingTop: 16, textAlign: 'center' }}>
          <Link href="/tutorial" style={{ fontSize: 13, fontWeight: 600 }}>Chưa biết chơi? Xem hướng dẫn trước →</Link>
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
