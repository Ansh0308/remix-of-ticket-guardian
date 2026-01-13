import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Zap } from 'lucide-react';
import { Event } from '@/types';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: Event;
  index?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, index = 0 }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Concert: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      Cricket: 'bg-green-500/10 text-green-600 border-green-500/20',
      Comedy: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      Festival: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    };
    return colors[category] || 'bg-primary/10 text-primary border-primary/20';
  };

  const eventImage = event.image_url || `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link to={`/event/${event.id}`}>
        <div className="premium-card overflow-hidden">
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src={eventImage}
              alt={event.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Status Badge */}
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge className={event.status === 'coming_soon' ? 'badge-coming-soon' : 'badge-live'}>
                {event.status === 'coming_soon' ? 'Coming Soon' : 'Live Now'}
              </Badge>
            </div>

            {/* High Demand Badge */}
            {event.high_demand && (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-3 right-3"
              >
                <Badge className="badge-high-demand flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  High Demand
                </Badge>
              </motion.div>
            )}

            {/* Category */}
            <div className="absolute bottom-3 left-3">
              <Badge className={getCategoryColor(event.category)}>
                {event.category}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {event.name}
            </h3>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{event.venue}, {event.city}</span>
              </div>
            </div>

            {/* Price */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Starting from</span>
                <p className="text-lg font-bold text-foreground">₹{Number(event.price).toLocaleString()}</p>
              </div>
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                whileHover={{ opacity: 1, x: 0 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-sm font-medium text-primary">View Details →</span>
              </motion.div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;
