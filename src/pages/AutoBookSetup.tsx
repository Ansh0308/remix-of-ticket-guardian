'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Minus, Plus, Check, Zap, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvent } from '@/hooks/useEvents';
import { useCreateAutoBook, useExistingAutoBook } from '@/hooks/useAutoBooks';
import { useAuth } from '@/context/AuthContext';
import { SeatType } from '@/types';
import { toast } from '@/hooks/use-toast';

const AutoBookSetup: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: existingAutoBook, isLoading: autoBookLoading } = useExistingAutoBook(eventId);
  const createAutoBook = useCreateAutoBook();

  const [quantity, setQuantity] = useState(2);
  const [seatType, setSeatType] = useState<SeatType>('premium');
  const [maxBudget, setMaxBudget] = useState(10000);
  const [isSuccess, setIsSuccess] = useState(false);

  const seatTypes: SeatType[] = ['general', 'premium', 'vip'];
  const seatPrices = { general: 1, premium: 1.5, vip: 2.5 };
  const seatLabels = { general: 'General', premium: 'Premium', vip: 'VIP' };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: `/autobook/${eventId}` } });
    }
  }, [authLoading, isAuthenticated, navigate, eventId]);

  if (authLoading || eventLoading || autoBookLoading) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-32 w-full mb-6 rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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

  if (event.status !== 'coming_soon') {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="premium-card p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Auto-Book Unavailable</h1>
            <p className="text-muted-foreground mb-6">
              Tickets for this event are already live. Auto-book is only available before ticket release.
            </p>
            <Link to={`/event/${event.id}`}>
              <Button>Back to Event</Button>
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (existingAutoBook) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="premium-card p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Already Set Up</h1>
            <p className="text-muted-foreground mb-6">
              You already have an active auto-book for this event. Check your bookings to see its status.
            </p>
            <div className="space-y-3">
              <Link to="/my-bookings">
                <Button className="w-full">View My Bookings</Button>
              </Link>
              <Link to={`/event/${event.id}`}>
                <Button variant="outline" className="w-full bg-transparent">Back to Event</Button>
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const estimatedTotal = Number(event.price) * quantity * seatPrices[seatType];
  const eventImage = event.image_url || `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80`;

  const handleSubmit = async () => {
    try {
      await createAutoBook.mutateAsync({
        eventId: event.id,
        quantity,
        seatType,
        maxBudget,
      });

      setIsSuccess(true);

      toast({
        title: "Auto-Book Activated!",
        description: `We'll check ticket availability for your ${quantity} ${seatLabels[seatType]} ticket(s) when they go live.`,
      });

      setTimeout(() => {
        navigate('/my-bookings');
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create auto-book",
        variant: "destructive",
      });
    }
  };

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            to={`/event/${event.id}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>
        </motion.div>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="premium-card p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-success" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Availability Check Activated!</h2>
              <p className="text-muted-foreground mb-6">
                We'll monitor ticket availability when they go live and confirm whether matching tickets are available.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to your bookings...
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Event Summary */}
              <div className="premium-card p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Set Up Auto-Book
                </h2>
                <div className="flex items-start gap-4">
                  <img
                    src={eventImage || "/placeholder.svg"}
                    alt={event.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{event.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {event.venue}, {event.city}
                    </div>
                  </div>
                </div>
              </div>

              {/* Setup Form */}
              <div className="glass-card p-6 md:p-8 space-y-8">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-4">
                    Number of Tickets
                  </label>
                  <div className="flex items-center justify-center gap-6">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-5 h-5" />
                    </motion.button>
                    <motion.span
                      key={quantity}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className="text-4xl font-bold text-foreground w-16 text-center"
                    >
                      {quantity}
                    </motion.span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.min(4, quantity + 1))}
                      disabled={quantity >= 4}
                      className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Maximum 4 tickets per booking
                  </p>
                </div>

                {/* Seat Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-4">
                    Seat Type
                  </label>
                  <div className="flex gap-3">
                    {seatTypes.map((type) => (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSeatType(type)}
                        className={`flex-1 py-4 px-4 rounded-xl font-medium transition-all ${
                          seatType === type
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {seatLabels[type]}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Max Budget */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-medium text-foreground">
                      Maximum Budget
                    </label>
                    <span className="text-2xl font-bold text-primary">
                      ₹{maxBudget.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={[maxBudget]}
                    onValueChange={(value) => setMaxBudget(value[0])}
                    min={1000}
                    max={100000}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>₹1,000</span>
                    <span>₹1,00,000</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Price</span>
                    <span className="text-foreground">₹{Number(event.price).toLocaleString()} × {quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Seat Type ({seatLabels[seatType]})</span>
                    <span className="text-foreground">×{seatPrices[seatType]}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between">
                    <span className="font-medium text-foreground">Estimated Total</span>
                    <span className="font-bold text-lg text-foreground">
                      ₹{estimatedTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={createAutoBook.isPending || maxBudget < estimatedTotal}
                  className="w-full btn-gradient pulse-glow flex items-center justify-center gap-2 text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createAutoBook.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Confirm Auto-Book
                    </>
                  )}
                </motion.button>

                {maxBudget < estimatedTotal && (
                  <p className="text-sm text-destructive text-center">
                    Your budget is below the estimated total. Please increase your budget.
                  </p>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  You will be charged only if booking is successful. Full refund if tickets are unavailable.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
};

export default AutoBookSetup;
