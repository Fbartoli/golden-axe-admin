import { CSSProperties, ReactNode } from 'react'
import { Colors } from '@/styles/theme'

interface CardProps {
  children: ReactNode
  colors: Colors
  darkMode: boolean
  style?: CSSProperties
  title?: string
  action?: ReactNode
}

export function Card({ children, colors, darkMode, style, title, action }: CardProps) {
  const cardStyle: CSSProperties = {
    background: colors.cardBg,
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: darkMode
      ? '0 2px 8px rgba(0,0,0,0.3)'
      : '0 1px 3px rgba(0,0,0,0.1)',
    border: `1px solid ${colors.border}`,
    ...style,
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  }

  return (
    <div style={cardStyle}>
      {(title || action) && (
        <div style={headerStyle}>
          {title && <h3 style={{ margin: 0 }}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
