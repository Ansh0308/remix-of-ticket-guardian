import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AutoBook, SeatType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useAutoBooks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // Set up real-time subscription for auto_books changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('auto-books-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_books',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Auto-book real-time update:', payload);
          
          // Invalidate queries to refetch data
          const userId = userIdRef.current;
          queryClientRef.current.invalidateQueries({ queryKey: ['autoBooks', userId] });
          queryClientRef.current.invalidateQueries({ queryKey: ['autoBook', userId] });

          // Show toast notification for status changes
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const newRecord = payload.new as { status: string; event_id: string };
            const oldRecord = payload.old as { status: string };
            
            if (newRecord.status !== oldRecord.status) {
              if (newRecord.status === 'success') {
                toast({
                  title: "🎉 Booking Successful!",
                  description: "Your auto-book request was processed successfully. Check your bookings!",
                });
              } else if (newRecord.status === 'failed') {
                toast({
                  title: "❌ Booking Failed",
                  description: "Your auto-book request couldn't be completed. See details in My Bookings.",
                  variant: "destructive",
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return useQuery({
    queryKey: ['autoBooks', user?.id],
    queryFn: async (): Promise<AutoBook[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('auto_books')
        .select(`
          *,
          event:events(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        status: item.status as 'active' | 'success' | 'failed',
        seat_type: item.seat_type as SeatType,
        event: item.event ? {
          ...item.event,
          status: item.event.status as 'coming_soon' | 'live'
        } : undefined
      }));
    },
    enabled: !!user?.id,
  });
};

export const useExistingAutoBook = (eventId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  useEffect(() => {
    if (!user?.id || !eventId) return;

    const channel = supabase
      .channel(`auto-book-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auto_books',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Auto-book event real-time update:', payload);
          const userId = userIdRef.current;
          queryClientRef.current.invalidateQueries({ queryKey: ['autoBook', userId, eventId] });
          queryClientRef.current.invalidateQueries({ queryKey: ['autoBooks', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, eventId]);

  return useQuery({
    queryKey: ['autoBook', user?.id, eventId],
    queryFn: async (): Promise<AutoBook | null> => {
      if (!user?.id || !eventId) return null;

      const { data, error } = await supabase
        .from('auto_books')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        ...data,
        status: data.status as 'active' | 'success' | 'failed',
        seat_type: data.seat_type as SeatType
      };
    },
    enabled: !!user?.id && !!eventId,
  });
};

interface CreateAutoBookParams {
  eventId: string;
  quantity: number;
  seatType: SeatType;
  maxBudget: number;
}

export const useCreateAutoBook = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, quantity, seatType, maxBudget }: CreateAutoBookParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('auto_books')
        .insert({
          user_id: user.id,
          event_id: eventId,
          quantity,
          seat_type: seatType,
          max_budget: maxBudget,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You already have an auto-book for this event');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoBooks'] });
      queryClient.invalidateQueries({ queryKey: ['autoBook'] });
    },
  });
};

export const useCancelAutoBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (autoBookId: string) => {
      const { error } = await supabase
        .from('auto_books')
        .delete()
        .eq('id', autoBookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoBooks'] });
      queryClient.invalidateQueries({ queryKey: ['autoBook'] });
    },
  });
};
