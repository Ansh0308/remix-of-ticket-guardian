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
      const { data, error } = await supabase.functions.invoke('process-auto-books', {
        body: {
          dryRun: true,
          autoBookId,
        },
      });

      if (error) throw error;

      if (data?.results && data.results.length > 0) {
        const result = data.results[0];
        
        toast({
          title: 'Dry-Run Complete',
          description: result.message,
        });

        return result;
      }

      throw new Error('No results returned from dry-run');
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
