import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ResaleTicket } from '@/types';
import { useAuth } from '@/context/AuthContext';

export const useResaleTickets = () => {
  return useQuery({
    queryKey: ['resaleTickets'],
    queryFn: async (): Promise<ResaleTicket[]> => {
      const { data, error } = await supabase
        .from('resale_tickets')
        .select(`
          *,
          event:events(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch seller profiles separately
      const sellerIds = [...new Set((data || []).map(t => t.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', sellerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (data || []).map(item => ({
        ...item,
        status: item.status as 'available' | 'sold',
        event: item.event ? {
          ...item.event,
          status: item.event.status as 'coming_soon' | 'live'
        } : undefined,
        profiles: profileMap.get(item.seller_id) as { name: string; email: string } | undefined
      }));
    },
  });
};

interface CreateResaleTicketParams {
  eventId: string;
  price: number;
  proofUrl?: string;
}

export const useCreateResaleTicket = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, price, proofUrl }: CreateResaleTicketParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('resale_tickets')
        .insert({
          seller_id: user.id,
          event_id: eventId,
          price,
          proof_url: proofUrl,
          status: 'available',
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resaleTickets'] });
    },
  });
};

export const useBuyResaleTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('resale_tickets')
        .update({ status: 'sold' })
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resaleTickets'] });
    },
  });
};
