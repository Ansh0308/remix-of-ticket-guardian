import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';

export const useEvents = () => {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  // Set up real-time subscription for event status changes
  useEffect(() => {
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          console.log('Event real-time update:', payload);
          // Use ref to avoid stale closure and dependency issues
          queryClientRef.current.invalidateQueries({ queryKey: ['events'] });
          
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            queryClientRef.current.invalidateQueries({ queryKey: ['event', payload.new.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array - subscription is stable

  return useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('date', { ascending: true });

      if (error) throw error;

      return (data || []).map(event => ({
        ...event,
        status: event.status as 'coming_soon' | 'live' | 'sold_out' | 'expired'
      }));
    },
  });
};

export const useEvent = (eventId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Single event real-time update:', payload);
          queryClientRef.current.invalidateQueries({ queryKey: ['event', eventId] });
          queryClientRef.current.invalidateQueries({ queryKey: ['events'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async (): Promise<Event | null> => {
      if (!eventId) return null;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        ...data,
        status: data.status as 'coming_soon' | 'live' | 'sold_out' | 'expired'
      };
    },
    enabled: !!eventId,
  });
};
