import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'glass';

export interface GlassButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  loading?: boolean;
  children?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-[14px] transition-all duration-150 disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap cursor-pointer select-none';

  const sizeClass =
    size === 'sm'
      ? 'min-h-[44px] px-3.5 py-2 text-[13px]'
      : 'min-h-[48px] px-3.5 sm:px-5 py-3 text-[14px] sm:text-[15px]';

  const variants: Record<ButtonVariant, string> = {
    // Primary: orange fill with specular top highlight + orange glow drop shadow
    primary:
      'bg-[#FF803E] text-[#101218] hover:bg-[#FF9259] active:bg-[#E66826] ' +
      '[box-shadow:inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-1px_0_rgba(0,0,0,0.22),0_8px_28px_-6px_rgba(255,128,62,0.60)] ' +
      'hover:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-1px_0_rgba(0,0,0,0.20),0_10px_32px_-6px_rgba(255,146,89,0.65)]',
    // Secondary / glass: frosted glass control with 4-sided rim
    secondary:
      'glass-control text-[#F5F5F7] hover:bg-white/[0.10] active:bg-white/[0.06]',
    // Glass: same as secondary
    glass:
      'glass-control text-[#F5F5F7] hover:bg-white/[0.10] active:bg-white/[0.06]',
    // Tertiary: minimal ghost
    tertiary:
      'bg-transparent text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.06] active:bg-white/[0.04] ' +
      'border border-transparent',
    // Destructive: subtle red glass
    destructive:
      'bg-[#2C181C]/90 text-[#FF6B70] border border-[#FF6B70]/35 hover:bg-[#3A1E23] active:bg-[#2C181C] ' +
      '[box-shadow:inset_0_1px_0_rgba(255,107,112,0.14)]',
  };

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      whileTap={disabled || loading ? undefined : { scale: 0.972 }}
      transition={{ duration: 0.11, ease: [0.2, 0.8, 0.2, 1] }}
      className={`${base} ${sizeClass} ${variants[variant]} ${fullWidth ? 'w-full flex-1 min-w-0' : 'shrink-0'} ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </motion.button>
  );
};
