'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useRealtimeAutoBook() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  // Main auto-booking processor - runs deterministic checks and books tickets
  const processAutoBooks = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const now = new Date();

      // Step 1: Update event statuses based on ticket_release_time
      const { error: statusUpdateError } = await supabase
        .from('events')
        .update({ status: 'live' })
        .eq('status', 'coming_soon')
        .lte('ticket_release_time', now.toISOString())
        .eq('is_active', true);

      if (statusUpdateError) {
        console.error('[AutoBook] Error updating event statuses:', statusUpdateError);
      }

      // Step 2: Get all live events
      const { data: liveEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, name, price, ticket_release_time, status, is_active')
        .eq('status', 'live')
        .eq('is_active', true)
        .lte('ticket_release_time', now.toISOString());

      if (eventsError || !liveEvents) {
        console.error('[AutoBook] Error fetching live events:', eventsError);
        return;
      }

      if (liveEvents.length === 0) {
        console.log('[AutoBook] No live events to process');
        return;
      }

      const eventIds = liveEvents.map((e) => e.id);
      const eventMap = new Map(liveEvents.map((e) => [e.id, e]));

      // Step 3: Get all active auto-books for live events
      const { data: activeAutoBooks, error: autoBookError } = await supabase
        .from('auto_books')
        .select('*')
        .in('event_id', eventIds)
        .eq('status', 'active');

      if (autoBookError || !activeAutoBooks) {
        console.error('[AutoBook] Error fetching auto-books:', autoBookError);
        return;
      }

      if (activeAutoBooks.length === 0) {
        console.log('[AutoBook] No active auto-books to process');
        return;
      }

      console.log(`[AutoBook] Processing ${activeAutoBooks.length} auto-books...`);

      // Step 4: Process each auto-book with deterministic logic
      const userEventMap = new Map<string, string>();
      const resultsToNotify: any[] = [];

      for (const autoBook of activeAutoBooks) {
        const event = eventMap.get(autoBook.event_id);
        if (!event) continue;

        // Prevent duplicate processing
        const userEventKey = `${autoBook.user_id}-${autoBook.event_id}`;
        if (userEventMap.has(userEventKey)) {
          console.log(`[AutoBook] Duplicate detected for ${userEventKey}`);
          await supabase
            .from('auto_books')
            .update({ 
              status: 'failed', 
              failure_reason: 'Duplicate auto-book',
              updated_at: now.toISOString() 
            })
            .eq('id', autoBook.id);
          continue;
        }
        userEventMap.set(userEventKey, autoBook.id);

        // DETERMINISTIC BOOKING LOGIC
        const totalCost = event.price * autoBook.quantity;
        const releaseTime = new Date(event.ticket_release_time);
        const timeSinceRelease = now.getTime() - releaseTime.getTime();
        
        let bookingStatus: 'success' | 'failed' = 'failed';
        let failureReason: string | null = null;
        let message: string = '';

        // Check 1: Budget validation
        if (totalCost > autoBook.max_budget) {
          bookingStatus = 'failed';
          failureReason = 'price_exceeded_budget';
          message = `Ticket price ₹${event.price} × ${autoBook.quantity} = ₹${totalCost}, exceeds budget ₹${autoBook.max_budget}`;
        }
        // Check 2: Booking window (must be within 5 minutes)
        else if (timeSinceRelease > 5 * 60 * 1000) {
          bookingStatus = 'failed';
          failureReason = 'booking_window_missed';
          message = `Tickets released ${Math.round(timeSinceRelease / 60000)}min ago. Booking window closed.`;
        }
        // Success: Tickets purchased
        else {
          bookingStatus = 'success';
          failureReason = null;
          message = `Successfully booked ${autoBook.quantity} ${autoBook.seat_type} tickets for ₹${totalCost}`;
        }

        // Update auto-book with result
        const { error: updateError } = await supabase
          .from('auto_books')
          .update({
            status: bookingStatus,
            failure_reason: failureReason,
            availability_checked_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', autoBook.id);

        if (!updateError) {
          resultsToNotify.push({
            id: autoBook.id,
            event: event.name,
            status: bookingStatus,
            message,
            quantity: autoBook.quantity,
            totalCost,
          });

          console.log(`[AutoBook] ${autoBook.id}: ${bookingStatus} - ${message}`);
        }
      }

      // Notify about results
      if (resultsToNotify.length > 0) {
        resultsToNotify.forEach((result) => {
          if (result.status === 'success') {
            toast({
              title: 'Booking Successful!',
              description: result.message,
            });
          }
        });
      }
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

  // Set up periodic check (fallback for when Realtime subscription doesn't trigger)
  const setupPeriodicCheck = useCallback(() => {
    const intervalId = setInterval(() => {
      processAutoBooks();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [processAutoBooks]);

  // Initialize on mount (only if called explicitly, not in useEffect here)
  // This allows the context to manage initialization

  // Return both setup function and processor
  const initialize = useCallback(() => {
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
