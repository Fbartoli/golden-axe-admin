import { CSSProperties, ButtonHTMLAttributes } from 'react'
import { palette } from '@/styles/theme'

type ButtonVariant = 'primary' | 'danger' | 'success' | 'secondary' | 'warning'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: { background: palette.primary, color: '#fff' },
  danger: { background: palette.danger, color: '#fff' },
  success: { background: palette.success, color: '#fff' },
  secondary: { background: palette.secondary, color: '#fff' },
  warning: { background: palette.warning, color: '#000' },
}

const sizeStyles: Record<'sm' | 'md' | 'lg', CSSProperties> = {
  sm: { padding: '4px 8px', fontSize: '12px' },
  md: { padding: '8px 16px', fontSize: '14px' },
  lg: { padding: '12px 24px', fontSize: '16px' },
}

export function Button({
  variant = 'primary',
  size = 'md',
  style,
  children,
  ...props
}: ButtonProps) {
  const baseStyle: CSSProperties = {
    border: 'none',
    borderRadius: '4px',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.2s',
    opacity: props.disabled ? 0.6 : 1,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  }

  return (
    <button style={baseStyle} {...props}>
      {children}
    </button>
  )
}
