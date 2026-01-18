import { describe, it, expect } from 'vitest'
import {
  extractModelName,
  extractContextPercent,
  getContextColor,
  extractCost,
  formatCost,
  formatContextWithColor,
  buildStatusLine,
  parseInput,
  generateStatusLine,
  processStatusLine,
  ANSI_CODES,
  type StatusLineInput,
  type StatusLineOutput,
  type AnsiColor,
} from '@/lib/statusline'

describe('statusline module', () => {
  describe('extractModelName', () => {
    it('returns model display_name when present', () => {
      const input: StatusLineInput = { model: { display_name: 'Opus' } }
      expect(extractModelName(input)).toBe('Opus')
    })

    it('returns Sonnet model name', () => {
      const input: StatusLineInput = { model: { display_name: 'Sonnet' } }
      expect(extractModelName(input)).toBe('Sonnet')
    })

    it('returns Haiku model name', () => {
      const input: StatusLineInput = { model: { display_name: 'Haiku' } }
      expect(extractModelName(input)).toBe('Haiku')
    })

    it('returns default Claude when model is undefined', () => {
      const input: StatusLineInput = {}
      expect(extractModelName(input)).toBe('Claude')
    })

    it('returns default Claude when model is null', () => {
      const input: StatusLineInput = { model: null }
      expect(extractModelName(input)).toBe('Claude')
    })

    it('returns default Claude when display_name is undefined', () => {
      const input: StatusLineInput = { model: {} }
      expect(extractModelName(input)).toBe('Claude')
    })

    it('returns default Claude when display_name is null', () => {
      const input: StatusLineInput = { model: { display_name: null } }
      expect(extractModelName(input)).toBe('Claude')
    })

    it('returns default Claude when display_name is empty string', () => {
      const input: StatusLineInput = { model: { display_name: '' } }
      expect(extractModelName(input)).toBe('Claude')
    })

    it('handles model name with spaces', () => {
      const input: StatusLineInput = { model: { display_name: 'Opus 4.5' } }
      expect(extractModelName(input)).toBe('Opus 4.5')
    })

    it('handles long model name', () => {
      const input: StatusLineInput = { model: { display_name: 'Claude-3.5-Opus-Extended' } }
      expect(extractModelName(input)).toBe('Claude-3.5-Opus-Extended')
    })
  })

  describe('extractContextPercent', () => {
    it('returns integer percentage', () => {
      const input: StatusLineInput = { context_window: { used_percentage: 42 } }
      expect(extractContextPercent(input)).toBe(42)
    })

    it('rounds decimal down when < 0.5', () => {
      const input: StatusLineInput = { context_window: { used_percentage: 42.4 } }
      expect(extractContextPercent(input)).toBe(42)
    })

    it('rounds decimal up when >= 0.5', () => {
      const input: StatusLineInput = { context_window: { used_percentage: 42.6 } }
      expect(extractContextPercent(input)).toBe(43)
    })

    it('rounds 0.5 up', () => {
      const input: StatusLineInput = { context_window: { used_percentage: 42.5 } }
      expect(extractContextPercent(input)).toBe(43)
    })

    it('handles 0 percentage', () => {
      const input: StatusLineInput = { context_window: { used_percentage: 0 } }
      expect(extractContextPercent(input)).toBe(0)
    })

    it('handles 100 percentage', () => {
      const input: StatusLineInput = { context_window: { used_percentage: 100 } }
      expect(extractContextPercent(input)).toBe(100)
    })

    it('returns default 0 when context_window is undefined', () => {
      const input: StatusLineInput = {}
      expect(extractContextPercent(input)).toBe(0)
    })

    it('returns default 0 when context_window is null', () => {
      const input: StatusLineInput = { context_window: null }
      expect(extractContextPercent(input)).toBe(0)
    })

    it('returns default 0 when used_percentage is undefined', () => {
      const input: StatusLineInput = { context_window: {} }
      expect(extractContextPercent(input)).toBe(0)
    })

    it('returns default 0 when used_percentage is null', () => {
      const input: StatusLineInput = { context_window: { used_percentage: null } }
      expect(extractContextPercent(input)).toBe(0)
    })

    it('handles large percentage values', () => {
      const input: StatusLineInput = { context_window: { used_percentage: 150 } }
      expect(extractContextPercent(input)).toBe(150)
    })

    it('handles negative percentage', () => {
      const input: StatusLineInput = { context_window: { used_percentage: -5 } }
      expect(extractContextPercent(input)).toBe(-5)
    })
  })

  describe('getContextColor', () => {
    it('returns green for 0%', () => {
      expect(getContextColor(0)).toBe('green')
    })

    it('returns green for 25%', () => {
      expect(getContextColor(25)).toBe('green')
    })

    it('returns green for 49%', () => {
      expect(getContextColor(49)).toBe('green')
    })

    it('returns yellow for 50%', () => {
      expect(getContextColor(50)).toBe('yellow')
    })

    it('returns yellow for 65%', () => {
      expect(getContextColor(65)).toBe('yellow')
    })

    it('returns yellow for 79%', () => {
      expect(getContextColor(79)).toBe('yellow')
    })

    it('returns red for 80%', () => {
      expect(getContextColor(80)).toBe('red')
    })

    it('returns red for 95%', () => {
      expect(getContextColor(95)).toBe('red')
    })

    it('returns red for 100%', () => {
      expect(getContextColor(100)).toBe('red')
    })

    it('returns green for negative values', () => {
      expect(getContextColor(-10)).toBe('green')
    })

    it('returns red for values over 100', () => {
      expect(getContextColor(150)).toBe('red')
    })
  })

  describe('extractCost', () => {
    it('returns cost when present', () => {
      const input: StatusLineInput = { cost: { total_cost_usd: 0.15 } }
      expect(extractCost(input)).toBe(0.15)
    })

    it('returns 0 cost', () => {
      const input: StatusLineInput = { cost: { total_cost_usd: 0 } }
      expect(extractCost(input)).toBe(0)
    })

    it('returns large cost', () => {
      const input: StatusLineInput = { cost: { total_cost_usd: 12.50 } }
      expect(extractCost(input)).toBe(12.50)
    })

    it('returns default 0 when cost is undefined', () => {
      const input: StatusLineInput = {}
      expect(extractCost(input)).toBe(0)
    })

    it('returns default 0 when cost is null', () => {
      const input: StatusLineInput = { cost: null }
      expect(extractCost(input)).toBe(0)
    })

    it('returns default 0 when total_cost_usd is undefined', () => {
      const input: StatusLineInput = { cost: {} }
      expect(extractCost(input)).toBe(0)
    })

    it('returns default 0 when total_cost_usd is null', () => {
      const input: StatusLineInput = { cost: { total_cost_usd: null } }
      expect(extractCost(input)).toBe(0)
    })

    it('handles very small cost', () => {
      const input: StatusLineInput = { cost: { total_cost_usd: 0.001 } }
      expect(extractCost(input)).toBe(0.001)
    })

    it('handles very large cost', () => {
      const input: StatusLineInput = { cost: { total_cost_usd: 999.99 } }
      expect(extractCost(input)).toBe(999.99)
    })
  })

  describe('formatCost', () => {
    it('formats cost with two decimal places', () => {
      expect(formatCost(0.15)).toBe('$0.15')
    })

    it('formats zero cost', () => {
      expect(formatCost(0)).toBe('$0.00')
    })

    it('formats large cost', () => {
      expect(formatCost(12.50)).toBe('$12.50')
    })

    it('rounds cost up', () => {
      expect(formatCost(0.156)).toBe('$0.16')
    })

    it('rounds cost down', () => {
      expect(formatCost(0.154)).toBe('$0.15')
    })

    it('formats single decimal digit', () => {
      expect(formatCost(1.5)).toBe('$1.50')
    })

    it('formats integer cost', () => {
      expect(formatCost(5)).toBe('$5.00')
    })

    it('formats very small cost', () => {
      expect(formatCost(0.001)).toBe('$0.00')
    })

    it('formats very large cost', () => {
      expect(formatCost(999.99)).toBe('$999.99')
    })

    it('formats cost with many decimals', () => {
      expect(formatCost(1.23456789)).toBe('$1.23')
    })
  })

  describe('formatContextWithColor', () => {
    it('formats with green color', () => {
      const result = formatContextWithColor(25, 'green')
      expect(result).toBe(`${ANSI_CODES.green}25%${ANSI_CODES.reset}`)
    })

    it('formats with yellow color', () => {
      const result = formatContextWithColor(65, 'yellow')
      expect(result).toBe(`${ANSI_CODES.yellow}65%${ANSI_CODES.reset}`)
    })

    it('formats with red color', () => {
      const result = formatContextWithColor(90, 'red')
      expect(result).toBe(`${ANSI_CODES.red}90%${ANSI_CODES.reset}`)
    })

    it('includes ANSI reset code', () => {
      const result = formatContextWithColor(50, 'yellow')
      expect(result).toContain(ANSI_CODES.reset)
    })

    it('handles 0%', () => {
      const result = formatContextWithColor(0, 'green')
      expect(result).toContain('0%')
    })

    it('handles 100%', () => {
      const result = formatContextWithColor(100, 'red')
      expect(result).toContain('100%')
    })
  })

  describe('buildStatusLine', () => {
    it('builds complete status line', () => {
      const result = buildStatusLine('Opus', 42, 'green', '$0.15', 'main')
      expect(result).toContain('[Opus]')
      expect(result).toContain('Ctx:')
      expect(result).toContain('42%')
      expect(result).toContain('$0.15')
      expect(result).toContain('main')
    })

    it('has correct format structure', () => {
      const result = buildStatusLine('Opus', 42, 'green', '$0.15', 'main')
      // Strip ANSI codes for format check
      const stripped = result.replace(/\x1b\[[0-9;]*m/g, '')
      expect(stripped).toMatch(/^\[.+\] Ctx: \d+% \| \$.+ \| .+$/)
    })

    it('includes pipe separators', () => {
      const result = buildStatusLine('Opus', 42, 'green', '$0.15', 'main')
      const pipeCount = (result.match(/\|/g) || []).length
      expect(pipeCount).toBe(2)
    })

    it('starts with model name in brackets', () => {
      const result = buildStatusLine('Sonnet', 50, 'yellow', '$0.10', 'develop')
      expect(result).toMatch(/^\[Sonnet\]/)
    })

    it('handles model name with spaces', () => {
      const result = buildStatusLine('Opus 4.5', 25, 'green', '$0.05', 'main')
      expect(result).toContain('[Opus 4.5]')
    })

    it('handles no branch', () => {
      const result = buildStatusLine('Claude', 0, 'green', '$0.00', 'no branch')
      expect(result).toContain('no branch')
    })
  })

  describe('parseInput', () => {
    it('parses valid JSON', () => {
      const json = '{"model":{"display_name":"Opus"}}'
      const result = parseInput(json)
      expect(result.model?.display_name).toBe('Opus')
    })

    it('parses complete input', () => {
      const json = '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":42},"cost":{"total_cost_usd":0.15}}'
      const result = parseInput(json)
      expect(result.model?.display_name).toBe('Opus')
      expect(result.context_window?.used_percentage).toBe(42)
      expect(result.cost?.total_cost_usd).toBe(0.15)
    })

    it('returns empty object for invalid JSON', () => {
      const json = 'not valid json'
      const result = parseInput(json)
      expect(result).toEqual({})
    })

    it('returns empty object for empty string', () => {
      const json = ''
      const result = parseInput(json)
      expect(result).toEqual({})
    })

    it('parses empty JSON object', () => {
      const json = '{}'
      const result = parseInput(json)
      expect(result).toEqual({})
    })

    it('handles null values in JSON', () => {
      const json = '{"model":null,"context_window":null,"cost":null}'
      const result = parseInput(json)
      expect(result.model).toBeNull()
      expect(result.context_window).toBeNull()
      expect(result.cost).toBeNull()
    })
  })

  describe('generateStatusLine', () => {
    it('generates complete output', () => {
      const input: StatusLineInput = {
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42 },
        cost: { total_cost_usd: 0.15 },
      }
      const result = generateStatusLine(input, 'main')

      expect(result.modelName).toBe('Opus')
      expect(result.contextPercent).toBe(42)
      expect(result.contextColor).toBe('green')
      expect(result.costFormatted).toBe('$0.15')
      expect(result.gitBranch).toBe('main')
      expect(result.formatted).toContain('[Opus]')
    })

    it('uses default git branch', () => {
      const input: StatusLineInput = {}
      const result = generateStatusLine(input)
      expect(result.gitBranch).toBe('no branch')
    })

    it('handles empty input', () => {
      const input: StatusLineInput = {}
      const result = generateStatusLine(input, 'main')

      expect(result.modelName).toBe('Claude')
      expect(result.contextPercent).toBe(0)
      expect(result.contextColor).toBe('green')
      expect(result.costFormatted).toBe('$0.00')
    })

    it('applies yellow color for 50-79%', () => {
      const input: StatusLineInput = { context_window: { used_percentage: 65 } }
      const result = generateStatusLine(input, 'main')
      expect(result.contextColor).toBe('yellow')
    })

    it('applies red color for 80%+', () => {
      const input: StatusLineInput = { context_window: { used_percentage: 90 } }
      const result = generateStatusLine(input, 'main')
      expect(result.contextColor).toBe('red')
    })

    it('returns properly typed output', () => {
      const input: StatusLineInput = {
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42 },
        cost: { total_cost_usd: 0.15 },
      }
      const result: StatusLineOutput = generateStatusLine(input, 'main')

      expect(typeof result.modelName).toBe('string')
      expect(typeof result.contextPercent).toBe('number')
      expect(['green', 'yellow', 'red']).toContain(result.contextColor)
      expect(typeof result.costFormatted).toBe('string')
      expect(typeof result.gitBranch).toBe('string')
      expect(typeof result.formatted).toBe('string')
    })
  })

  describe('processStatusLine', () => {
    it('processes valid JSON input', () => {
      const json = '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":42},"cost":{"total_cost_usd":0.15}}'
      const result = processStatusLine(json, 'main')

      expect(result).toContain('[Opus]')
      expect(result).toContain('42%')
      expect(result).toContain('$0.15')
      expect(result).toContain('main')
    })

    it('handles invalid JSON', () => {
      const json = 'invalid'
      const result = processStatusLine(json, 'main')

      expect(result).toContain('[Claude]')
      expect(result).toContain('0%')
      expect(result).toContain('$0.00')
    })

    it('handles empty JSON object', () => {
      const json = '{}'
      const result = processStatusLine(json, 'main')

      expect(result).toContain('[Claude]')
      expect(result).toContain('0%')
      expect(result).toContain('$0.00')
    })

    it('uses default branch when not provided', () => {
      const json = '{}'
      const result = processStatusLine(json)
      expect(result).toContain('no branch')
    })

    it('produces single line output', () => {
      const json = '{"model":{"display_name":"Opus"}}'
      const result = processStatusLine(json, 'main')
      const lineCount = result.split('\n').length
      expect(lineCount).toBe(1)
    })
  })

  describe('ANSI_CODES', () => {
    it('has green code', () => {
      expect(ANSI_CODES.green).toBe('\x1b[32m')
    })

    it('has yellow code', () => {
      expect(ANSI_CODES.yellow).toBe('\x1b[33m')
    })

    it('has red code', () => {
      expect(ANSI_CODES.red).toBe('\x1b[31m')
    })

    it('has reset code', () => {
      expect(ANSI_CODES.reset).toBe('\x1b[0m')
    })
  })
})
