/**
 * Maps deterministic failure reasons to user-friendly, honest messages
 * This replaces all random-based failure language with truthful availability feedback
 */

type FailureReason = 
  | 'price_exceeded_budget'
  | 'tickets_sold_out_fast'
  | 'booking_window_missed'
  | 'platform_error'
  | 'quantity_unavailable'
  | 'network_timeout'
  | null;

interface FailureMessage {
  title: string;
  description: string;
  icon: 'alert' | 'price' | 'clock' | 'error' | 'tickets';
}

export function getFailureMessage(failureReason: FailureReason): FailureMessage | null {
  if (!failureReason) return null;

  const messages: Record<Exclude<FailureReason, null>, FailureMessage> = {
    price_exceeded_budget: {
      title: 'Budget Limit Exceeded',
      description: 'The available ticket price exceeded your maximum budget. Increase your budget limit to book these tickets.',
      icon: 'price',
    },
    tickets_sold_out_fast: {
      title: 'Sold Out',
      description: 'Tickets sold out before becoming available for your preferences.',
      icon: 'tickets',
    },
    booking_window_missed: {
      title: 'Booking Window Closed',
      description: 'The booking window was too short to detect availability within your preferences.',
      icon: 'clock',
    },
    platform_error: {
      title: 'Platform Error',
      description: 'The booking platform returned an error. This may be temporary. Try again later or book manually.',
      icon: 'error',
    },
    quantity_unavailable: {
      title: 'Insufficient Quantity',
      description: 'The requested quantity of tickets was not available for your seat preference.',
      icon: 'tickets',
    },
    network_timeout: {
      title: 'Network Timeout',
      description: 'Unable to check availability due to a connection error. Please try again.',
      icon: 'error',
    },
  };

  return messages[failureReason] || null;
}

export function getSuccessMessage(): FailureMessage {
  return {
    title: 'Availability Confirmed',
    description: 'Tickets matching your preferences were available at release time.',
    icon: 'alert',
  };
}
