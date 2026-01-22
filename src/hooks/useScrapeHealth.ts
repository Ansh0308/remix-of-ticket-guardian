'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrapeHealth } from '@/types';

/**
 * PHASE 5: EVENT SOURCE HEALTH MONITORING
 *
 * Monitors scraper health across all platforms.
 * Displays data freshness badges and health status.
 */
export function useScrapeHealth() {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  // Real-time subscription for scrape_health changes
  useEffect(() => {
    const channel = supabase
      .channel('scrape-health-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scrape_health',
        },
        (payload) => {
          console.log('[v0] Scrape health real-time update:', payload);
          queryClientRef.current.invalidateQueries({ queryKey: ['scrapeHealth'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return useQuery({
    queryKey: ['scrapeHealth'],
    queryFn: async (): Promise<ScrapeHealth[]> => {
      const { data, error } = await supabase
        .from('scrape_health')
        .select('*')
        .order('platform_source');

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        status: item.status as 'healthy' | 'warning' | 'unhealthy'
      }));
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useLastScrapeTime() {
  const { data: health } = useScrapeHealth();

  if (!health || health.length === 0) return null;

  // Find the most recent successful scrape
  const lastScrape = health
    .filter(h => h.last_successful_scrape)
    .sort((a, b) =>
      new Date(b.last_successful_scrape!).getTime() -
      new Date(a.last_successful_scrape!).getTime()
    )[0];

  return lastScrape?.last_successful_scrape || null;
}

export function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Get health status badge styling and messaging
 */
export function getHealthStatusInfo(status: 'healthy' | 'warning' | 'unhealthy', errorMessage?: string | null) {
  const statusInfo = {
    healthy: {
      color: 'bg-green-100 text-green-800',
      icon: '✓',
      message: 'Data is fresh and up-to-date',
      badge: 'green',
    },
    warning: {
      color: 'bg-yellow-100 text-yellow-800',
      icon: '⚠',
      message: 'Scraper is having issues, data may be outdated',
      badge: 'yellow',
    },
    unhealthy: {
      color: 'bg-red-100 text-red-800',
      icon: '✕',
      message: errorMessage || 'Scraper is down, using cached data',
      badge: 'red',
    },
  };

  return statusInfo[status] || statusInfo.unhealthy;
}
