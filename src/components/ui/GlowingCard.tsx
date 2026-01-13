import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface GlowingCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

const GlowingCard: React.FC<GlowingCardProps> = ({ 
  children, 
  className = '',
  glowColor = 'hsl(239, 84%, 67%)'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border) / 0.5)',
      }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: isHovering ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}15, transparent 40%)`,
        }}
      />
      
      {/* Border glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          opacity: isHovering ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}30, transparent 40%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'xor',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export default GlowingCard;
