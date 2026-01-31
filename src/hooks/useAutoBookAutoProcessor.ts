'use client';

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that automatically processes auto-books when ticket release times arrive
 * This hook should be used in your main App layout and will run every 30 seconds
 */
export const useAutoBookAutoProcessor = () => {
  useEffect(() => {
    const processAutoBooks = async () => {
      try {
        // Call the edge function instead of RPC
        const { data, error } = await supabase.functions.invoke('process-auto-books', {
          body: {}
        });
        
        if (error) {
          console.error('[Auto-Book Processor] Error:', error.message);
          return;
        }

        if (data?.results && data.results.length > 0) {
          console.log(`[Auto-Book Processor] Successfully processed ${data.results.length} auto-books`);
          data.results.forEach((booking: any) => {
            console.log(`  - Auto-book ${booking.autoBookId}: ${booking.status}`);
          });
        }
      } catch (error) {
        console.error('[Auto-Book Processor] Unexpected error:', error);
      }
    };

    // Run immediately on mount
    processAutoBooks();

    // Then run every 30 seconds to check for new releases
    const interval = setInterval(processAutoBooks, 30000);

    return () => clearInterval(interval);
  }, []);
};
