'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRealtimeAutoBook } from '@/hooks/useRealtimeAutoBook';

interface RealtimeAutoBookContextType {
  isInitialized: boolean;
}

const RealtimeAutoBookContext = React.createContext<RealtimeAutoBookContextType>({ isInitialized: false });

export const useRealtimeAutoBookContext = () => {
  return React.useContext(RealtimeAutoBookContext);
};

interface RealtimeAutoBookProviderProps {
  children: ReactNode;
}

const RealtimeAutoBookProvider: React.FC<RealtimeAutoBookProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  // Initialize real-time auto-book listener
  const { setupRealtimeListener } = useRealtimeAutoBook();

  useEffect(() => {
    // Setup real-time listener on mount
    const cleanup = setupRealtimeListener();
    setIsInitialized(true);
    console.log('[RealtimeAutoBook] Context initialized');

    return () => {
      if (cleanup) cleanup();
    };
  }, [setupRealtimeListener]);

  const value: RealtimeAutoBookContextType = { isInitialized };

  return (
    <RealtimeAutoBookContext.Provider value={value}>
      {children}
    </RealtimeAutoBookContext.Provider>
  );
};

export default RealtimeAutoBookProvider;
