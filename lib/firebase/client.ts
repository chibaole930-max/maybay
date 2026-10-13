/**
 * Firebase client — chỉ phần Authentication.
 *
 * Chỉ khởi tạo khi biến môi trường có đủ. Lý do: app vẫn phải chạy được ở
 * chế độ khách (không cần đăng nhập) và ở môi trường local khi chưa cấu hình
 * Firebase — `initializeApp` với config rỗng sẽ ném lỗi ngay khi import.
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

/** Thông báo cho UI khi thiếu cấu hình — nêu đúng biến còn thiếu. */
export const firebaseMissingEnv: string[] = ([
  ['NEXT_PUBLIC_FIREBASE_API_KEY', config.apiKey],
  ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', config.authDomain],
  ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', config.projectId],
  ['NEXT_PUBLIC_FIREBASE_APP_ID', config.appId],
] as const)
  .filter(([, value]) => !value)
  .map(([name]) => name);

let cached: Auth | null = null;

/** `null` khi chưa cấu hình Firebase — gọi chỗ này phải xử lý cả hai nhánh. */
export function firebaseAuth(): Auth | null {
  if (!firebaseConfigured) return null;
  if (!cached) cached = getAuth(getApps().length ? getApp() : initializeApp(config));
  return cached;
}

/**
 * Dịch lỗi Firebase sang tiếng Việt.
 *
 * Mã lỗi của Firebase là chuỗi kỹ thuật (`auth/invalid-credential`) — đưa thẳng
 * lên UI thì người chơi không hiểu gì. Mã mới thêm vào thì hiện luôn `message`
 * kèm mã, để còn tra cứu được.
 */
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Email không hợp lệ.',
  'auth/missing-password': 'Chưa nhập mật khẩu.',
  'auth/weak-password': 'Mật khẩu quá yếu — cần tối thiểu 6 ký tự.',
  'auth/email-already-in-use': 'Email này đã có tài khoản. Hãy đăng nhập.',
  'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
  'auth/user-not-found': 'Email hoặc mật khẩu không đúng.',
  'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
  'auth/invalid-login-credentials': 'Email hoặc mật khẩu không đúng.',
  'auth/too-many-requests': 'Bạn thử quá nhiều lần. Chờ một lúc rồi thử lại.',
  'auth/network-request-failed': 'Không có mạng — kiểm tra kết nối rồi thử lại.',
  'auth/requires-recent-login': 'Bạn đã đăng nhập quá lâu. Đăng nhập lại để tiếp tục.',
  'auth/user-disabled': 'Tài khoản đã bị vô hiệu hoá.',
};

export function firebaseErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (code) return `Không đăng nhập được (${code}).`;
  return error instanceof Error ? error.message : 'Không kết nối được máy chủ.';
}