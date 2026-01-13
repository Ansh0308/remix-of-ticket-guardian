import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Check, Ticket, ArrowLeft } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvents } from '@/hooks/useEvents';
import { useCreateResaleTicket } from '@/hooks/useResaleTickets';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

const SellTicket: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const createResaleTicket = useCreateResaleTicket();
  
  const [selectedEvent, setSelectedEvent] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (authLoading) {
    return (
      <PageLayout>
        <div className="max-w-xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-96 w-full rounded-2xl" />
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
              Please sign in to sell tickets
            </p>
            <Link to="/login">
              <Button className="bg-primary hover:bg-primary/90">Sign In</Button>
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEvent || !price) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createResaleTicket.mutateAsync({
        eventId: selectedEvent,
        price: parseFloat(price),
      });
      
      setIsSuccess(true);

      toast({
        title: "Ticket Listed!",
        description: "Your ticket is now available in the marketplace.",
      });

      setTimeout(() => {
        navigate('/resale');
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to list ticket. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageLayout>
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            to="/resale"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
        </motion.div>

        {isSuccess ? (
          <motion.div
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
            <h2 className="text-2xl font-bold text-foreground mb-2">Ticket Listed!</h2>
            <p className="text-muted-foreground mb-6">
              Your ticket is now available in the resale marketplace.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to marketplace...
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Sell Your Ticket
              </h1>
              <p className="text-muted-foreground">
                List your ticket in our trusted marketplace
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-6">
              {/* Event Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Select Event *
                </label>
                {eventsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger className="h-12 bg-background">
                      <SelectValue placeholder="Choose an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Asking Price (₹) *
                </label>
                <Input
                  type="number"
                  placeholder="Enter your price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-12 bg-background input-glow"
                  min="100"
                />
                <p className="text-xs text-muted-foreground">
                  Set a fair price. Overpriced tickets are less likely to sell.
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Ticket Proof (Optional)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragOver
                      ? 'border-primary bg-primary/5'
                      : file
                      ? 'border-success bg-success/5'
                      : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                  }`}
                >
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*,.pdf"
                  />
                  
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-success">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">{file.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drag and drop or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, PNG, or JPG (max 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={createResaleTicket.isPending || !selectedEvent || !price}
                className="w-full btn-gradient flex items-center justify-center gap-2 text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createResaleTicket.isPending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Listing...
                  </>
                ) : (
                  <>
                    <Ticket className="w-5 h-5" />
                    List Ticket for Sale
                  </>
                )}
              </motion.button>

              <p className="text-xs text-muted-foreground text-center">
                By listing, you agree to our marketplace terms. 5% service fee applies on successful sale.
              </p>
            </form>
          </motion.div>
        )}
      </div>
    </PageLayout>
  );
};

export default SellTicket;
