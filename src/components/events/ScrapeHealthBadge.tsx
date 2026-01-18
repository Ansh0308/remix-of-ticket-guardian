import React from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useScrapeHealth, formatTimeAgo } from '@/hooks/useScrapeHealth';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ScrapeHealthBadgeProps {
  compact?: boolean;
}

const ScrapeHealthBadge: React.FC<ScrapeHealthBadgeProps> = ({ compact = false }) => {
  const { data: health, isLoading } = useScrapeHealth();

  if (isLoading || !health) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <RefreshCw className="w-3 h-3 animate-spin" />
        {!compact && <span>Loading...</span>}
      </Badge>
    );
  }

  // Find the most recent scrape across all platforms
  const lastScrape = health
    .filter(h => h.last_successful_scrape)
    .sort((a, b) => 
      new Date(b.last_successful_scrape!).getTime() - 
      new Date(a.last_successful_scrape!).getTime()
    )[0];

  const lastScrapeTime = lastScrape?.last_successful_scrape;
  const timeAgo = formatTimeAgo(lastScrapeTime || null);

  // Determine overall health status
  const unhealthyCount = health.filter(h => h.status === 'unhealthy').length;
  const warningCount = health.filter(h => h.status === 'warning').length;
  
  let overallStatus: 'healthy' | 'warning' | 'unhealthy' = 'healthy';
  let statusColor = 'bg-success/10 text-success border-success/30';
  let StatusIcon = CheckCircle2;

  if (unhealthyCount > 0) {
    overallStatus = 'unhealthy';
    statusColor = 'bg-destructive/10 text-destructive border-destructive/30';
    StatusIcon = AlertCircle;
  } else if (warningCount > 0) {
    overallStatus = 'warning';
    statusColor = 'bg-warning/10 text-warning border-warning/30';
    StatusIcon = AlertCircle;
  }

  // Check if data is stale (more than 6 hours)
  const isStale = lastScrapeTime && 
    (new Date().getTime() - new Date(lastScrapeTime).getTime()) > 6 * 60 * 60 * 1000;

  if (isStale && overallStatus === 'healthy') {
    overallStatus = 'warning';
    statusColor = 'bg-warning/10 text-warning border-warning/30';
    StatusIcon = AlertCircle;
  }

  const totalEvents = health.reduce((sum, h) => sum + h.events_count, 0);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
          >
            <Badge 
              variant="outline" 
              className={`${statusColor} cursor-help gap-1.5 px-3 py-1.5`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {!compact && (
                <>
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium">{timeAgo}</span>
                </>
              )}
            </Badge>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Data Freshness</p>
            <p className="text-sm text-muted-foreground">
              Last updated: {timeAgo}
            </p>
            <div className="space-y-1 pt-2 border-t border-border">
              {health.map((platform) => (
                <div 
                  key={platform.id} 
                  className="flex items-center justify-between text-xs"
                >
                  <span>{platform.platform_source}</span>
                  <span className={`${
                    platform.status === 'healthy' ? 'text-success' :
                    platform.status === 'warning' ? 'text-warning' : 'text-destructive'
                  }`}>
                    {platform.events_count} events
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Total: {totalEvents} events tracked
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ScrapeHealthBadge;
