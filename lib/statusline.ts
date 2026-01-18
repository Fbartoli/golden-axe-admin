/**
 * Claude Code Status Line Module
 * Generates a formatted status line showing context usage, cost, and git branch
 */

export interface StatusLineModel {
  display_name?: string | null
}

export interface StatusLineContextWindow {
  used_percentage?: number | null
}

export interface StatusLineCost {
  total_cost_usd?: number | null
}

export interface StatusLineInput {
  model?: StatusLineModel | null
  context_window?: StatusLineContextWindow | null
  cost?: StatusLineCost | null
}

export interface StatusLineOutput {
  modelName: string
  contextPercent: number
  contextColor: AnsiColor
  costFormatted: string
  gitBranch: string
  formatted: string
}

export type AnsiColor = 'green' | 'yellow' | 'red'

export const ANSI_CODES: Record<AnsiColor | 'reset', string> = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
}

const DEFAULT_MODEL_NAME = 'Claude'
const DEFAULT_CONTEXT_PERCENT = 0
const DEFAULT_COST = 0
const DEFAULT_BRANCH = 'no branch'

/**
 * Extract model name from input, defaulting to 'Claude'
 */
export function extractModelName(input: StatusLineInput): string {
  if (!input.model) {
    return DEFAULT_MODEL_NAME
  }
  if (!input.model.display_name) {
    return DEFAULT_MODEL_NAME
  }
  return input.model.display_name
}

/**
 * Extract and round context percentage from input, defaulting to 0
 */
export function extractContextPercent(input: StatusLineInput): number {
  if (!input.context_window) {
    return DEFAULT_CONTEXT_PERCENT
  }
  const percent = input.context_window.used_percentage
  if (percent === null || percent === undefined) {
    return DEFAULT_CONTEXT_PERCENT
  }
  return Math.round(percent)
}

/**
 * Determine color based on context percentage
 * Green: < 50%
 * Yellow: 50-79%
 * Red: >= 80%
 */
export function getContextColor(percent: number): AnsiColor {
  if (percent < 50) {
    return 'green'
  }
  if (percent < 80) {
    return 'yellow'
  }
  return 'red'
}

/**
 * Extract and format cost from input, defaulting to '0.00'
 */
export function extractCost(input: StatusLineInput): number {
  if (!input.cost) {
    return DEFAULT_COST
  }
  const cost = input.cost.total_cost_usd
  if (cost === null || cost === undefined) {
    return DEFAULT_COST
  }
  return cost
}

/**
 * Format cost to 2 decimal places with dollar sign
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`
}

/**
 * Format context percentage with ANSI color codes
 */
export function formatContextWithColor(percent: number, color: AnsiColor): string {
  return `${ANSI_CODES[color]}${percent}%${ANSI_CODES.reset}`
}

/**
 * Build the complete status line string
 */
export function buildStatusLine(
  modelName: string,
  contextPercent: number,
  contextColor: AnsiColor,
  costFormatted: string,
  gitBranch: string
): string {
  const coloredContext = formatContextWithColor(contextPercent, contextColor)
  return `[${modelName}] Ctx: ${coloredContext} | ${costFormatted} | ${gitBranch}`
}

/**
 * Parse JSON input string to StatusLineInput
 */
export function parseInput(jsonString: string): StatusLineInput {
  try {
    const parsed = JSON.parse(jsonString) as StatusLineInput
    return parsed
  } catch {
    return {}
  }
}

/**
 * Generate complete status line output from input
 */
export function generateStatusLine(input: StatusLineInput, gitBranch: string = DEFAULT_BRANCH): StatusLineOutput {
  const modelName = extractModelName(input)
  const contextPercent = extractContextPercent(input)
  const contextColor = getContextColor(contextPercent)
  const cost = extractCost(input)
  const costFormatted = formatCost(cost)

  const formatted = buildStatusLine(modelName, contextPercent, contextColor, costFormatted, gitBranch)

  return {
    modelName,
    contextPercent,
    contextColor,
    costFormatted,
    gitBranch,
    formatted,
  }
}

/**
 * Main entry point - parse JSON and generate status line
 */
export function processStatusLine(jsonString: string, gitBranch: string = DEFAULT_BRANCH): string {
  const input = parseInput(jsonString)
  const output = generateStatusLine(input, gitBranch)
  return output.formatted
}
