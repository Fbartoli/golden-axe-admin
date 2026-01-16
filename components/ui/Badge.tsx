import { CSSProperties, ReactNode } from 'react'
import { palette, severityColors, statusColors } from '@/styles/theme'

type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning' | 'secondary'
type BadgeSeverity = 'info' | 'warning' | 'critical'
type BadgeStatus = 'healthy' | 'unhealthy' | 'unknown'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  severity?: BadgeSeverity
  status?: BadgeStatus
  color?: string
  style?: CSSProperties
  title?: string
}

export function Badge({ children, variant, severity, status, color, style, title }: BadgeProps) {
  let bgColor = color || palette.primary

  if (variant) {
    bgColor = palette[variant]
  } else if (severity) {
    bgColor = severityColors[severity]
  } else if (status) {
    bgColor = statusColors[status]
  }

  const badgeStyle: CSSProperties = {
    padding: '2px 8px',
    background: bgColor,
    color: bgColor === palette.warning ? '#000' : '#fff',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block',
    ...style,
  }

  return <span style={badgeStyle} title={title}>{children}</span>
}
