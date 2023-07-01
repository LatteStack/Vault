import {
  normalizeText,
  textToBuffer,
  bufferToText,
  bufferToBase64Url,
  base64UrlToBuffer,
  objectToBuffer,
  bufferToObject,
  objectToBase64Url,
  base64UrlToObject,
  uint32ToBuffer,
  bufferToUint32
} from './encoder'
import { Buffer } from 'buffer'
import { isEqual } from 'lodash'

describe('encoder', () => {
  describe('normalizeText', () => {
    it('should work correctly', () => {
      expect(normalizeText(' text ')).toBe('text')
    })
  })

  describe('textToBuffer', () => {
    it('should work correctly', () => {
      const text = 'text'
      expect(textToBuffer(text)).toBeInstanceOf(Uint8Array)
      expect(isEqual(
        textToBuffer(text),
        new Uint8Array(Buffer.from(text))
      )).toBeTruthy()
    })
  })

  describe('bufferToText', () => {
    it('should work correctly', () => {
      const text = 'text'
      const buffer = new Uint8Array(Buffer.from(text))
      expect(bufferToText(buffer)).toBe(text)
      expect(bufferToText(buffer.buffer)).toBe(text)
    })
  })

  describe('bufferToBase64Url', () => {
    it('should work correctly', () => {
      const text = 'text'
      const buffer = new Uint8Array(Buffer.from(text))
      expect(bufferToBase64Url(buffer)).toBe(Buffer.from(buffer).toString('base64url'))
    })
  })

  describe('base64UrlToBuffer', () => {
    it('should work correctly', () => {
      const text = 'text'
      const buffer = new Uint8Array(Buffer.from(text))
      expect(uint32ToBuffer(4294967295)).toBeInstanceOf(Uint8Array)
      expect(isEqual(
        base64UrlToBuffer(Buffer.from(buffer).toString('base64url')),
        buffer
      )).toBeTruthy()
    })
  })

  describe('objectToBuffer', () => {
    it('should work correctly', () => {
      const obj = { x: 'y' }
      expect(objectToBuffer(obj)).toBeInstanceOf(Uint8Array)
      expect(isEqual(
        objectToBuffer(obj),
        new Uint8Array(Buffer.from(JSON.stringify(obj), 'utf-8'))
      ))
    })
  })

  describe('bufferToObject', () => {
    it('should work correctly', () => {
      const obj = { x: 'y' }

      expect(bufferToObject(
        new Uint8Array(Buffer.from(JSON.stringify(obj), 'utf-8'))
      )).toEqual(obj)
    })
  })

  describe('objectToBase64Url', () => {
    it('should work correctly', () => {
      const obj = { x: 'y' }

      expect(objectToBase64Url(obj)).toBe(
        Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64url')
      )
    })
  })

  describe('base64UrlToObject', () => {
    it('should work correctly', () => {
      const obj = { x: 'y' }
      const base64 = Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64url')

      expect(base64UrlToObject(base64)).toEqual(obj)
    })
  })

  describe('uint32ToBuffer', () => {
    it('should work correctly', () => {
      expect(uint32ToBuffer(4294967295)).toBeInstanceOf(Uint8Array)
      expect(isEqual(
        uint32ToBuffer(4294967295),
        new Uint8Array([255, 255, 255, 255])
      )).toBeTruthy()
    })
  })

  describe('bufferToUint32', () => {
    it('should work correctly', () => {
      const uint8Array = new Uint8Array([255, 255, 255, 255])

      expect(bufferToUint32(uint8Array)).toBe(4294967295)
      expect(bufferToUint32(uint8Array.buffer)).toBe(4294967295)
    })
  })
})
