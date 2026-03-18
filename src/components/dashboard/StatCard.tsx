import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
}

const StatCard = ({ title, value, subtitle, icon: Icon, variant }: StatCardProps) => {
  return (
    <div className={`stat-card stat-card-${variant}`}>
      <div className="absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div className="mt-8">
        <p className="text-white/80 text-sm mb-1">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && (
          <p className="text-white/70 text-sm mt-2">{subtitle}</p>
        )}
      </div>
      {/* Decorative circles */}
      <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
    </div>
  );
};

export default StatCard;
