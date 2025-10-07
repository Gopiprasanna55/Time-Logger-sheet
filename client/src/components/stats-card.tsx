import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  testId?: string;
}

export default function StatsCard({ title, value, icon: Icon, className = "", testId }: StatsCardProps) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`} data-testid={testId}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground" data-testid={`${testId}-title`}>{title}</p>
          <p className="text-2xl font-bold text-foreground" data-testid={`${testId}-value`}>{value}</p>
        </div>
        <Icon className="text-primary text-xl" />
      </div>
    </div>
  );
}
