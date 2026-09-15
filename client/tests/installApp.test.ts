import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isIosDevice, isStandaloneDisplay } from '../src/installApp.ts'

type Manifest = {
  name: string
  start_url: string
  scope: string
  display: string
  icons: Array<{ src: string; sizes: string; type: string }>
}

describe('mobile installation', () => {
  it('provides installable app metadata and correctly sized icons', () => {
    const manifest = JSON.parse(readFileSync(
      new URL('../public/manifest.webmanifest', import.meta.url),
      'utf8',
    )) as Manifest

    expect(manifest.name).toBe('Fore the Record')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')

    for (const size of [192, 512]) {
      const icon = manifest.icons.find((entry) => entry.sizes === `${size}x${size}`)
      expect(icon?.type).toBe('image/png')
      const png = readFileSync(new URL(`../public${icon?.src}`, import.meta.url))
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(png.readUInt32BE(16)).toBe(size)
      expect(png.readUInt32BE(20)).toBe(size)
    }
  })

  it('recognises iOS devices including desktop-class iPads', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone)', 'iPhone', 5)).toBe(true)
    expect(isIosDevice('Mozilla/5.0 (Macintosh)', 'MacIntel', 5)).toBe(true)
    expect(isIosDevice('Mozilla/5.0 (Macintosh)', 'MacIntel', 0)).toBe(false)
  })

  it('does not offer installation to an app already running standalone', () => {
    expect(isStandaloneDisplay(true, undefined)).toBe(true)
    expect(isStandaloneDisplay(false, true)).toBe(true)
    expect(isStandaloneDisplay(false, false)).toBe(false)
  })
})
