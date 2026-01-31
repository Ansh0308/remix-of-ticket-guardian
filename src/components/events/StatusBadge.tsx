import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, Zap, Ban, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'active' | 'success' | 'failed' | 'coming_soon' | 'live' | 'available' | 'sold' | 'sold_out' | 'expired';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  animated = false 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          icon: Clock,
          className: 'bg-primary/10 text-primary border-primary/20',
        };
      case 'success':
        return {
          label: 'Success',
          icon: CheckCircle2,
          className: 'bg-success/10 text-success border-success/20',
        };
      case 'failed':
        return {
          label: 'Failed',
          icon: XCircle,
          className: 'bg-destructive/10 text-destructive border-destructive/20',
        };
      case 'coming_soon':
        return {
          label: 'Coming Soon',
          icon: Clock,
          className: 'bg-success/10 text-success border-success/20',
        };
      case 'live':
        return {
          label: 'Live Now',
          icon: Zap,
          className: 'bg-destructive/10 text-destructive border-destructive/20',
        };
      case 'available':
        return {
          label: 'Available',
          icon: CheckCircle2,
          className: 'bg-success/10 text-success border-success/20',
        };
      case 'sold':
        return {
          label: 'Sold',
          icon: XCircle,
          className: 'bg-muted text-muted-foreground border-muted',
        };
      case 'sold_out':
        return {
          label: 'Sold Out',
          icon: Ban,
          className: 'bg-destructive/10 text-destructive border-destructive/20',
        };
      case 'expired':
        return {
          label: 'Expired',
          icon: AlertTriangle,
          className: 'bg-muted text-muted-foreground border-muted',
        };
      default:
        return {
          label: status,
          icon: Clock,
          className: 'bg-muted text-muted-foreground border-muted',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const badge = (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${config.className}`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );

  if (animated && (status === 'active' || status === 'coming_soon')) {
    return (
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {badge}
      </motion.div>
    );
  }

  return badge;
};

export default StatusBadge;
