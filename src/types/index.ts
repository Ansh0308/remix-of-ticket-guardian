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
  status: 'coming_soon' | 'live' | 'sold_out' | 'expired';
  image_url: string | null;
  price: number;
  high_demand: boolean;
  platform_source: string;
  event_url: string | null;
  last_scraped_at: string | null;
  is_active: boolean;
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
  failure_reason: string | null;
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

export interface ScrapeHealth {
  id: string;
  platform_source: string;
  last_successful_scrape: string | null;
  last_attempt_at: string | null;
  events_count: number;
  status: 'healthy' | 'warning' | 'unhealthy';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type SeatType = 'general' | 'premium' | 'vip';

// Failure reason types for auto-book
export type AutoBookFailureReason = 
  | 'price_exceeded_budget'
  | 'tickets_sold_out_fast'
  | 'booking_window_missed'
  | 'platform_error'
  | 'quantity_unavailable'
  | 'network_timeout'
  | null;
