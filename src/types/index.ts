// BookIt.ai Type Definitions

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface Event {
  id: string;
  name: string;
  category: string;
  description: string | null;
  date: string;
  city: string;
  venue: string;
  ticket_release_time: string;
  status: 'coming_soon' | 'live';
  image_url: string | null;
  price: number;
  high_demand: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoBook {
  id: string;
  user_id: string;
  event_id: string;
  quantity: number;
  seat_type: 'general' | 'premium' | 'vip';
  max_budget: number;
  status: 'active' | 'success' | 'failed';
  created_at: string;
  updated_at: string;
  event?: Event;
  profiles?: { name: string; email: string };
}

export interface ResaleTicket {
  id: string;
  seller_id: string;
  event_id: string;
  price: number;
  status: 'available' | 'sold';
  proof_url: string | null;
  created_at: string;
  updated_at: string;
  event?: Event;
  profiles?: { name: string; email: string };
}

export type SeatType = 'general' | 'premium' | 'vip';
