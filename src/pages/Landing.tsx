import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Calendar, Shield, ArrowRight, Ticket, Sparkles, Star, Users, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import FloatingTicket3D from '@/components/ui/FloatingTicket3D';
import GlowingCard from '@/components/ui/GlowingCard';
import CountingNumber from '@/components/ui/CountingNumber';
import MagneticButton from '@/components/ui/MagneticButton';

const Landing: React.FC = () => {
  const features = [
    {
      icon: Calendar,
      title: 'Never Miss a Release',
      description: 'Set up auto-booking before tickets go live. We do the waiting, you do the celebrating.',
      color: '#6366f1',
    },
    {
      icon: Zap,
      title: 'Lightning Fast Booking',
      description: 'Our AI system books tickets the instant they release. No more sold-out disappointments.',
      color: '#14b8a6',
    },
    {
      icon: Shield,
      title: 'Trusted Resale Market',
      description: 'Buy and sell tickets safely in our verified marketplace. No scams, no worries.',
      color: '#8b5cf6',
    },
  ];

  const stats = [
    { value: 50000, label: 'Tickets Booked', suffix: '+' },
    { value: 99, label: 'Success Rate', suffix: '%' },
    { value: 10000, label: 'Happy Users', suffix: '+' },
    { value: 24, label: 'Hour Support', prefix: '', suffix: '/7' },
  ];

  const testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Concert Enthusiast',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
      text: 'Finally got Taylor Swift tickets! BookIt.ai booked them while I was still sleeping. Absolute game-changer!',
    },
    {
      name: 'Rahul Verma',
      role: 'Cricket Fan',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
      text: 'IPL finals tickets are impossible to get. Not anymore! Auto-book worked like magic.',
    },
    {
      name: 'Ananya Patel',
      role: 'Festival Lover',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
      text: 'The AI prediction feature is incredible. Got premium seats at 30% below market price!',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatedBackground />
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-center lg:text-left"
            >
              {/* Badge */}
              <motion.div variants={itemVariants}>
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 cursor-default"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                  </motion.div>
                  <span className="text-sm font-medium text-primary">AI-Powered Ticket Booking</span>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-success"
                  />
                </motion.span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={itemVariants}
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
              >
                Never Miss a
                <br />
                <span className="relative">
                  <span className="gradient-text">Ticket Again.</span>
                  <motion.svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 300 12"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                  >
                    <motion.path
                      d="M2 10 Q 150 -5 298 10"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.8 }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                variants={itemVariants}
                className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0"
              >
                BookIt.ai automatically secures high-demand event tickets the moment they go live. 
                Set it up once, and we handle the rest.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link to="/home">
                  <MagneticButton className="btn-gradient pulse-glow flex items-center gap-2 text-lg px-8 py-4 w-full sm:w-auto justify-center">
                    <Zap className="w-5 h-5" />
                    Enable Auto-Book
                    <ArrowRight className="w-5 h-5" />
                  </MagneticButton>
                </Link>
                <Link to="/home">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" size="lg" className="h-14 px-8 text-lg w-full sm:w-auto border-2 hover:bg-secondary/50">
                      Explore Events
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                variants={itemVariants}
                className="mt-12 flex flex-wrap justify-center lg:justify-start gap-6 text-sm text-muted-foreground"
              >
                {[
                  { icon: Ticket, text: '50,000+ Tickets Booked' },
                  { icon: Shield, text: '100% Secure' },
                  { icon: Zap, text: '99.9% Success Rate' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary/50 backdrop-blur-sm"
                  >
                    <item.icon className="w-4 h-4 text-primary" />
                    <span>{item.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Column - 3D Ticket */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block h-[500px]"
            >
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
                  />
                </div>
              }>
                <FloatingTicket3D className="w-full h-full" />
              </Suspense>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{ duration: 2, delay: 1, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-8 h-8 text-muted-foreground" />
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 md:p-12 rounded-3xl"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                    <CountingNumber
                      end={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      duration={2.5}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6"
            >
              <Star className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">How It Works</span>
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Booking Made{' '}
              <span className="gradient-text">Effortless</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to never miss a high-demand event again
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <GlowingCard
                key={index}
                glowColor={feature.color}
                className="p-8"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="text-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center relative"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      animate={{
                        boxShadow: [
                          `0 0 0 0 ${feature.color}30`,
                          `0 0 0 10px ${feature.color}00`,
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <feature.icon className="w-8 h-8" style={{ color: feature.color }} />
                  </motion.div>
                  <div className="text-sm font-medium text-primary mb-3">Step {index + 1}</div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              </GlowingCard>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 relative z-10 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/20 mb-6"
            >
              <Users className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-warning">Testimonials</span>
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Loved by <span className="gradient-text">Thousands</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join the community of happy ticket buyers who never miss out
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                whileHover={{ y: -8 }}
                className="glass-card p-6 relative overflow-hidden"
              >
                <motion.div
                  className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                
                {/* Stars */}
                <div className="flex gap-1 mb-4 relative z-10">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                    >
                      <Star className="w-4 h-4 fill-warning text-warning" />
                    </motion.div>
                  ))}
                </div>

                <p className="text-foreground mb-6 relative z-10">"{testimonial.text}"</p>

                <div className="flex items-center gap-3 relative z-10">
                  <motion.img
                    whileHover={{ scale: 1.1 }}
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                  />
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-accent" />
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                ],
              }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            
            <div className="relative p-12 md:p-16 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Clock className="w-12 h-12 mx-auto mb-6 text-white/80" />
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                  Join thousands of users who never miss their favorite events. 
                  Sign up now and set up your first auto-book in minutes.
                </p>
                <Link to="/register">
                  <MagneticButton className="inline-flex items-center gap-2 px-10 py-4 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-xl">
                    Create Free Account
                    <ArrowRight className="w-5 h-5" />
                  </MagneticButton>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Ticket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">
                BookIt<span className="text-primary">.ai</span>
              </span>
            </motion.div>
            
            <div className="flex gap-8 text-sm text-muted-foreground">
              {['Privacy', 'Terms', 'Contact'].map((link) => (
                <motion.a
                  key={link}
                  href="#"
                  whileHover={{ color: 'hsl(var(--primary))' }}
                  className="hover:text-foreground transition-colors"
                >
                  {link}
                </motion.a>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2025 BookIt.ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
