import type { ReactNode } from 'react';

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
    <h2 className="flex items-center gap-2 text-sm font-medium text-base-content/70">
      {icon}
      {title}
    </h2>
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
        <span className="text-sm text-base-content/80">{label}</span>
        <span className={`text-xl tabular-nums font-semibold ${valueStyles}`}>{value}</span>
      </div>
    );
  }

  return (
    <div className="flex justify-between text-sm">
      <span className="text-base-content/80">{label}</span>
      <span className={`tabular-nums font-medium ${valueStyles}`}>{value}</span>
    </div>
  );
}
