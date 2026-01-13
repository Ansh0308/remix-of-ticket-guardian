import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

interface PageLayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
  showBackground?: boolean;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  showNavbar = true,
  showBackground = true,
  className = '' 
}) => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {showBackground && <AnimatedBackground />}
      {showNavbar && <Navbar />}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`relative z-10 ${showNavbar ? 'pt-16' : ''} ${className}`}
      >
        {children}
      </motion.main>
    </div>
  );
};

export default PageLayout;
