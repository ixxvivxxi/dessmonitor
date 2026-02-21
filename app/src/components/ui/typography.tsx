import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

const variants = {
  h1: 'text-xl font-semibold text-base-content',
  h2: 'text-lg font-semibold text-base-content',
  h3: 'text-sm font-medium text-base-content',
  cardTitle: 'flex gap-2 text-sm font-medium text-base-content/70',
  body: 'text-sm text-base-content',
  bodyMuted: 'text-sm text-base-content/80',
  caption: 'text-sm text-base-content/70',
  captionDim: 'text-sm text-base-content/60',
  value: 'tabular-nums font-medium text-base-content',
  valueLg: 'text-xl tabular-nums font-semibold text-base-content',
  valueXl: 'text-2xl font-semibold tabular-nums text-base-content',
  label: 'text-sm text-base-content/80',
  error: 'text-sm text-error',
  success: 'tabular-nums font-medium text-success',
  warning: 'tabular-nums font-medium text-warning',
  xs: 'text-xs text-base-content',
} as const;

type Variant = keyof typeof variants;

const defaultElements: Record<Variant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  cardTitle: 'h2',
  body: 'p',
  bodyMuted: 'p',
  caption: 'p',
  captionDim: 'p',
  value: 'span',
  valueLg: 'span',
  valueXl: 'span',
  label: 'span',
  error: 'p',
  success: 'span',
  warning: 'span',
  xs: 'span',
};

interface TypographyProps {
  variant: Variant;
  as?: ElementType;
  children: ReactNode;
  className?: string;
}

export function Typography({
  variant,
  as,
  children,
  className = '',
  ...rest
}: TypographyProps & ComponentPropsWithoutRef<'span'>) {
  const Element = as ?? defaultElements[variant];
  const baseClasses = variants[variant];

  return (
    <Element className={`${baseClasses} ${className}`.trim()} {...rest}>
      {children}
    </Element>
  );
}
