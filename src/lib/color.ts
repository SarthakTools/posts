// Small helpers for sampling an image's dominant color and turning it into
// a background-ambient tint (used for the page glow + the post card accent).

export type RGB = { r: number; g: number; b: number }

// Samples a downscaled version of the image on an offscreen canvas and
// averages the non-transparent pixels. Resolves null if the image can't be
// read (e.g. blocked by CORS) or has no visible pixels.
export function extractAverageColor(url: string): Promise<RGB | null> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = url

    img.onload = () => {
      try {
        const size = 16
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)

        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 100) continue // skip near-transparent pixels
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
        if (count === 0) return resolve(null)

        resolve({
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count),
        })
      } catch {
        // Canvas read blocked (CORS) — just skip, no tint.
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
  })
}

export function rgbToString(rgb: RGB) {
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`
}

export function parseRgbString(s: string): RGB | null {
  const parts = s.split(',').map((n) => parseInt(n.trim(), 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
  return { r: parts[0], g: parts[1], b: parts[2] }
}

// Perceived brightness, roughly 0 (black) to 255 (white)
function luminance({ r, g, b }: RGB) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// Turns a sampled image color into a page-background ambient tint.
// - Near-white/very light colors would just wash the background out, so
//   those return null (caller should fall back to the default palette).
// - Everything else gets darkened so it reads as an ambient glow, not a
//   bright color panel.
const LIGHT_CUTOFF = 210
const DARKEN_FACTOR = 0.55

export function toAmbientTint(rgb: RGB | null): RGB | null {
  if (!rgb) return null
  if (luminance(rgb) > LIGHT_CUTOFF) return null

  return {
    r: Math.round(rgb.r * DARKEN_FACTOR),
    g: Math.round(rgb.g * DARKEN_FACTOR),
    b: Math.round(rgb.b * DARKEN_FACTOR),
  }
}
