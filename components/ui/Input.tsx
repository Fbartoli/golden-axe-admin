import { CSSProperties, InputHTMLAttributes } from 'react'
import { Colors } from '@/styles/theme'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  colors: Colors
  variant?: 'default' | 'inline' | 'search'
}

export function Input({ colors, variant = 'default', style, ...props }: InputProps) {
  const baseStyle: CSSProperties = {
    padding: '8px',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    background: colors.inputBg,
    color: colors.text,
    ...style,
  }

  const variantStyles: Record<string, CSSProperties> = {
    default: {
      marginRight: '10px',
      marginBottom: '10px',
    },
    inline: {
      width: '70px',
      padding: '4px 6px',
      textAlign: 'center',
    },
    search: {
      padding: '8px 12px',
      width: '200px',
      fontSize: '14px',
    },
  }

  return <input style={{ ...baseStyle, ...variantStyles[variant] }} {...props} />
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  colors: Colors
}

export function TextArea({ colors, style, ...props }: TextAreaProps) {
  const textareaStyle: CSSProperties = {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    resize: 'vertical',
    background: colors.inputBg,
    color: colors.text,
    ...style,
  }

  return <textarea style={textareaStyle} {...props} />
}
