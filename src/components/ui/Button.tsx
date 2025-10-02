import React from 'react'

type Variant = 'primary' | 'outline' | 'ghost'

export default function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    'inline-flex items-center justify-center h-10 px-4 rounded-xl transition ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2'

  const styles: Record<Variant, string> = {
    primary: 'bg-brand-600 text-black hover:text-white hover:bg-brand-700 disabled:opacity-50',
    outline: 'border border-gray-300 hover:bg-gray-50 disabled:opacity-50',
    ghost: 'hover:bg-gray-100 disabled:opacity-50',
  }

  const classes = [base, styles[variant], className].filter(Boolean).join(' ')

  return <button className={classes} {...props} />
}
