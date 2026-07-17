import { describe, it, expect } from 'vitest'
import { parseUserAgent } from './parseUserAgent'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

describe('parseUserAgent', () => {
  it('identifica iPhone como mobile/iOS/Safari', () => {
    expect(parseUserAgent(IPHONE_SAFARI)).toEqual({ device: 'mobile', os: 'iOS', browser: 'Safari' })
  })

  it('identifica Android como mobile/Android/Chrome', () => {
    expect(parseUserAgent(ANDROID_CHROME)).toEqual({
      device: 'mobile',
      os: 'Android',
      browser: 'Chrome',
    })
  })

  it('identifica Windows + Edge (nao confunde com Chrome)', () => {
    expect(parseUserAgent(WINDOWS_EDGE)).toEqual({
      device: 'desktop',
      os: 'Windows',
      browser: 'Edge',
    })
  })

  it('identifica macOS + Chrome desktop', () => {
    expect(parseUserAgent(MAC_CHROME)).toEqual({ device: 'desktop', os: 'macOS', browser: 'Chrome' })
  })

  it('identifica iPad como tablet', () => {
    expect(parseUserAgent(IPAD_SAFARI)).toEqual({ device: 'tablet', os: 'iOS', browser: 'Safari' })
  })
})
