import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AutoBook, SeatType } from '@/types';
import { useAuth } from '@/context/AuthContext';

export const useAutoBooks = () => {
  const { user } = useAuth();

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
