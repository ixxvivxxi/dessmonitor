import type { ReactNode } from 'react';
import { Typography } from './typography';

interface CardProps {
  children: ReactNode;
}

export function Card({ children }: CardProps) {
  return <div className="card card-border bg-base-100 p-4 shadow-sm">{children}</div>;
}

interface CardHeaderProps {
  icon: ReactNode;
  title: string;
}

export function CardHeader({ icon, title }: CardHeaderProps) {
  return (
    <Typography variant="cardTitle">
      {icon}
      {title}
    </Typography>
  );
}

interface CardBodyProps {
  children: ReactNode;
}

export function CardBody({ children }: CardBodyProps) {
  return <div className="mt-3 space-y-2">{children}</div>;
}

interface CardRowProps {
  label: string;
  value: string;
  primary?: boolean;
  valueClassName?: string;
}

export function CardRow({ label, value, primary, valueClassName }: CardRowProps) {
  const valueStyles = valueClassName ?? 'text-base-content';

  if (primary) {
    return (
      <div className="flex items-baseline justify-between">
        <Typography variant="label">{label}</Typography>
        <Typography variant="valueLg" className={valueStyles}>
          {value}
        </Typography>
      </div>
    );
  }

  return (
    <div className="flex justify-between text-sm">
      <Typography variant="label">{label}</Typography>
      <Typography variant="value" className={valueStyles}>
        {value}
      </Typography>
    </div>
  );
}
