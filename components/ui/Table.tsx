import { CSSProperties, ReactNode } from 'react'
import { Colors } from '@/styles/theme'

interface TableProps {
  children: ReactNode
  colors: Colors
  style?: CSSProperties
}

export function Table({ children, colors, style }: TableProps) {
  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    ...style,
  }

  return <table style={tableStyle}>{children}</table>
}

interface ThProps {
  children: ReactNode
  colors: Colors
  style?: CSSProperties
}

export function Th({ children, colors, style }: ThProps) {
  const thStyle: CSSProperties = {
    textAlign: 'left',
    padding: '10px',
    borderBottom: `2px solid ${colors.borderLight}`,
    color: colors.textMuted,
    fontSize: '12px',
    textTransform: 'uppercase',
    ...style,
  }

  return <th style={thStyle}>{children}</th>
}

interface TdProps {
  children: ReactNode
  colors: Colors
  style?: CSSProperties
}

export function Td({ children, colors, style }: TdProps) {
  const tdStyle: CSSProperties = {
    padding: '10px',
    borderBottom: `1px solid ${colors.borderLight}`,
    ...style,
  }

  return <td style={tdStyle}>{children}</td>
}
