import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Calendar, MapPin, User, Check } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import StatusBadge from '@/components/events/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useResaleTickets, useBuyResaleTicket } from '@/hooks/useResaleTickets';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

const Resale: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { data: resaleTickets = [], isLoading } = useResaleTickets();
  const buyTicket = useBuyResaleTicket();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleBuy = async (ticketId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase tickets",
        variant: "destructive",
      });
      return;
    }

    try {
      await buyTicket.mutateAsync(ticketId);
      toast({
        title: "Purchase Successful!",
        description: "Your ticket has been reserved. Check your email for details.",
      });
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "Could not complete the purchase. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Resale Marketplace
          </h1>
          <p className="text-muted-foreground">
            Buy verified tickets from other users at fair prices
          </p>
        </motion.div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="premium-card overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : resaleTickets.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resaleTickets.map((ticket, index) => {
              const eventImage = ticket.event?.image_url || `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80`;
              const sellerName = ticket.profiles?.name || 'Anonymous';

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="premium-card overflow-hidden"
                >
                  {/* Event Image */}
                  {ticket.event && (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={eventImage}
                        alt={ticket.event.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-semibold text-lg line-clamp-1">
                          {ticket.event.name}
                        </h3>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5 space-y-4">
                    {/* Event Details */}
                    {ticket.event && (
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(ticket.event.date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {ticket.event.city}
                        </div>
                      </div>
                    )}

                    {/* Seller & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Sold by</span>
                        <span className="font-medium text-foreground">{sellerName}</span>
                      </div>
                      <StatusBadge status={ticket.status} size="sm" />
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-2xl font-bold text-foreground">
                          ₹{Number(ticket.price).toLocaleString()}
                        </p>
                      </div>

                      {ticket.status === 'available' ? (
                        buyTicket.isPending ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-10 h-10 rounded-full bg-success flex items-center justify-center"
                          >
                            <Check className="w-5 h-5 text-success-foreground" />
                          </motion.div>
                        ) : (
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              onClick={() => handleBuy(ticket.id)}
                              className="bg-primary hover:bg-primary/90"
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Buy Now
                            </Button>
                          </motion.div>
                        )
                      ) : (
                        <Button disabled variant="secondary">
                          Sold Out
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Tickets Available</h3>
            <p className="text-muted-foreground">Check back later for resale listings</p>
          </motion.div>
        )}
      </div>
    </PageLayout>
  );
};

export default Resale;
