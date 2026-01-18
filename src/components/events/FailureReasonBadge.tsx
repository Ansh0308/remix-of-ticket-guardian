import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Zap, 
  WifiOff, 
  MinusCircle,
  HelpCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type FailureReason = 
  | 'price_exceeded_budget'
  | 'tickets_sold_out_fast'
  | 'booking_window_missed'
  | 'platform_error'
  | 'quantity_unavailable'
  | 'network_timeout'
  | string
  | null;

interface FailureReasonBadgeProps {
  reason: FailureReason;
  compact?: boolean;
}

const failureConfig: Record<string, {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  price_exceeded_budget: {
    label: 'Budget Exceeded',
    description: 'The ticket price was higher than your maximum budget.',
    icon: DollarSign,
    color: 'bg-warning/10 text-warning border-warning/30',
  },
  tickets_sold_out_fast: {
    label: 'Sold Out',
    description: 'High demand caused tickets to sell out within seconds.',
    icon: Zap,
    color: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  booking_window_missed: {
    label: 'Window Missed',
    description: 'The booking was attempted too late after ticket release.',
    icon: Clock,
    color: 'bg-warning/10 text-warning border-warning/30',
  },
  platform_error: {
    label: 'Platform Error',
    description: 'The ticketing platform returned an error. Try manual booking.',
    icon: AlertCircle,
    color: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  quantity_unavailable: {
    label: 'Limited Tickets',
    description: 'Not enough tickets available for your requested quantity.',
    icon: MinusCircle,
    color: 'bg-warning/10 text-warning border-warning/30',
  },
  network_timeout: {
    label: 'Timeout',
    description: 'Network request timed out. Try booking manually.',
    icon: WifiOff,
    color: 'bg-muted text-muted-foreground border-muted',
  },
};

const FailureReasonBadge: React.FC<FailureReasonBadgeProps> = ({ reason, compact = false }) => {
  if (!reason) return null;

  const config = failureConfig[reason] || {
    label: 'Failed',
    description: reason || 'An unknown error occurred.',
    icon: HelpCircle,
    color: 'bg-muted text-muted-foreground border-muted',
  };

  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Badge 
              variant="outline" 
              className={`${config.color} cursor-help gap-1.5 px-2 py-1`}
            >
              <Icon className="w-3.5 h-3.5" />
              {!compact && <span className="text-xs">{config.label}</span>}
            </Badge>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-semibold mb-1">{config.label}</p>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FailureReasonBadge;
