import React from 'react'
type Variant = 'primary' | 'outline' | 'ghost'
type Size = 'md' | 'lg'

export default function Button({
  children, className = '', variant = 'primary', size = 'lg', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base = 'btn ' + (size === 'lg' ? 'w-full' : '')
  const look =
    variant === 'primary' ? 'btn-primary' :
    variant === 'outline' ? 'btn-outline' : 'btn-ghost'
  return (
    <button className={`${base} ${look} ${className}`} {...props}>
      {children}
    </button>
  )
}
