// e.g. "CLT-B2D3LW" — matches the client_id format the backend itself generates.
const CLIENT_ID_PATTERN = /^CLT-[A-Z0-9]{6}$/;

export function isClientId(value: string): boolean {
  return CLIENT_ID_PATTERN.test(value);
}
