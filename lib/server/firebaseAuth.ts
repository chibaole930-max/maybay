import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Xác thực ID token do Firebase client SDK cấp.
 *
 * Chọn `jose` + JWKS công khai của Google thay vì `firebase-admin` vì Firebase
 * **không có private key nào trong tay ta** ở kiểu này: ID token do Google ký,
 * và Google công bố chứng thư công khai đúng để ta kiểm tra. Nhờ vậy server chỉ
 * cần đúng một thông bảo mật là `projectId`, không phải file service account
 * (`private_key.json`) — xoá được, lộ ra cũng không nỡ như private key.
 *
 * Nhược điểm so với `firebase-admin`: không quản lý được người dùng (xoá hẳn,
 * liệt kê...). Game không cần những thứ đó.
 */

/**
 * Endpoint JWKS của Firebase. Chứng thư được Google xoay vòng; `jose` tự tải và
 * cache lại, và tự tải lại khi gặp token ký bằng chứng thư mới.
 *
 * Chỉ đọc được trong môi trường Node — Next.js đóng gói `jose` vào server
 * bundle, nhưng gọi nhầm từ client sẽ văng lỗi.
 */
const DEFAULT_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/**
 * Điểm cấu hình JWKS. Biến môi trường `FIREBASE_JWKS_URL` chỉ dùng cho kiểm thử
 * với một JWKS cục bộ — không đặt nó trong môi trường thật, nếu không kẻ xấu có
 * thể trỏ server sang chứng thư của mình và tự ký token hợp lệ.
 */
const JWKS_URL = (process.env.FIREBASE_JWKS_URL || '').trim() || DEFAULT_JWKS_URL;

export class FirebaseAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseAuthError';
  }
}

/** Server chưa được cấu hình Firebase — lỗi cấu hình, không phải lỗi người dùng. */
export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super('Máy chủ chưa cấu hình Firebase (thiếu FIREBASE_PROJECT_ID). Thêm biến môi trường rồi khởi động lại máy chủ.');
    this.name = 'FirebaseNotConfiguredError';
  }
}

const projectId = (): string => (process.env.FIREBASE_PROJECT_ID || '').trim();

export const firebaseReady = (): boolean => projectId() !== '';

// Cache theo projectId để không tạo lại JWKS khi đổi biến môi trường (chỉ xảy ra khi restart).
let jwksCache: { project: string; set: ReturnType<typeof createRemoteJWKSet> } | null = null;

const jwksFor = (project: string) => {
  if (jwksCache?.project !== project) jwksCache = { project, set: createRemoteJWKSet(new URL(JWKS_URL)) };
  return jwksCache.set;
};

/** Thông tin đã xác thực, lấy từ claim của ID token. */
export interface FirebaseIdentity {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

type Decoded = JWTPayload & { firebase?: { sign_in_provider?: string } };

/**
 * Kiểm các claim mà `jose` chưa lo: có đúng là ai, và token có gắn với dự án
 * này không.
 *
 * Tách riêng khỏi `verifyIdToken` vì đây là phần thuộc về mã của ta — hàm thuần,
 * không đụng mạng, nên kiểm chứng được trực tiếp. Việc xác minh chữ ký thì do
 * `jose` đảm nhiệm và không cần ta kiểm lại.
 */
export function checkClaims(payload: JWTPayload, project: string): FirebaseIdentity {
  // `jose` đã kiểm chữ ký, hạn (`exp`), `iss` và `aud` rồi. Cái còn lại là:
  // `sub` — không có nó thì không biết token này của ai.
  if (!payload.sub) throw new FirebaseAuthError('Token thiếu định danh người dùng.');
  if (!payload.iss || payload.iss !== `https://securetoken.google.com/${project}`) {
    throw new FirebaseAuthError('Token không thuộc dự án này.');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
    emailVerified: payload.email_verified === true,
    displayName: typeof payload.name === 'string' ? payload.name : null,
  };
}

/**
 * Kiểm chữ ký + các claim bắt buộc của một ID token.
 *
 * Trả về thông tin người dùng, hoặc ném `FirebaseAuthError` nếu token sai/hết hạn.
 */
export async function verifyIdToken(idToken: string): Promise<FirebaseIdentity> {
  const project = projectId();
  if (!project) throw new FirebaseNotConfiguredError();
  if (typeof idToken !== 'string' || idToken.length < 100) {
    throw new FirebaseAuthError('Token không hợp lệ.');
  }

  try {
    const { payload } = await jwtVerify<Decoded>(idToken, jwksFor(project), {
      issuer: `https://securetoken.google.com/${project}`,
      audience: project,
    });
    return checkClaims(payload, project);
  } catch (error) {
    if (error instanceof FirebaseAuthError) throw error;
    // Không nên đẩy nguyên lỗi `jose` ra ngoài — nó lộ chi tiết nội bộ và
    // không có gì hữu ích với người dùng.
    throw new FirebaseAuthError('Token không hợp lệ hoặc đã hết hạn.');
  }
}