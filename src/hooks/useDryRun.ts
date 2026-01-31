'use client';

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface CloneEventResponse {
  success: boolean;
  testEventId: string;
  originalEventId: string;
  originalReleaseTime: string;
  testReleaseTime: string;
  offsetMinutes: number;
  eventName: string;
  message: string;
}

interface DryRunResult {
  autoBookId: string;
  userId: string;
  eventId: string;
  eventName: string;
  status: 'success' | 'failed' | 'error';
  failureReason: string | null;
  quantity: number;
  seatType: string;
  totalCost: number;
  message: string;
}

export const useDryRun = () => {
  const [isCloning, setIsCloning] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const cloneEventForTesting = async (
    eventId: string,
    offsetMinutes: number = 2
  ): Promise<CloneEventResponse | null> => {
    setIsCloning(true);
    try {
      // Fetch original event
      const { data: originalEvent, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (fetchError || !originalEvent) {
        throw new Error('Event not found');
      }

      // Calculate new release time: NOW + offsetMinutes
      const now = new Date();
      const newReleaseTime = new Date(now.getTime() + offsetMinutes * 60000);

      // Create cloned event - only copy fields we need, omit id to let Supabase generate it
      const clonedEvent: any = {
        is_test_event: true,
        cloned_from_id: eventId,
        original_release_time: originalEvent.ticket_release_time,
        ticket_release_time: newReleaseTime.toISOString(),
        name: `[TEST] ${originalEvent.name} (${offsetMinutes}m)`,
        test_created_at: now.toISOString(),
        // Copy all other fields from original except id
        category: originalEvent.category,
        description: originalEvent.description,
        date: originalEvent.date,
        city: originalEvent.city,
        venue: originalEvent.venue,
        price: originalEvent.price,
        high_demand: originalEvent.high_demand,
        image_url: originalEvent.image_url,
        status: originalEvent.status,
        event_url: originalEvent.event_url,
      };

      // Insert cloned event - Supabase will auto-generate the id
      const { data: inserted, error: insertError } = await supabase
        .from('events')
        .insert([clonedEvent])
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create test event: ${insertError.message}`);
      }

      toast({
        title: 'Test Event Created!',
        description: `Tickets will "release" in ${offsetMinutes} minutes. Event: ${inserted.name}`,
      });

      return {
        success: true,
        testEventId: inserted.id,
        originalEventId: eventId,
        originalReleaseTime: originalEvent.ticket_release_time,
        testReleaseTime: newReleaseTime.toISOString(),
        offsetMinutes,
        eventName: inserted.name,
        message: `Test event created. Tickets will "release" in ${offsetMinutes} minutes.`,
      };
    } catch (error: any) {
      console.error('Error cloning event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create test event',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCloning(false);
    }
  };

  const runDryRun = async (autoBookId: string): Promise<DryRunResult | null> => {
    setIsRunning(true);
    try {
      // Fetch auto-book
      const { data: autoBook, error: autoBookError } = await supabase
        .from('auto_books')
        .select('*, events(*)')
        .eq('id', autoBookId)
        .single();

      if (autoBookError || !autoBook) {
        throw new Error('Auto-book not found');
      }

      const event = autoBook.events;
      const now = new Date();
      const releaseTime = new Date(event.ticket_release_time);
      const timeSinceRelease = now.getTime() - releaseTime.getTime();
      const totalCost = event.price * autoBook.quantity;

      let simulatedStatus: 'success' | 'failed' = 'failed';
      let simulatedFailureReason: string | null = null;
      let simulatedMessage: string = '';

      // DETERMINISTIC CHECKS (exactly same logic as real processing)
      const withinBudget = totalCost <= autoBook.max_budget;

      if (!withinBudget) {
        simulatedStatus = 'failed';
        simulatedFailureReason = 'price_exceeded_budget';
        simulatedMessage = `Ticket price ₹${event.price} per ticket × ${autoBook.quantity} = ₹${totalCost}, exceeds your budget of ₹${autoBook.max_budget}.`;
      } else if (timeSinceRelease > 5 * 60 * 1000) {
        // More than 5 minutes since release
        simulatedStatus = 'failed';
        simulatedFailureReason = 'booking_window_missed';
        simulatedMessage = `Ticket release was ${Math.round(timeSinceRelease / 60000)} minutes ago. Booking window is typically 5 minutes or less for high-demand events.`;
      } else {
        // Within 5 minutes and within budget
        simulatedStatus = 'success';
        simulatedFailureReason = null;
        simulatedMessage = `Tickets matching your preferences were AVAILABLE at release time (${autoBook.quantity} × ${autoBook.seat_type}, ₹${totalCost}).`;
      }

      const result: DryRunResult = {
        autoBookId,
        status: simulatedStatus,
        failureReason: simulatedFailureReason,
        message: `[DRY-RUN] ${simulatedMessage}`,
        eventName: event.name,
        eventId: event.id,
        quantity: autoBook.quantity,
        seatType: autoBook.seat_type,
        totalCost,
        userId: autoBook.user_id,
      };

      toast({
        title: 'Dry-Run Complete',
        description: result.message,
      });

      return result;
    } catch (error: any) {
      console.error('Error running dry-run:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to run dry-run',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsRunning(false);
    }
  };

  return {
    cloneEventForTesting,
    runDryRun,
    isCloning,
    isRunning,
  };
};
