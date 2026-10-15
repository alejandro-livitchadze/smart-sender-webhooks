const STORAGE_KEY = 'fingerprint'

// Stable device id: 32 hex chars, generated once and kept in localStorage.
export function getFingerprint(): string {
  let fingerprint = localStorage.getItem(STORAGE_KEY)
  if (!fingerprint) {
    fingerprint = crypto.randomUUID().replaceAll('-', '')
    localStorage.setItem(STORAGE_KEY, fingerprint)
  }
  return fingerprint
}
