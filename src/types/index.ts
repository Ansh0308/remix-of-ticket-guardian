// BookIt.ai Type Definitions

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Event {
  id: string;
  name: string;
  category: 'Cricket' | 'Concert' | 'Comedy' | 'Festival';
  description: string;
  date: string;
  city: string;
  venue: string;
  ticketReleaseTime: string;
  status: 'coming_soon' | 'live';
  image: string;
  price: number;
  isHighDemand?: boolean;
}

export interface AutoBook {
  id: string;
  userId: string;
  eventId: string;
  quantity: number;
  seatType: 'General' | 'Premium' | 'VIP';
  maxBudget: number;
  status: 'active' | 'success' | 'failed';
  createdAt: string;
  event?: Event;
}

export interface ResaleTicket {
  id: string;
  sellerId: string;
  sellerName: string;
  eventId: string;
  price: number;
  status: 'available' | 'sold';
  createdAt: string;
  event?: Event;
}

export type SeatType = 'General' | 'Premium' | 'VIP';
