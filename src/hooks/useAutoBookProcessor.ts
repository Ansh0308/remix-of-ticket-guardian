'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProcessorResult {
  processed: number;
  eventsProcessed: number;
  success: number;
  failed: number;
}

export function useAutoBookProcessor() {
  const processorRef = useRef<NodeJS.Timeout | null>(null);

  const processAutoBooks = async (): Promise<ProcessorResult | null> => {
    try {
      // Call the edge function instead of RPC
      const { data, error } = await supabase.functions.invoke('process-auto-books', {
        body: {}
      });

      if (error) {
        console.error('[Auto Book Processor] Error:', error);
        return null;
      }

      if (data) {
        console.log('[Auto Book Processor] Result:', {
          processed: data.processed,
          eventsProcessed: data.eventsProcessed,
          success: data.success,
          failed: data.failed,
        });
        return data as ProcessorResult;
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
