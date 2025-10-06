import React from 'react'

type Variant = 'primary' | 'outline' | 'ghost'

export default function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  // Use theme-aware .btn classes from index.css
  const variantClass =
    variant === 'primary' ? 'btn-primary' :
    variant === 'outline' ? 'btn-outline' :
    'btn-ghost'

  const classes = ['btn', variantClass, className].filter(Boolean).join(' ')
  return <button className={classes} {...props} />
}
