export interface ParsedUserAgent {
  device: 'mobile' | 'tablet' | 'desktop'
  os: string
  browser: string
}

export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const device = /iPad|Tablet/i.test(userAgent)
    ? 'tablet'
    : /Mobi|Android/i.test(userAgent)
      ? 'mobile'
      : 'desktop'

  let os = 'unknown'
  if (/Windows/i.test(userAgent)) os = 'Windows'
  else if (/iPhone|iPad|iOS/i.test(userAgent)) os = 'iOS'
  else if (/Mac OS/i.test(userAgent)) os = 'macOS'
  else if (/Android/i.test(userAgent)) os = 'Android'
  else if (/Linux/i.test(userAgent)) os = 'Linux'

  let browser = 'unknown'
  if (/Edg\//i.test(userAgent)) browser = 'Edge'
  else if (/Chrome\//i.test(userAgent)) browser = 'Chrome'
  else if (/Firefox\//i.test(userAgent)) browser = 'Firefox'
  else if (/Safari\//i.test(userAgent)) browser = 'Safari'

  return { device, os, browser }
}
