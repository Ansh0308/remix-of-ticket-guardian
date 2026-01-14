import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, SlidersHorizontal, Sparkles, Calendar, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import EventCard from '@/components/events/EventCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useEvents();

  const categories = ['All', 'Concert', 'Cricket', 'Comedy', 'Festival', 'Theatre', 'Workshop', 'Sports'];
  const statuses = ['All', 'Coming Soon', 'Live'];

  const handleScrapeEvents = async () => {
    setIsScraping(true);
    try {
      toast({
        title: "Scraping Events",
        description: "Fetching real events from BookMyShow, Insider.in & more...",
      });

      const { data, error } = await supabase.functions.invoke('scrape-events');

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Events Updated!",
          description: `Successfully fetched ${data.eventsCount} real events from India`,
        });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } else {
        throw new Error(data?.error || 'Failed to scrape events');
      }
    } catch (error: any) {
      console.error('Error scraping events:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to scrape events",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || selectedCategory === 'All' || event.category === selectedCategory;
    
    const matchesStatus = !selectedStatus || selectedStatus === 'All' || 
      (selectedStatus === 'Coming Soon' && event.status === 'coming_soon') ||
      (selectedStatus === 'Live' && event.status === 'live');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const liveCount = events.filter(e => e.status === 'live').length;
  const comingSoonCount = events.filter(e => e.status === 'coming_soon').length;
  const highDemandCount = events.filter(e => e.high_demand).length;

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Discover Events</span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                Explore <span className="gradient-text">Events</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Discover upcoming events and set up auto-booking before tickets go live
              </p>
              <Button
                onClick={handleScrapeEvents}
                disabled={isScraping}
                className="mt-4 gap-2"
                variant="outline"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scraping Events...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Fetch Real Events from India
                  </>
                )}
              </Button>
            </div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3"
            >
              {[
                { icon: TrendingUp, label: 'Live', value: liveCount, color: 'destructive' },
                { icon: Calendar, label: 'Coming', value: comingSoonCount, color: 'success' },
                { icon: Sparkles, label: 'Hot', value: highDemandCount, color: 'warning' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ y: -2, scale: 1.02 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-${stat.color}/10 border border-${stat.color}/20`}
                >
                  <stat.icon className={`w-4 h-4 text-${stat.color}`} />
                  <span className="text-sm font-medium">
                    <span className="text-foreground">{stat.value}</span>
                    <span className="text-muted-foreground ml-1">{stat.label}</span>
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <motion.div
              className="absolute left-4 top-1/2 -translate-y-1/2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </motion.div>
            <Input
              type="text"
              placeholder="Search events, venues, or cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-card/80 backdrop-blur-sm border-border/50 focus:border-primary input-glow text-lg rounded-xl"
            />
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                ✕
              </motion.button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-6">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 mr-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Category:</span>
              </div>
              {categories.map((category) => (
                <motion.button
                  key={category}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(category === 'All' ? null : category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    (category === 'All' && !selectedCategory) || selectedCategory === category
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'bg-secondary/80 text-secondary-foreground hover:bg-secondary border border-border/50'
                  }`}
                >
                  {category}
                </motion.button>
              ))}
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 mr-2">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
              </div>
              {statuses.map((status) => (
                <motion.button
                  key={status}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedStatus(status === 'All' ? null : status)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    (status === 'All' && !selectedStatus) || selectedStatus === status
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'bg-secondary/80 text-secondary-foreground hover:bg-secondary border border-border/50'
                  }`}
                >
                  {status === 'Live' && (
                    <span className="w-2 h-2 rounded-full bg-current mr-2 inline-block animate-pulse" />
                  )}
                  {status}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 flex items-center justify-between"
        >
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredEvents.length}</span> events
          </p>
          {(selectedCategory || selectedStatus || searchQuery) && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => {
                setSelectedCategory(null);
                setSelectedStatus(null);
                setSearchQuery('');
              }}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Clear all filters
            </motion.button>
          )}
        </motion.div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="premium-card overflow-hidden"
              >
                <Skeleton className="h-52 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="pt-4 border-t border-border/50">
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredEvents.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredEvents.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-20"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-secondary/80 flex items-center justify-center"
                >
                  <Search className="w-10 h-10 text-muted-foreground" />
                </motion.div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No events found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your search or filters</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedStatus(null);
                    setSearchQuery('');
                  }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
                >
                  Clear all filters
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </PageLayout>
  );
};

export default Home;
