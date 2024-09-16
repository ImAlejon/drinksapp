"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';

interface UserCreditsContextType {
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  updateCredits: (newCredits: number) => Promise<void>;
  resetCredits: () => void;
}

const UserCreditsContext = createContext<UserCreditsContextType | undefined>(undefined);

export const UserCreditsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [credits, setCredits] = useState(0);
  const { supabase } = useSupabase();

  useEffect(() => {
    const fetchCredits = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_credits')
          .select('credits')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setCredits(data.credits);
        }
      } else {
        setCredits(0); // Reset credits if no user is logged in
      }
    };

    fetchCredits();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchCredits();
      } else if (event === 'SIGNED_OUT') {
        setCredits(0);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const updateCredits = async (newCredits: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('user_credits')
        .update({ credits: newCredits })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating user credits:', error);
      } else {
        setCredits(newCredits);
      }
    }
  };

  const resetCredits = () => {
    setCredits(0);
  };

  return (
    <UserCreditsContext.Provider value={{ credits, setCredits, updateCredits, resetCredits }}>
      {children}
    </UserCreditsContext.Provider>
  );
};

export const useUserCredits = () => {
  const context = useContext(UserCreditsContext);
  if (context === undefined) {
    throw new Error('useUserCredits must be used within a UserCreditsProvider');
  }
  return context;
};
