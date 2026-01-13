import { Event, AutoBook, ResaleTicket } from '@/types';

// Mock Events Data
export const mockEvents: Event[] = [
  {
    id: '1',
    name: 'Coldplay: Music of the Spheres World Tour',
    category: 'Concert',
    description: 'Experience the magic of Coldplay live with their spectacular Music of the Spheres World Tour. A breathtaking visual and musical journey featuring all their greatest hits.',
    date: '2025-03-15',
    city: 'Mumbai',
    venue: 'DY Patil Stadium',
    ticketReleaseTime: '2025-02-01T10:00:00',
    status: 'coming_soon',
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80',
    price: 4500,
    isHighDemand: true,
  },
  {
    id: '2',
    name: 'IPL 2025 Final',
    category: 'Cricket',
    description: 'The ultimate showdown of Indian Premier League 2025. Witness cricketing excellence as two titans clash for the championship trophy.',
    date: '2025-05-25',
    city: 'Ahmedabad',
    venue: 'Narendra Modi Stadium',
    ticketReleaseTime: '2025-05-01T09:00:00',
    status: 'coming_soon',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80',
    price: 8000,
    isHighDemand: true,
  },
  {
    id: '3',
    name: 'Zakir Khan Live: Tathastu',
    category: 'Comedy',
    description: 'Join India\'s favorite comedian Zakir Khan as he brings his new stand-up special "Tathastu" to life with his signature storytelling style.',
    date: '2025-02-20',
    city: 'Delhi',
    venue: 'Talkatora Stadium',
    ticketReleaseTime: '2025-01-10T12:00:00',
    status: 'live',
    image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80',
    price: 1500,
    isHighDemand: false,
  },
  {
    id: '4',
    name: 'Sunburn Festival 2025',
    category: 'Festival',
    description: 'Asia\'s biggest electronic dance music festival returns with an incredible lineup of international and homegrown artists.',
    date: '2025-12-28',
    city: 'Goa',
    venue: 'Vagator Beach',
    ticketReleaseTime: '2025-09-01T10:00:00',
    status: 'coming_soon',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
    price: 6500,
    isHighDemand: true,
  },
  {
    id: '5',
    name: 'Arijit Singh: Live in Concert',
    category: 'Concert',
    description: 'The voice of a generation performs his most beloved songs in an intimate evening of soulful music and unforgettable memories.',
    date: '2025-04-10',
    city: 'Bangalore',
    venue: 'Palace Grounds',
    ticketReleaseTime: '2025-03-01T10:00:00',
    status: 'coming_soon',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    price: 3500,
    isHighDemand: true,
  },
  {
    id: '6',
    name: 'India vs Australia T20',
    category: 'Cricket',
    description: 'A thrilling T20 encounter between arch-rivals India and Australia. Don\'t miss this action-packed match!',
    date: '2025-02-28',
    city: 'Chennai',
    venue: 'MA Chidambaram Stadium',
    ticketReleaseTime: '2025-01-15T09:00:00',
    status: 'live',
    image: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=800&q=80',
    price: 2500,
    isHighDemand: false,
  },
];

// Mock Auto-Books
export const mockAutoBooks: AutoBook[] = [
  {
    id: 'ab1',
    userId: 'user1',
    eventId: '1',
    quantity: 2,
    seatType: 'Premium',
    maxBudget: 12000,
    status: 'active',
    createdAt: '2025-01-10T14:30:00',
  },
  {
    id: 'ab2',
    userId: 'user1',
    eventId: '2',
    quantity: 4,
    seatType: 'VIP',
    maxBudget: 40000,
    status: 'success',
    createdAt: '2025-01-05T10:00:00',
  },
  {
    id: 'ab3',
    userId: 'user1',
    eventId: '4',
    quantity: 2,
    seatType: 'General',
    maxBudget: 15000,
    status: 'failed',
    createdAt: '2025-01-08T16:45:00',
  },
];

// Mock Resale Tickets
export const mockResaleTickets: ResaleTicket[] = [
  {
    id: 'rt1',
    sellerId: 'user2',
    sellerName: 'Rahul M.',
    eventId: '3',
    price: 1800,
    status: 'available',
    createdAt: '2025-01-12T09:00:00',
  },
  {
    id: 'rt2',
    sellerId: 'user3',
    sellerName: 'Priya S.',
    eventId: '6',
    price: 3000,
    status: 'available',
    createdAt: '2025-01-11T15:30:00',
  },
  {
    id: 'rt3',
    sellerId: 'user4',
    sellerName: 'Amit K.',
    eventId: '3',
    price: 1600,
    status: 'sold',
    createdAt: '2025-01-10T11:00:00',
  },
];

// Helper functions
export const getEventById = (id: string): Event | undefined => {
  return mockEvents.find(event => event.id === id);
};

export const getAutoBooksByUserId = (userId: string): AutoBook[] => {
  return mockAutoBooks.filter(ab => ab.userId === userId).map(ab => ({
    ...ab,
    event: getEventById(ab.eventId),
  }));
};

export const getResaleTicketsWithEvents = (): ResaleTicket[] => {
  return mockResaleTickets.map(rt => ({
    ...rt,
    event: getEventById(rt.eventId),
  }));
};
