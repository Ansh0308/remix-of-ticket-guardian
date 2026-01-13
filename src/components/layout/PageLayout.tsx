import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';

interface PageLayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  showNavbar = true,
  className = '' 
}) => {
  return (
    <div className="min-h-screen bg-background">
      {showNavbar && <Navbar />}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`${showNavbar ? 'pt-16' : ''} ${className}`}
      >
        {children}
      </motion.main>
    </div>
  );
};

export default PageLayout;
