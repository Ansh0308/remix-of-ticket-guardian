import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Ticket, Zap, Trash2, Play, Loader2 } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import StatusBadge from '@/components/events/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAutoBooks, useCancelAutoBook } from '@/hooks/useAutoBooks';
import { useAuth } from '@/context/AuthContext';
import { AutoBook } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
const MyBookings: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: allBookings = [], isLoading: bookingsLoading } = useAutoBooks();
  const cancelAutoBook = useCancelAutoBook();

  const handleProcessAutoBooks = async () => {
    // Get all active bookings event IDs
    const activeBookings = allBookings.filter(b => b.status === 'active');
    if (activeBookings.length === 0) {
      toast({
        title: "No Active Auto-Books",
        description: "You don't have any active auto-book requests to process.",
        variant: "destructive",
      });
      return;
    }

    const eventIds = [...new Set(activeBookings.map(b => b.event_id))];
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-auto-books', {
        body: { testMode: true, eventIds }
      });

      if (error) throw error;

      // Refresh the bookings list
      await queryClient.invalidateQueries({ queryKey: ['autoBooks'] });

      toast({
        title: "Processing Complete!",
        description: `Processed ${data.processed} auto-book(s). Success: ${data.results?.success || 0}, Failed: ${data.results?.failed || 0}`,
      });

      // Show details for each booking
      data.results?.details?.forEach((detail: { eventName: string; status: string; reason?: string }) => {
        toast({
          title: detail.eventName,
          description: `${detail.status.toUpperCase()}: ${detail.reason}`,
          variant: detail.status === 'success' ? 'default' : 'destructive',
        });
      });
    } catch (error) {
      console.error('Error processing auto-books:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to process auto-books. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-12 w-full mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="premium-card p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your bookings
            </p>
            <Link to="/login">
              <Button className="bg-primary hover:bg-primary/90">Sign In</Button>
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  const activeBookings = allBookings.filter(b => b.status === 'active');
  const successfulBookings = allBookings.filter(b => b.status === 'success');
  const failedBookings = allBookings.filter(b => b.status === 'failed');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
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

  const seatLabels = { general: 'General', premium: 'Premium', vip: 'VIP' };

  const handleCancel = async (bookingId: string) => {
    try {
      await cancelAutoBook.mutateAsync(bookingId);
      toast({
        title: "Auto-book cancelled",
        description: "Your auto-book request has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel auto-book",
        variant: "destructive",
      });
    }
  };

  const BookingCard: React.FC<{ booking: AutoBook; index: number }> = ({ booking, index }) => {
    const eventImage = booking.event?.image_url || `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80`;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="premium-card p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Event Image */}
          {booking.event && (
            <img
              src={eventImage}
              alt={booking.event.name}
              className="w-full sm:w-24 h-32 sm:h-24 rounded-lg object-cover"
            />
          )}

          {/* Booking Details */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground text-lg">
                  {booking.event?.name || 'Unknown Event'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={booking.status} size="sm" />
                </div>
              </div>
              {booking.status === 'active' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancelAutoBook.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {booking.event && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(booking.event.date)}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {booking.event.city}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Seat Type</p>
                <p className="font-medium text-foreground">{seatLabels[booking.seat_type]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantity</p>
                <p className="font-medium text-foreground">{booking.quantity} tickets</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max Budget</p>
                <p className="font-medium text-foreground">₹{Number(booking.max_budget).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium text-foreground">
                  {formatDate(booking.created_at)} at {formatTime(booking.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const EmptyState: React.FC<{ type: string }> = ({ type }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
        <Ticket className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No {type} Bookings</h3>
      <p className="text-muted-foreground mb-6">
        {type === 'active' 
          ? "You don't have any active auto-book requests"
          : type === 'successful'
          ? "Your successful bookings will appear here"
          : "No failed booking attempts"}
      </p>
      {type === 'active' && (
        <Link to="/home">
          <Button className="bg-primary hover:bg-primary/90">
            <Zap className="w-4 h-4 mr-2" />
            Explore Events
          </Button>
        </Link>
      )}
    </motion.div>
  );

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              My Bookings
            </h1>
            <p className="text-muted-foreground">
              Track your auto-book requests and booking history
            </p>
          </div>
          
          {activeBookings.length > 0 && (
            <Button
              onClick={handleProcessAutoBooks}
              disabled={isProcessing}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Process Auto-Books Now
                </>
              )}
            </Button>
          )}
        </motion.div>

        {bookingsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-secondary p-1 rounded-xl">
              <TabsTrigger 
                value="active" 
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Active
                {activeBookings.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {activeBookings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="successful"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Successful
                {successfulBookings.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-success text-success-foreground">
                    {successfulBookings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="failed"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                Failed
                {failedBookings.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                    {failedBookings.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeBookings.length > 0 ? (
                activeBookings.map((booking, index) => (
                  <BookingCard key={booking.id} booking={booking} index={index} />
                ))
              ) : (
                <EmptyState type="active" />
              )}
            </TabsContent>

            <TabsContent value="successful" className="space-y-4">
              {successfulBookings.length > 0 ? (
                successfulBookings.map((booking, index) => (
                  <BookingCard key={booking.id} booking={booking} index={index} />
                ))
              ) : (
                <EmptyState type="successful" />
              )}
            </TabsContent>

            <TabsContent value="failed" className="space-y-4">
              {failedBookings.length > 0 ? (
                failedBookings.map((booking, index) => (
                  <BookingCard key={booking.id} booking={booking} index={index} />
                ))
              ) : (
                <EmptyState type="failed" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageLayout>
  );
};

export default MyBookings;
