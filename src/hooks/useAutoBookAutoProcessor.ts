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
        const { data, error } = await supabase.rpc('process_auto_books_for_live_events');
        
        if (error) {
          console.error('[Auto-Book Processor] Error:', error.message);
          return;
        }

        if (data && data.length > 0) {
          console.log(`[Auto-Book Processor] Successfully processed ${data.length} auto-books`);
          data.forEach((booking: any) => {
            console.log(`  - Auto-book ${booking.auto_book_id} transitioned from ${booking.old_status} to ${booking.new_status}`);
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
