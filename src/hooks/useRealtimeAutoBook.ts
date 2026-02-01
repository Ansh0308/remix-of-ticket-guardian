'use client';

import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useRealtimeAutoBook() {
  const processingRef = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /**
   * Attempt server-side processing via edge function,
   * fallback to client-side processing if edge function fails
   */
  const processAutoBooks = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const now = new Date();
      console.log(`[AutoBook] Processing at ${now.toISOString()}`);

      // Try edge function first
      const { data, error } = await supabase.functions.invoke('process-auto-books', {
        body: {
          invokedFrom: 'client_realtime_processor',
          clientTimestamp: now.toISOString(),
        },
      });

      if (!error && data) {
        // Edge function worked
        const processed = Number(data?.processed ?? 0);
        const eventsUpdatedToLive = Number(data?.eventsUpdatedToLive ?? 0);
        const results: Array<{ status: 'success' | 'failed'; message?: string }> = Array.isArray(data?.results)
          ? data.results
          : [];

        console.log(
          `[AutoBook] Edge processed eventsUpdatedToLive=${eventsUpdatedToLive}, autoBooks=${processed}, results=${results.length}`
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
      } else {
        // Edge function failed - fallback to client-side processing
        console.warn('[AutoBook] Edge function failed, using client-side fallback:', error?.message);
        await processAutoBooksFallback(now);
      }
    } catch (error) {
      console.error('[AutoBook] Processing error:', error);
      // Try fallback on any error
      try {
        await processAutoBooksFallback(new Date());
      } catch (fallbackError) {
        console.error('[AutoBook] Fallback also failed:', fallbackError);
      }
    } finally {
      processingRef.current = false;
    }
  }, []);

  /**
   * Client-side fallback processing when edge function is unavailable
   */
  const processAutoBooksFallback = async (now: Date) => {
    console.log('[AutoBook] Running client-side fallback processing...');

    // STEP 1: Update events from coming_soon to live
    const { data: eventsToUpdate, error: eventsToUpdateError } = await supabase
      .from('events')
      .select('id, name, ticket_release_time')
      .eq('status', 'coming_soon')
      .eq('is_active', true)
      .lte('ticket_release_time', now.toISOString());

    if (eventsToUpdateError) {
      console.error('[AutoBook Fallback] Error fetching events to update:', eventsToUpdateError);
    } else if (eventsToUpdate && eventsToUpdate.length > 0) {
      console.log(`[AutoBook Fallback] Updating ${eventsToUpdate.length} events to LIVE status`);
      
      const eventIds = eventsToUpdate.map(e => e.id);
      const { error: updateStatusError } = await supabase
        .from('events')
        .update({ 
          status: 'live', 
          updated_at: now.toISOString() 
        })
        .in('id', eventIds);

      if (updateStatusError) {
        console.error('[AutoBook Fallback] Error updating event statuses:', updateStatusError);
      } else {
        console.log(`[AutoBook Fallback] Successfully updated ${eventIds.length} events to LIVE`);
        eventsToUpdate.forEach(e => {
          console.log(`  → ${e.name}: coming_soon → live`);
        });
      }
    }

    // STEP 2: Get all ACTIVE auto-books
    const { data: activeAutoBooks, error: autoBookError } = await supabase
      .from('auto_books')
      .select('*')
      .eq('status', 'active');

    if (autoBookError || !activeAutoBooks) {
      console.error('[AutoBook Fallback] Error fetching auto-books:', autoBookError);
      return;
    }

    if (activeAutoBooks.length === 0) {
      console.log('[AutoBook Fallback] No active auto-books to process');
      return;
    }

    console.log(`[AutoBook Fallback] Found ${activeAutoBooks.length} active auto-books`);

    // STEP 3: Get the events for these auto-books
    const eventIds = [...new Set(activeAutoBooks.map((ab) => ab.event_id))];
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, name, price, ticket_release_time, status')
      .in('id', eventIds);

    if (eventsError || !events) {
      console.error('[AutoBook Fallback] Error fetching events:', eventsError);
      return;
    }

    const eventMap = new Map(events.map((e) => [e.id, e]));

    // STEP 4: Filter to only events where release time has passed
    const eligibleAutoBooks = activeAutoBooks.filter((ab) => {
      const event = eventMap.get(ab.event_id);
      if (!event) return false;
      
      const releaseTime = new Date(event.ticket_release_time);
      const hasPassedReleaseTime = releaseTime <= now;
      
      if (hasPassedReleaseTime) {
        console.log(`[AutoBook Fallback] Auto-book ${ab.id} eligible - release time passed: ${event.ticket_release_time}`);
      }
      
      return hasPassedReleaseTime;
    });

    if (eligibleAutoBooks.length === 0) {
      console.log('[AutoBook Fallback] No auto-books with passed release times');
      return;
    }

    console.log(`[AutoBook Fallback] Processing ${eligibleAutoBooks.length} eligible auto-books...`);

    // STEP 5: Process each auto-book with deterministic logic
    const userEventMap = new Map<string, string>();
    const resultsToNotify: Array<{
      id: string;
      event: string;
      status: 'success' | 'failed';
      message: string;
      quantity: number;
      totalCost: number;
    }> = [];

    for (const autoBook of eligibleAutoBooks) {
      const event = eventMap.get(autoBook.event_id);
      if (!event) continue;

      // Prevent duplicate processing
      const userEventKey = `${autoBook.user_id}-${autoBook.event_id}`;
      if (userEventMap.has(userEventKey)) {
        console.log(`[AutoBook Fallback] Duplicate detected for ${userEventKey}`);
        await supabase
          .from('auto_books')
          .update({ 
            status: 'failed', 
            failure_reason: 'Duplicate auto-book',
            updated_at: now.toISOString() 
          })
          .eq('id', autoBook.id)
          .eq('user_id', autoBook.user_id);
        continue;
      }
      userEventMap.set(userEventKey, autoBook.id);

      // DETERMINISTIC BOOKING LOGIC
      const totalCost = event.price * autoBook.quantity;
      const releaseTime = new Date(event.ticket_release_time);
      const timeSinceRelease = now.getTime() - releaseTime.getTime();
      
      let bookingStatus: 'success' | 'failed' = 'failed';
      let failureReason: string | null = null;
      let message = '';

      console.log(`[AutoBook Fallback] Checking auto-book ${autoBook.id}:`);
      console.log(`  - Event: ${event.name}`);
      console.log(`  - Price: ₹${event.price} x ${autoBook.quantity} = ₹${totalCost}`);
      console.log(`  - Budget: ₹${autoBook.max_budget}`);
      console.log(`  - Time since release: ${Math.round(timeSinceRelease / 1000)}s`);

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

      console.log(`  - Result: ${bookingStatus} - ${message}`);

      // Update auto-book with result - use user_id filter for RLS
      const { error: updateError } = await supabase
        .from('auto_books')
        .update({
          status: bookingStatus,
          failure_reason: failureReason,
          updated_at: now.toISOString(),
        })
        .eq('id', autoBook.id)
        .eq('user_id', autoBook.user_id);

      if (!updateError) {
        resultsToNotify.push({
          id: autoBook.id,
          event: event.name,
          status: bookingStatus,
          message,
          quantity: autoBook.quantity,
          totalCost,
        });

        console.log(`[AutoBook Fallback] ✓ Updated ${autoBook.id}: ${bookingStatus}`);
      } else {
        console.error(`[AutoBook Fallback] ✗ Failed to update ${autoBook.id}:`, JSON.stringify(updateError));
      }
    }

    // Notify about results
    if (resultsToNotify.length > 0) {
      console.log(`[AutoBook Fallback] Showing ${resultsToNotify.length} notifications`);
      resultsToNotify.forEach((result) => {
        if (result.status === 'success') {
          toast({
            title: '🎉 Booking Successful!',
            description: result.message,
          });
        } else {
          toast({
            title: '❌ Booking Failed',
            description: result.message,
            variant: 'destructive',
          });
        }
      });
    }
  };

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

  // Set up periodic check (runs every 30 seconds to catch release times)
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
