import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardGlow = 'none' | 'amber' | 'cyan';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;
  glow?: CardGlow;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

const glowClasses: Record<CardGlow, string> = {
  none: '',
  amber: 'hover:shadow-[0_0_20px_rgba(217,119,6,0.08)]',
  cyan: 'hover:shadow-[0_0_20px_rgba(8,145,178,0.08)]',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', hover = false, glow = 'none', className, children, ...props }, ref) => {
    const classes = [
      'bg-forge-900 border border-forge-800 rounded-md',
      paddingClasses[padding],
      hover && 'cursor-pointer hover:border-forge-700 transition-all',
      glow !== 'none' && glowClasses[glow],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['flex flex-col space-y-1', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={['text-lg font-semibold text-forge-50', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={['text-sm text-forge-400', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </p>
  );
}
