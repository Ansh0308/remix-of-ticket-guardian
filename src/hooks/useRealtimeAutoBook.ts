'use client';

import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useRealtimeAutoBook() {
  const processingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  // NOTE: We intentionally run processing on the server (edge function) so it:
  // - uses a consistent server clock
  // - can update events + auto_books regardless of client-side RLS quirks
  // - doesn’t depend on querying tables directly from the browser
  const processAutoBooks = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const now = new Date();
      console.log(`[AutoBook] Processing at ${now.toISOString()}`);

      // Server-side processor (edge function) handles:
      // 1) events: coming_soon -> live when release time passes
      // 2) auto_books: active -> success/failed
      const { data, error } = await supabase.functions.invoke('process-auto-books', {
        body: {
          // purely for logging/debug on the server
          invokedFrom: 'client_realtime_processor',
          clientTimestamp: now.toISOString(),
        },
      });

      if (error) {
        console.error('[AutoBook] Edge function error:', error);
        return;
      }

      const processed = Number(data?.processed ?? 0);
      const eventsProcessed = Number(data?.eventsProcessed ?? 0);
      const results: Array<{ status: 'success' | 'failed'; message?: string }> = Array.isArray(data?.results)
        ? data.results
        : [];

      console.log(
        `[AutoBook] Edge processed events=${eventsProcessed}, autoBooks=${processed}, results=${results.length}`
      );

      // Notify user for any status changes returned
      results.forEach((r) => {
        if (r.status === 'success') {
          toast({
            title: '🎉 Tickets Available!',
            description: r.message || 'Your auto-book was successful. Check My Bookings.',
          });
        } else if (r.status === 'failed') {
          toast({
            title: '❌ Auto-Book Failed',
            description: r.message || 'Your auto-book failed. Check details in My Bookings.',
            variant: 'destructive',
          });
        }
      });
    } catch (error) {
      console.error('[AutoBook] Processing error:', error);
    } finally {
      processingRef.current = false;
    }
  }, []);

  // Set up real-time subscription to events table
  const setupRealtimeListener = useCallback(() => {
    // Listen for event status changes
    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        async (payload) => {
          const event = payload.new;
          console.log('[AutoBook] Event changed:', event.id, event.status);
          
          // Trigger processing when event becomes live
          if (event.status === 'live') {
            await processAutoBooks();
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, [processAutoBooks]);

  // Set up periodic check (runs every 10 seconds to catch release times)
  const setupPeriodicCheck = useCallback(() => {
    // Run immediately on app load
    console.log('[AutoBook] Starting periodic check (every 30 seconds)...');
    processAutoBooks();
    
    // Then check every 30 seconds
    const intervalId = setInterval(() => {
      processAutoBooks();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [processAutoBooks]);

  // Initialize function to be called by context
  const initialize = useCallback(() => {
    console.log('[AutoBook] Initializing realtime auto-book processor...');
    setupRealtimeListener();
    const cleanup = setupPeriodicCheck();

    return () => {
      cleanup();
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [setupRealtimeListener, setupPeriodicCheck]);

  return { 
    processAutoBooks,
    setupRealtimeListener: initialize 
  };
}
