import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Zap, ArrowLeft, ShoppingCart, AlertCircle } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import StatusBadge from '@/components/events/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getEventById } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const event = getEventById(id || '');

  if (!event) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Event not found</h1>
          <Link to="/home">
            <Button>Back to Events</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isAutoBookAvailable = event.status === 'coming_soon';

  const handleAutoBookClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/autobook/${event.id}` } });
    } else {
      navigate(`/autobook/${event.id}`);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            to="/home"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Event Image */}
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={event.image}
                alt={event.name}
                className="w-full h-64 md:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex gap-2">
                <StatusBadge status={event.status} size="lg" animated />
                {event.isHighDemand && (
                  <Badge className="badge-high-demand flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    High Demand
                  </Badge>
                )}
              </div>
            </div>

            {/* Event Info */}
            <div className="premium-card p-6 md:p-8">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                {event.category}
              </Badge>
              
              <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                {event.name}
              </h1>

              <p className="text-muted-foreground text-lg mb-6">
                {event.description}
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium text-foreground">{formatDate(event.date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Venue</p>
                    <p className="font-medium text-foreground">{event.venue}, {event.city}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 sm:col-span-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Release</p>
                    <p className="font-medium text-foreground">
                      {formatDate(event.ticketReleaseTime)} at {formatTime(event.ticketReleaseTime)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Card - Sticky */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:sticky lg:top-24 lg:self-start"
          >
            <div className="glass-card p-6 md:p-8 space-y-6">
              {/* Price */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Starting from</p>
                <p className="text-3xl font-bold text-foreground">
                  ₹{event.price.toLocaleString()}
                </p>
              </div>

              {/* Status */}
              <div className="p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Ticket Status</span>
                  <StatusBadge status={event.status} animated />
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.status === 'coming_soon' 
                    ? `Releases on ${formatDate(event.ticketReleaseTime)}`
                    : 'Tickets are available now'}
                </p>
              </div>

              {/* Auto-Book Button */}
              <div className="space-y-3">
                {isAutoBookAvailable ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAutoBookClick}
                    className="w-full btn-gradient pulse-glow flex items-center justify-center gap-2 text-lg py-4"
                  >
                    <Zap className="w-5 h-5" />
                    Enable Auto-Book
                  </motion.button>
                ) : (
                  <div className="space-y-2">
                    <Button disabled className="w-full h-14 text-lg" variant="secondary">
                      <Zap className="w-5 h-5 mr-2 opacity-50" />
                      Auto-Book Unavailable
                    </Button>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <p className="text-xs text-warning">
                        Auto-book is only available before ticket release. Tickets are now live.
                      </p>
                    </div>
                  </div>
                )}

                {/* View Resale */}
                <Link to="/resale" className="block">
                  <Button variant="outline" className="w-full h-12">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    View Resale Tickets
                  </Button>
                </Link>
              </div>

              {/* Info */}
              {isAutoBookAvailable && (
                <p className="text-xs text-muted-foreground text-center">
                  Set up auto-booking and we'll secure your tickets the moment they go live
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
};

export default EventDetail;
