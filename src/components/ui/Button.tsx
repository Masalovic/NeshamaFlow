import React from 'react'

type Variant = 'primary' | 'outline' | 'ghost' | 'secondary'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

export default function Button({ variant = 'primary', className, ...props }: Props) {
  const byVariant: Record<Variant, string> = {
    primary: 'btn btn-primary',
    outline: 'btn btn-outline',
    ghost: 'btn btn-ghost',
    secondary: 'btn btn-secondary',
  }
  const classes = [byVariant[variant], className].filter(Boolean).join(' ')
  return <button className={classes} {...props} />
}
