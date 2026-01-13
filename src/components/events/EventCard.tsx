import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Zap, ArrowRight } from 'lucide-react';
import { Event } from '@/types';
import { Badge } from '@/components/ui/badge';
import GlowingCard from '@/components/ui/GlowingCard';

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
    const colors: Record<string, { bg: string; text: string; glow: string }> = {
      Concert: { bg: 'bg-purple-500/10', text: 'text-purple-500', glow: '#a855f7' },
      Cricket: { bg: 'bg-green-500/10', text: 'text-green-500', glow: '#22c55e' },
      Comedy: { bg: 'bg-amber-500/10', text: 'text-amber-500', glow: '#f59e0b' },
      Festival: { bg: 'bg-pink-500/10', text: 'text-pink-500', glow: '#ec4899' },
    };
    return colors[category] || { bg: 'bg-primary/10', text: 'text-primary', glow: '#6366f1' };
  };

  const categoryStyle = getCategoryColor(event.category);
  const eventImage = event.image_url || `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <Link to={`/event/${event.id}`}>
        <GlowingCard glowColor={categoryStyle.glow} className="overflow-hidden">
          {/* Image */}
          <div className="relative h-52 overflow-hidden">
            <motion.img
              src={eventImage}
              alt={event.name}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.6 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Status Badge */}
            <motion.div 
              className="absolute top-4 left-4 flex gap-2"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Badge 
                className={`${
                  event.status === 'coming_soon' 
                    ? 'bg-success/90 text-white border-success/50' 
                    : 'bg-destructive/90 text-white border-destructive/50'
                } backdrop-blur-sm px-3 py-1.5 text-xs font-semibold`}
              >
                <motion.span
                  animate={event.status === 'live' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="flex items-center gap-1.5"
                >
                  {event.status === 'live' && (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                  {event.status === 'coming_soon' ? 'Coming Soon' : 'Live Now'}
                </motion.span>
              </Badge>
            </motion.div>

            {/* High Demand Badge */}
            {event.high_demand && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="absolute top-4 right-4"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      '0 0 0 0 rgba(245, 158, 11, 0.4)',
                      '0 0 0 8px rgba(245, 158, 11, 0)',
                      '0 0 0 0 rgba(245, 158, 11, 0)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/90 text-white text-xs font-semibold backdrop-blur-sm"
                >
                  <Zap className="w-3 h-3" />
                  High Demand
                </motion.div>
              </motion.div>
            )}

            {/* Category - Bottom Left */}
            <motion.div 
              className="absolute bottom-4 left-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <Badge className={`${categoryStyle.bg} ${categoryStyle.text} border border-current/20 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold`}>
                {event.category}
              </Badge>
            </motion.div>

            {/* Price - Bottom Right */}
            <motion.div 
              className="absolute bottom-4 right-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-xs text-white/70">From </span>
                <span className="text-lg font-bold text-white">₹{Number(event.price).toLocaleString()}</span>
              </div>
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="font-semibold text-lg text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300">
              {event.name}
            </h3>

            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground mb-4">
              <motion.div 
                className="flex items-center gap-2.5"
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span>{formatDate(event.date)}</span>
              </motion.div>
              <motion.div 
                className="flex items-center gap-2.5"
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <span className="truncate">{event.venue}, {event.city}</span>
              </motion.div>
            </div>

            {/* CTA */}
            <motion.div 
              className="flex items-center justify-between pt-4 border-t border-border/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <span className="text-sm font-medium text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                View Details
                <ArrowRight className="w-4 h-4" />
              </span>
              {event.status === 'coming_soon' && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                  Auto-book available
                </span>
              )}
            </motion.div>
          </div>
        </GlowingCard>
      </Link>
    </motion.div>
  );
};

export default EventCard;
