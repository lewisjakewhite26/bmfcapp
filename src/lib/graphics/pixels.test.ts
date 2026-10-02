import { describe, expect, it } from 'vitest'
import { hasTransparency, opaqueBounds, whitenLogoPixels } from './pixels'
import { fitFontSize, wrapLines } from './text'
import { fileNameKey, nameKey } from '../graphicsApi'

/** w×h image filled with `bg`, with a `fg` square at (x, y, size). */
function image(w: number, h: number, bg: number[], fg?: { x: number; y: number; size: number; rgba: number[] }) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inFg = fg && x >= fg.x && x < fg.x + fg.size && y >= fg.y && y < fg.y + fg.size
      data.set(inFg ? fg!.rgba : bg, (y * w + x) * 4)
    }
  }
  return data
}

const at = (data: Uint8ClampedArray, w: number, x: number, y: number) => [...data.slice((y * w + x) * 4, (y * w + x) * 4 + 4)]

describe('logo pixels', () => {
  it('turns a dark logo on white into a white mark on transparent', () => {
    const data = image(20, 20, [255, 255, 255, 255], { x: 5, y: 5, size: 10, rgba: [20, 30, 40, 255] })
    whitenLogoPixels(data, 20, 20)
    expect(at(data, 20, 0, 0)).toEqual([255, 255, 255, 0])
    expect(at(data, 20, 10, 10)).toEqual([255, 255, 255, 255])
  })

  it('handles a white logo in a black box', () => {
    const data = image(20, 20, [0, 0, 0, 255], { x: 5, y: 5, size: 10, rgba: [250, 250, 250, 255] })
    whitenLogoPixels(data, 20, 20)
    expect(at(data, 20, 1, 1)[3]).toBe(0)
    expect(at(data, 20, 10, 10)[3]).toBe(255)
  })

  it('keeps the shape of logos that are already transparent', () => {
    const data = image(20, 20, [0, 0, 0, 0], { x: 5, y: 5, size: 10, rgba: [200, 0, 0, 180] })
    whitenLogoPixels(data, 20, 20)
    expect(at(data, 20, 10, 10)).toEqual([255, 255, 255, 180])
    expect(at(data, 20, 0, 0)[3]).toBe(0)
  })

  it('finds the bounds of visible pixels', () => {
    const data = image(20, 20, [0, 0, 0, 0], { x: 3, y: 4, size: 5, rgba: [1, 1, 1, 255] })
    expect(opaqueBounds(data, 20, 20)).toEqual({ x: 3, y: 4, width: 5, height: 5 })
    expect(opaqueBounds(image(4, 4, [0, 0, 0, 0]), 4, 4)).toBeNull()
  })

  it('spots photos that are already cut out', () => {
    expect(hasTransparency(image(10, 10, [0, 0, 0, 0], { x: 0, y: 0, size: 5, rgba: [1, 1, 1, 255] }))).toBe(true)
    expect(hasTransparency(image(10, 10, [9, 9, 9, 255]))).toBe(false)
  })
})

describe('text fitting', () => {
  const measure = (size: number) => size * 10

  it('steps the size down until it fits', () => {
    expect(fitFontSize(measure, 800, 84, 40)).toBe(80)
    expect(fitFontSize(measure, 100, 84, 40)).toBe(40)
  })

  it('wraps into a limited number of lines', () => {
    const byChar = (line: string) => line.length
    expect(wrapLines(['Bishop', 'Middleham', 'Park'], byChar, 16, 2)).toEqual(['Bishop Middleham', 'Park'])
    expect(wrapLines(['Swinburne', 'Maddison', 'Second', 'Division'], byChar, 9, 2)).toBeNull()
  })
})

describe('bulk upload matching', () => {
  it('matches file names to player and team names', () => {
    expect(fileNameKey('jack-marley-2.jpg')).toBe(nameKey('Jack Marley'))
    expect(fileNameKey('Ferryhill_Ivorson.PNG')).toBe(nameKey('Ferryhill Ivorson'))
    expect(fileNameKey('obrien.png')).toBe(nameKey("O'Brien"))
    expect(nameKey('Logan Ohara')).toBe(nameKey("Logan O’Hara"))
  })
})
