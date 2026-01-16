import { CSSProperties } from 'react'

// Color palette
export const palette = {
  primary: '#007bff',
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  secondary: '#6c757d',
  white: '#fff',
  black: '#000',
}

// Theme colors based on dark mode
export function getColors(darkMode: boolean) {
  return {
    bg: darkMode ? '#1a1a2e' : '#f5f5f5',
    cardBg: darkMode ? '#16213e' : '#fff',
    text: darkMode ? '#e4e4e7' : '#333',
    textMuted: darkMode ? '#9ca3af' : '#666',
    border: darkMode ? '#374151' : '#ddd',
    borderLight: darkMode ? '#2d3748' : '#eee',
    inputBg: darkMode ? '#1f2937' : '#fff',
    statBg: darkMode ? '#1f2937' : '#f8f9fa',
    ...palette,
  }
}

export type Colors = ReturnType<typeof getColors>

// Generate styles based on colors
export function getStyles(colors: Colors, darkMode: boolean) {
  return {
    page: {
      minHeight: '100vh',
      background: colors.bg,
      color: colors.text,
      padding: '20px',
      transition: 'all 0.3s ease',
    } as CSSProperties,

    container: {
      maxWidth: '1200px',
      margin: '0 auto',
    } as CSSProperties,

    header: {
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      gap: '10px',
    } as CSSProperties,

    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    } as CSSProperties,

    tabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '20px',
      flexWrap: 'wrap' as const,
    } as CSSProperties,

    tab: (active: boolean): CSSProperties => ({
      padding: '8px 16px',
      background: active ? colors.primary : colors.cardBg,
      color: active ? '#fff' : colors.text,
      border: `1px solid ${active ? colors.primary : colors.border}`,
      cursor: 'pointer',
      borderRadius: '4px',
      fontSize: '14px',
      transition: 'all 0.2s ease',
    }),

    card: {
      background: colors.cardBg,
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: darkMode
        ? '0 2px 8px rgba(0,0,0,0.3)'
        : '0 1px 3px rgba(0,0,0,0.1)',
      border: `1px solid ${colors.border}`,
    } as CSSProperties,

    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '14px',
    } as CSSProperties,

    th: {
      textAlign: 'left' as const,
      padding: '10px',
      borderBottom: `2px solid ${colors.borderLight}`,
      color: colors.textMuted,
      fontSize: '12px',
      textTransform: 'uppercase' as const,
    } as CSSProperties,

    td: {
      padding: '10px',
      borderBottom: `1px solid ${colors.borderLight}`,
    } as CSSProperties,

    // For numeric table cells - ensures consistent digit alignment
    tdNumeric: {
      padding: '10px',
      borderBottom: `1px solid ${colors.borderLight}`,
      fontVariantNumeric: 'tabular-nums',
      textAlign: 'right' as const,
    } as CSSProperties,

    input: {
      padding: '8px',
      border: `1px solid ${colors.border}`,
      borderRadius: '4px',
      marginRight: '10px',
      marginBottom: '10px',
      background: colors.inputBg,
      color: colors.text,
    } as CSSProperties,

    button: {
      padding: '8px 16px',
      background: colors.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'opacity 0.2s',
    } as CSSProperties,

    deleteBtn: {
      padding: '4px 8px',
      background: colors.danger,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    } as CSSProperties,

    viewBtn: {
      padding: '4px 8px',
      background: colors.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '5px',
    } as CSSProperties,

    toggleBtn: (enabled: boolean): CSSProperties => ({
      padding: '4px 8px',
      background: enabled ? colors.success : colors.secondary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    }),

    badge: (color: string): CSSProperties => ({
      padding: '2px 8px',
      background: color,
      color: '#fff',
      borderRadius: '12px',
      fontSize: '12px',
    }),

    backBtn: {
      padding: '8px 16px',
      background: colors.secondary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginBottom: '15px',
    } as CSSProperties,

    stat: {
      display: 'inline-block',
      marginRight: '20px',
      padding: '10px 15px',
      background: colors.statBg,
      borderRadius: '4px',
    } as CSSProperties,

    inlineInput: {
      width: '70px',
      padding: '4px 6px',
      border: `1px solid ${colors.border}`,
      borderRadius: '4px',
      textAlign: 'center' as const,
      background: colors.inputBg,
      color: colors.text,
    } as CSSProperties,

    searchInput: {
      padding: '8px 12px',
      border: `1px solid ${colors.border}`,
      borderRadius: '4px',
      background: colors.inputBg,
      color: colors.text,
      width: '200px',
      fontSize: '14px',
    } as CSSProperties,

    darkModeBtn: {
      padding: '8px 12px',
      background: darkMode ? colors.warning : colors.secondary,
      color: darkMode ? '#000' : '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
    } as CSSProperties,

    commandPalette: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '100px',
      zIndex: 1000,
    } as CSSProperties,

    commandBox: {
      background: colors.cardBg,
      borderRadius: '8px',
      width: '500px',
      maxWidth: '90vw',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      border: `1px solid ${colors.border}`,
    } as CSSProperties,

    shortcutKey: {
      display: 'inline-block',
      padding: '2px 6px',
      background: colors.statBg,
      borderRadius: '3px',
      fontSize: '11px',
      marginLeft: '8px',
      fontFamily: 'monospace',
    } as CSSProperties,
  }
}

export type Styles = ReturnType<typeof getStyles>

// Severity colors for alerts and status indicators
export const severityColors: Record<string, string> = {
  info: palette.primary,
  warning: palette.warning,
  critical: palette.danger,
  success: palette.success,
}

// Status colors for health indicators
export const statusColors: Record<string, string> = {
  healthy: palette.success,
  unhealthy: palette.danger,
  unknown: palette.secondary,
}
