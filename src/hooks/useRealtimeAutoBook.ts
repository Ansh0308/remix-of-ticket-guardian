'use client';

import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useRealtimeAutoBook() {
  const processingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  // Main auto-booking processor - updates event statuses AND processes auto-books
  const processAutoBooks = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const now = new Date();
      console.log(`[AutoBook] Processing at ${now.toISOString()}`);

      // CRITICAL STEP 1: Update event statuses from 'coming_soon' to 'live' 
      // when ticket_release_time has passed
      const { data: eventsToUpdate, error: eventsToUpdateError } = await supabase
        .from('events')
        .select('id, name, ticket_release_time')
        .eq('status', 'coming_soon')
        .eq('is_active', true)
        .lte('ticket_release_time', now.toISOString());

      if (eventsToUpdateError) {
        console.error('[AutoBook] Error checking events to update:', eventsToUpdateError);
      } else if (eventsToUpdate && eventsToUpdate.length > 0) {
        console.log(`[AutoBook] Updating ${eventsToUpdate.length} events to LIVE status`);
        
        const eventIds = eventsToUpdate.map(e => e.id);
        const { error: updateStatusError } = await supabase
          .from('events')
          .update({ 
            status: 'live', 
            updated_at: now.toISOString() 
          })
          .in('id', eventIds);

        if (updateStatusError) {
          console.error('[AutoBook] Error updating event statuses:', updateStatusError);
        } else {
          console.log(`[AutoBook] Successfully updated ${eventIds.length} events to LIVE`);
          eventsToUpdate.forEach(e => {
            console.log(`  → ${e.name}: coming_soon → live`);
          });
        }
      }

      // Step 2: Get all ACTIVE auto-books
      const { data: activeAutoBooks, error: autoBookError } = await supabase
        .from('auto_books')
        .select('*')
        .eq('status', 'active');

      if (autoBookError || !activeAutoBooks) {
        console.error('[AutoBook] Error fetching auto-books:', autoBookError);
        return;
      }

      if (activeAutoBooks.length === 0) {
        console.log('[AutoBook] No active auto-books to process');
        return;
      }

      console.log(`[AutoBook] Found ${activeAutoBooks.length} active auto-books`);

      // Step 3: Get the events for these auto-books
      const eventIds = [...new Set(activeAutoBooks.map((ab) => ab.event_id))];
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, name, price, ticket_release_time, status')
        .in('id', eventIds);

      if (eventsError || !events) {
        console.error('[AutoBook] Error fetching events:', eventsError);
        return;
      }

      const eventMap = new Map(events.map((e) => [e.id, e]));

      // Step 4: Filter to only events where release time has passed (time-based check)
      const eligibleAutoBooks = activeAutoBooks.filter((ab) => {
        const event = eventMap.get(ab.event_id);
        if (!event) return false;
        
        const releaseTime = new Date(event.ticket_release_time);
        const hasPassedReleaseTime = releaseTime <= now;
        
        if (hasPassedReleaseTime) {
          console.log(`[AutoBook] Auto-book ${ab.id} eligible - release time passed: ${event.ticket_release_time}`);
        }
        
        return hasPassedReleaseTime;
      });

      if (eligibleAutoBooks.length === 0) {
        console.log('[AutoBook] No auto-books with passed release times');
        return;
      }

      console.log(`[AutoBook] Processing ${eligibleAutoBooks.length} eligible auto-books...`);

      // Step 5: Process each auto-book with deterministic logic
      const userEventMap = new Map<string, string>();
      const resultsToNotify: any[] = [];

      for (const autoBook of eligibleAutoBooks) {
        const event = eventMap.get(autoBook.event_id);
        if (!event) continue;

        // Prevent duplicate processing
        const userEventKey = `${autoBook.user_id}-${autoBook.event_id}`;
        if (userEventMap.has(userEventKey)) {
          console.log(`[AutoBook] Duplicate detected for ${userEventKey}`);
          await supabase
            .from('auto_books')
            .update({ 
              status: 'failed' as const, 
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
        let message: string = '';

        console.log(`[AutoBook] Checking auto-book ${autoBook.id}:`);
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
            status: bookingStatus as 'success' | 'failed',
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

          console.log(`[AutoBook] ✓ Updated ${autoBook.id}: ${bookingStatus}`);
        } else {
          console.error(`[AutoBook] ✗ Failed to update ${autoBook.id}:`, JSON.stringify(updateError));
        }
      }

      // Notify about results
      if (resultsToNotify.length > 0) {
        console.log(`[AutoBook] Showing ${resultsToNotify.length} notifications`);
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
    console.log('[AutoBook] Starting periodic check (every 10 seconds)...');
    processAutoBooks();
    
    // Then check every 10 seconds
    const intervalId = setInterval(() => {
      processAutoBooks();
    }, 10000);

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
