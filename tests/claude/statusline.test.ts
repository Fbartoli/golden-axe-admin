import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync, exec } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const SCRIPT_PATH = path.resolve(__dirname, '../../.claude/statusline.sh')
const ANSI_GREEN = '\x1b[32m'
const ANSI_YELLOW = '\x1b[33m'
const ANSI_RED = '\x1b[31m'
const ANSI_RESET = '\x1b[0m'

interface StatusLineInput {
  model?: { display_name?: string }
  context_window?: { used_percentage?: number }
  cost?: { total_cost_usd?: number }
}

function runStatusLine(input: StatusLineInput): string {
  const jsonInput = JSON.stringify(input)
  const result = execSync(`echo '${jsonInput}' | bash "${SCRIPT_PATH}"`, {
    encoding: 'utf-8',
    cwd: path.resolve(__dirname, '../..'),
  })
  return result.trim()
}

function runStatusLineRaw(jsonString: string): string {
  const result = execSync(`echo '${jsonString}' | bash "${SCRIPT_PATH}"`, {
    encoding: 'utf-8',
    cwd: path.resolve(__dirname, '../..'),
  })
  return result.trim()
}

describe('Claude Code Statusline Script', () => {
  describe('JSON Parsing', () => {
    it('parses model display name correctly', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('[Opus]')
    })

    it('parses Sonnet model name', () => {
      const output = runStatusLine({
        model: { display_name: 'Sonnet' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.05 },
      })
      expect(output).toContain('[Sonnet]')
    })

    it('parses Haiku model name', () => {
      const output = runStatusLine({
        model: { display_name: 'Haiku' },
        context_window: { used_percentage: 10 },
        cost: { total_cost_usd: 0.01 },
      })
      expect(output).toContain('[Haiku]')
    })

    it('defaults to Claude when model name is missing', () => {
      const output = runStatusLine({
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('[Claude]')
    })

    it('defaults to Claude when model object is null', () => {
      const output = runStatusLineRaw('{"model":null,"context_window":{"used_percentage":25},"cost":{"total_cost_usd":0.10}}')
      expect(output).toContain('[Claude]')
    })
  })

  describe('Context Percentage Extraction', () => {
    it('extracts integer percentage', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('42%')
    })

    it('rounds decimal percentage down', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42.4 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('42%')
    })

    it('rounds decimal percentage up', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42.6 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('43%')
    })

    it('handles 0% context', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 0 },
        cost: { total_cost_usd: 0.00 },
      })
      expect(output).toContain('0%')
    })

    it('handles 100% context', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 100 },
        cost: { total_cost_usd: 1.00 },
      })
      expect(output).toContain('100%')
    })

    it('defaults to 0 when context_window is missing', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('0%')
    })

    it('defaults to 0 when used_percentage is missing', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: {},
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('0%')
    })
  })

  describe('Cost Formatting', () => {
    it('formats cost with two decimal places', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.15 },
      })
      expect(output).toContain('$0.15')
    })

    it('formats zero cost', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0 },
      })
      expect(output).toContain('$0.00')
    })

    it('formats large cost', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 90 },
        cost: { total_cost_usd: 12.50 },
      })
      expect(output).toContain('$12.50')
    })

    it('rounds cost to two decimal places', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.156789 },
      })
      expect(output).toContain('$0.16')
    })

    it('defaults to 0.00 when cost is missing', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
      })
      expect(output).toContain('$0.00')
    })

    it('handles cost with single decimal digit', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 1.5 },
      })
      expect(output).toContain('$1.50')
    })
  })

  describe('Color Coding', () => {
    it('uses green color for context < 50%', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain(ANSI_GREEN)
      expect(output).not.toContain(ANSI_YELLOW)
      expect(output).not.toContain(ANSI_RED)
    })

    it('uses green color for context at 0%', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 0 },
        cost: { total_cost_usd: 0.00 },
      })
      expect(output).toContain(ANSI_GREEN)
    })

    it('uses green color for context at 49%', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 49 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain(ANSI_GREEN)
    })

    it('uses yellow color for context at 50%', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 50 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain(ANSI_YELLOW)
      expect(output).not.toContain(ANSI_GREEN)
      expect(output).not.toContain(ANSI_RED)
    })

    it('uses yellow color for context at 65%', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 65 },
        cost: { total_cost_usd: 0.15 },
      })
      expect(output).toContain(ANSI_YELLOW)
    })

    it('uses yellow color for context at 79%', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 79 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain(ANSI_YELLOW)
    })

    it('uses red color for context at 80%', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 80 },
        cost: { total_cost_usd: 0.50 },
      })
      expect(output).toContain(ANSI_RED)
      expect(output).not.toContain(ANSI_GREEN)
      expect(output).not.toContain(ANSI_YELLOW)
    })

    it('uses red color for context at 95%', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 95 },
        cost: { total_cost_usd: 0.80 },
      })
      expect(output).toContain(ANSI_RED)
    })

    it('uses red color for context at 100%', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 100 },
        cost: { total_cost_usd: 1.00 },
      })
      expect(output).toContain(ANSI_RED)
    })

    it('includes ANSI reset code after percentage', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain(ANSI_RESET)
    })
  })

  describe('Git Branch Detection', () => {
    it('includes git branch when in a git repository', () => {
      // We're running in the admin repo which is a git repo on main branch
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('main')
    })

    it('shows current branch name in output', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.10 },
      })
      // Get actual branch name
      const actualBranch = execSync('git branch --show-current', {
        encoding: 'utf-8',
        cwd: path.resolve(__dirname, '../..'),
      }).trim()
      expect(output).toContain(actualBranch)
    })
  })

  describe('Output Format', () => {
    it('follows expected format structure', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42 },
        cost: { total_cost_usd: 0.15 },
      })
      // Format: [Model] Ctx: <color>X%<reset> | $Y.YY | branch
      // Strip ANSI codes for format check
      const stripped = output.replace(/\x1b\[[0-9;]*m/g, '')
      expect(stripped).toMatch(/^\[.+\] Ctx: \d+% \| \$.+ \| .+$/)
    })

    it('has model name in brackets at start', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42 },
        cost: { total_cost_usd: 0.15 },
      })
      expect(output).toMatch(/^\[Opus\]/)
    })

    it('has Ctx: label before percentage', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42 },
        cost: { total_cost_usd: 0.15 },
      })
      expect(output).toContain('Ctx:')
    })

    it('has pipe separators between sections', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42 },
        cost: { total_cost_usd: 0.15 },
      })
      // Should have at least 2 pipe separators
      const pipeCount = (output.match(/\|/g) || []).length
      expect(pipeCount).toBeGreaterThanOrEqual(2)
    })

    it('has dollar sign before cost', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42 },
        cost: { total_cost_usd: 0.15 },
      })
      expect(output).toMatch(/\$\d+\.\d{2}/)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty JSON object', () => {
      const output = runStatusLineRaw('{}')
      expect(output).toContain('[Claude]')
      expect(output).toContain('0%')
      expect(output).toContain('$0.00')
    })

    it('handles very large percentage values', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 150 },
        cost: { total_cost_usd: 2.00 },
      })
      expect(output).toContain('150%')
    })

    it('handles negative percentage gracefully', () => {
      // Negative percentages shouldn't happen but script should handle them
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: -5 },
        cost: { total_cost_usd: 0.00 },
      })
      // Should still produce output without crashing
      expect(output).toBeTruthy()
    })

    it('handles very long model names', () => {
      const output = runStatusLine({
        model: { display_name: 'Claude-3.5-Opus-Extended' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('[Claude-3.5-Opus-Extended]')
    })

    it('handles model name with spaces', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus 4.5' },
        context_window: { used_percentage: 25 },
        cost: { total_cost_usd: 0.10 },
      })
      expect(output).toContain('[Opus 4.5]')
    })

    it('handles very small cost values', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 5 },
        cost: { total_cost_usd: 0.001 },
      })
      expect(output).toContain('$0.00')
    })

    it('handles very large cost values', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 99 },
        cost: { total_cost_usd: 999.99 },
      })
      expect(output).toContain('$999.99')
    })
  })

  describe('Script Execution', () => {
    it('script file exists', () => {
      expect(existsSync(SCRIPT_PATH)).toBe(true)
    })

    it('script is executable', () => {
      const result = execSync(`test -x "${SCRIPT_PATH}" && echo "yes" || echo "no"`, {
        encoding: 'utf-8',
      })
      expect(result.trim()).toBe('yes')
    })

    it('script starts with shebang', () => {
      const result = execSync(`head -1 "${SCRIPT_PATH}"`, { encoding: 'utf-8' })
      expect(result.trim()).toBe('#!/bin/bash')
    })

    it('produces single line output', () => {
      const output = runStatusLine({
        model: { display_name: 'Opus' },
        context_window: { used_percentage: 42 },
        cost: { total_cost_usd: 0.15 },
      })
      const lineCount = output.split('\n').length
      expect(lineCount).toBe(1)
    })

    it('handles rapid consecutive executions', () => {
      const results: string[] = []
      for (let i = 0; i < 5; i++) {
        results.push(runStatusLine({
          model: { display_name: 'Opus' },
          context_window: { used_percentage: i * 20 },
          cost: { total_cost_usd: i * 0.10 },
        }))
      }
      // All should succeed and have expected format
      results.forEach(output => {
        expect(output).toMatch(/^\[Opus\]/)
      })
    })
  })
})
