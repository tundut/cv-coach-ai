export interface IdTokenClaims {
  sub: string;
  email: string;
  name?: string;
  exp: number;
}

/**
 * Decode JWT payload (không verify — chỉ dùng để hiển thị thông tin user).
 * Việc verify thực sự do backend/Cognito authorizer đảm nhận.
 */
export function decodeIdToken(token: string): IdTokenClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    // atob trả về chuỗi byte latin1 — cần decode lại thành UTF-8
    // để ký tự tiếng Việt có dấu không bị vỡ (vd "Tuấn").
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder('utf-8').decode(bytes);

    return JSON.parse(json) as IdTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Kiểm tra token đã hết hạn chưa.
 */
export function isTokenExpired(claims: IdTokenClaims): boolean {
  return claims.exp * 1000 < Date.now();
}
