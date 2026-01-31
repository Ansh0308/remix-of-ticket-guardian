'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AutoBook, Event } from '@/types';

/**
 * Hook to manage assisted booking notifications
 * Listens for status changes on auto_books and shows notifications when status becomes 'success'
 */
export const useAssistedBooking = () => {
  const { user } = useAuth();
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`assisted-booking-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auto_books',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newRecord = payload.new as {
            id: string;
            status: string;
            event_id: string;
          };
          const oldRecord = payload.old as { status: string };

          // Only process success status transitions
          if (newRecord.status === 'success' && oldRecord.status !== 'success') {
            console.log('[Assisted Booking] Auto-book succeeded:', newRecord.id);

            // Prevent duplicate processing
            if (processedIdsRef.current.has(newRecord.id)) {
              console.log('[Assisted Booking] Already processed:', newRecord.id);
              return;
            }

            try {
              // Mark as being processed
              processedIdsRef.current.add(newRecord.id);

              // Fetch event data
              const { data: autoBookData, error: autoBookError } = await supabase
                .from('auto_books')
                .select('*, event:events(*)')
                .eq('id', newRecord.id)
                .single();

              if (autoBookError || !autoBookData) {
                console.error('[Assisted Booking] Failed to fetch auto-book details:', autoBookError);
                toast({
                  title: "Booking Alert",
                  description: "Tickets are available for your auto-book!",
                  variant: "default",
                });
                return;
              }

              const event = autoBookData.event as Event;

              // Show toast notification
              toast({
                title: "🎉 Tickets Available!",
                description: `Tickets for ${event.name} are available right now!`,
              });

              console.log('[Assisted Booking] Notification shown for:', newRecord.id);
            } catch (error) {
              console.error('[Assisted Booking] Error processing success status:', error);
              // Remove from processed set on error so it can retry
              processedIdsRef.current.delete(newRecord.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
};
