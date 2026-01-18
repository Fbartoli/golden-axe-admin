import { describe, it, expect } from 'bun:test'
import { cn } from '@/lib/utils'

describe('cn (class name utility)', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const isDisabled = false
    const result = cn('base', isActive && 'active', isDisabled && 'disabled')
    expect(result).toBe('base active')
  })

  it('merges tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('handles undefined and null values', () => {
    const result = cn('foo', undefined, null, 'bar')
    expect(result).toBe('foo bar')
  })

  it('handles empty strings', () => {
    const result = cn('foo', '', 'bar')
    expect(result).toBe('foo bar')
  })

  it('handles arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz')
    expect(result).toBe('foo bar baz')
  })

  it('handles object syntax', () => {
    const result = cn({ active: true, disabled: false, 'text-red': true })
    expect(result).toBe('active text-red')
  })

  it('handles complex tailwind merge scenarios', () => {
    const result = cn(
      'text-sm text-gray-500',
      'text-lg',
      'hover:text-blue-500'
    )
    expect(result).toBe('text-gray-500 text-lg hover:text-blue-500')
  })

  it('handles conflicting padding classes', () => {
    const result = cn('p-4', 'px-2')
    expect(result).toBe('p-4 px-2')
  })

  it('handles conflicting margin classes', () => {
    const result = cn('m-4', 'mt-2')
    expect(result).toBe('m-4 mt-2')
  })

  it('returns empty string for no arguments', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('returns empty string for all falsy values', () => {
    const result = cn(false, null, undefined, '')
    expect(result).toBe('')
  })
})
