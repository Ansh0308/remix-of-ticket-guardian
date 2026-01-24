'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AutoBook, Event } from '@/types';

interface AssistedBookingCTAProps {
  booking: AutoBook;
  event?: Event;
  size?: 'sm' | 'md' | 'lg';
}

const AssistedBookingCTA: React.FC<AssistedBookingCTAProps> = ({ 
  booking, 
  event,
  size = 'md'
}) => {
  // Only show for successful bookings
  if (booking.status !== 'success') {
    return null;
  }

  const eventUrl = event?.event_url;
  if (!eventUrl) {
    return null;
  }

  // Build URL with tracking parameters
  const urlWithTracking = `${eventUrl}${eventUrl.includes('?') ? '&' : '?'}source=bookit_ai&assisted_booking=true`;

  const handleBookNow = () => {
    // Open in new tab/window without any intermediate logic
    window.open(urlWithTracking, '_blank', 'noopener,noreferrer');
  };

  const sizeConfig = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Button
        onClick={handleBookNow}
        className={`bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg ${sizeConfig[size]} inline-flex items-center justify-center font-semibold`}
      >
        <Zap className={iconSizes[size]} />
        Book Now on Official Platform
        <ExternalLink className={`${iconSizes[size]} ml-1`} />
      </Button>
    </motion.div>
  );
};

export default AssistedBookingCTA;
