import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrapeHealth } from '@/types';

export function useScrapeHealth() {
  return useQuery({
    queryKey: ['scrapeHealth'],
    queryFn: async (): Promise<ScrapeHealth[]> => {
      const { data, error } = await supabase
        .from('scrape_health')
        .select('*')
        .order('platform_source');

      if (error) throw error;
      return data as ScrapeHealth[];
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
