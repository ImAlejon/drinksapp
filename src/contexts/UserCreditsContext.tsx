"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';

interface UserCreditsContextType {
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  updateCredits: (newCredits: number) => Promise<void>;
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
        } else {
          console.error('Error fetching user credits:', error);
        }

        if (user) {
          const creditSubscription = supabase
            .channel('user_credits')
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_credits',
              filter: `user_id=eq.${user.id}`
            }, (payload) => {
              setCredits(payload.new.credits);
            })
            .subscribe();

          return () => {
            supabase.removeChannel(creditSubscription);
          };
        }
      }
    };

    fetchCredits();
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

  return (
    <UserCreditsContext.Provider value={{ credits, setCredits, updateCredits }}>
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