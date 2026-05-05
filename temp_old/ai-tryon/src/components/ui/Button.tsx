'use client'
import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#bef264] text-black hover:bg-[#a3e635] shadow-[0_0_20px_rgba(190,242,100,0.2)]',
      secondary: 'bg-white/10 text-white hover:bg-white/20 border border-white/10',
      outline: 'bg-transparent text-white border border-white/20 hover:bg-white/5',
      ghost: 'bg-transparent text-white/70 hover:text-white hover:bg-white/5',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-6 py-2.5 text-sm rounded-xl',
      lg: 'px-8 py-4 text-base rounded-2xl',
      xl: 'px-10 py-5 text-lg rounded-2xl font-bold',
    }

    return (
      <motion.button
        ref={ref as any}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'relative inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium overflow-hidden',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading}
        {...(props as any)}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit">
             <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <span className={cn(isLoading && 'opacity-0')}>{children}</span>
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
