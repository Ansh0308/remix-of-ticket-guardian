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
      const { data, error } = await supabase.functions.invoke('clone-event-for-testing', {
        body: {
          eventId,
          testOffsetMinutes: offsetMinutes,
        },
      });

      if (error) throw error;

      toast({
        title: 'Test Event Created!',
        description: `Tickets will "release" in ${offsetMinutes} minutes. Event: ${data.eventName}`,
      });

      return data;
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
