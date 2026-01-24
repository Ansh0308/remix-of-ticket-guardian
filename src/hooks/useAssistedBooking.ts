'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { triggerAssistedBookingOnSuccess } from '@/lib/assistedBookingService';
import { AutoBook, Event } from '@/types';

/**
 * Hook to manage assisted booking notifications and emails
 * Listens for status changes on auto_books and triggers email when status becomes 'success'
 */
export const useAssistedBooking = () => {
  const { user } = useAuth();
  const sentEmailsRef = useRef<Set<string>>(new Set());

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
          } & AutoBook;
          const oldRecord = payload.old as { status: string };

          // Only process success status transitions
          if (newRecord.status === 'success' && oldRecord.status !== 'success') {
            console.log('[Assisted Booking] Auto-book succeeded:', newRecord.id);

            // Prevent duplicate email processing
            if (sentEmailsRef.current.has(newRecord.id)) {
              console.log('[Assisted Booking] Email already queued for:', newRecord.id);
              return;
            }

            try {
              // Mark as being processed
              sentEmailsRef.current.add(newRecord.id);

              // Fetch full auto-book data with event and user profile
              const { data: autoBookData, error: autoBookError } = await supabase
                .from('auto_books')
                .select('*, event:events(*), profiles:profiles(name, email)')
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

              const autoBook = autoBookData as AutoBook;
              const event = autoBookData.event as Event;
              const userProfile = autoBookData.profiles as { name: string; email: string };

              // Show toast notification
              toast({
                title: "🎉 Tickets Available!",
                description: `Tickets for ${event.name} are available right now. Tap to book now!`,
                action: {
                  label: "Book Now",
                  onClick: () => {
                    const urlWithTracking = `${event.event_url}${event.event_url?.includes('?') ? '&' : '?'}source=bookit_ai&assisted_booking=true`;
                    window.open(urlWithTracking, '_blank', 'noopener,noreferrer');
                  },
                },
              });

              // Trigger assisted booking email
              await triggerAssistedBookingOnSuccess(autoBook, event, userProfile);

              console.log('[Assisted Booking] Email triggered for:', newRecord.id);
            } catch (error) {
              console.error('[Assisted Booking] Error processing success status:', error);
              // Remove from processed set on error so it can retry
              sentEmailsRef.current.delete(newRecord.id);
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
