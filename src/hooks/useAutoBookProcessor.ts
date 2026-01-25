'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProcessorResult {
  updated_events: number;
  processed_auto_books: number;
  successful_bookings: number;
  failed_bookings: number;
}

export function useAutoBookProcessor() {
  const processorRef = useRef<NodeJS.Timeout | null>(null);

  const processAutoBooks = async (): Promise<ProcessorResult | null> => {
    try {
      const { data, error } = await supabase.rpc('run_auto_book_processor');

      if (error) {
        console.error('[Auto Book Processor] Error:', error);
        return null;
      }

      if (data && data.length > 0) {
        const result = data[0] as ProcessorResult;
        console.log('[Auto Book Processor] Result:', {
          updated_events: result.updated_events,
          processed_auto_books: result.processed_auto_books,
          successful_bookings: result.successful_bookings,
          failed_bookings: result.failed_bookings,
        });
        return result;
      }

      return null;
    } catch (error) {
      console.error('[Auto Book Processor] Exception:', error);
      return null;
    }
  };

  // Start automatic processing
  const startAutoProcessor = (intervalMs: number = 60000) => {
    // Run immediately on start
    processAutoBooks();

    // Then run at regular intervals
    processorRef.current = setInterval(() => {
      processAutoBooks();
    }, intervalMs);

    return () => {
      if (processorRef.current) {
        clearInterval(processorRef.current);
        processorRef.current = null;
      }
    };
  };

  // Stop automatic processing
  const stopAutoProcessor = () => {
    if (processorRef.current) {
      clearInterval(processorRef.current);
      processorRef.current = null;
    }
  };

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoProcessor();
    };
  }, []);

  return {
    processAutoBooks,
    startAutoProcessor,
    stopAutoProcessor,
  };
}
