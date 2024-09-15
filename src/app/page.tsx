'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlayCircle, Smartphone, Music, Star, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSupabase } from '@/components/SupabaseProvider';

export default function Home() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);
    };

    checkSession();
  }, [supabase.auth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/youtube-playlist');
    }
  }, [isLoading, isAuthenticated, router]);

  const redirectToLogin = () => router.push('/login');

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return null; // This will be briefly shown before the useEffect redirects to dashboard
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Turn Any Device Into a{" "}
            <span className="bg-black text-white px-2 ">Party Jukebox!</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-600">
            Connect, control, and amplify your music experience anywhere, anytime.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Button size="lg" className="bg-black text-white hover:bg-gray-800" onClick={redirectToLogin}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" className="text-black border-black hover:bg-black hover:text-white" onClick={redirectToLogin}>
              Request Demo
            </Button>
          </div>
          <div className="max-w-md mx-auto">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); redirectToLogin(); }}>
              <Input type="email" placeholder="Enter your email" className="bg-gray-100 text-black placeholder-gray-500" />
              <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                Get Early Access
              </Button>
            </form>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold mb-6">How It Works</h2>
            <ul className="space-y-4">
              {[
                { icon: <PlayCircle className="h-6 w-6" />, text: "Create a Session" },
                { icon: <QrCode className="h-6 w-6" />, text: "Share Your Session QR Code or ID" },
                { icon: <Smartphone className="h-6 w-6" />, text: "Friends Join Easily" },
                { icon: <Music className="h-6 w-6" />, text: "Everyone Picks Songs" },
              ].map((step, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <div className="bg-black text-white p-2 rounded-full">{step.icon}</div>
                  <span className="text-gray-700">{step.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center justify-center bg-gray-100 p-8 rounded-lg shadow-xl">
            <div className="flex mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-12 h-12 text-black fill-current" />
              ))}
            </div>
            <p className="text-4xl font-bold mb-2">5.0</p>
            <p className="text-xl mb-4">User Rating</p>
            <p className="text-gray-600 text-center mb-4">
              "PartyJuke has revolutionized how we enjoy music at our events!"
            </p>
            <p className="font-semibold">- Sarah M., Event Planner</p>
          </div>

        </div>

        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-6">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Alex",
                role: "Party Host",
                quote: "PartyJuke made my last event unforgettable. Everyone loved choosing songs!",
              },
              {
                name: "Sam",
                role: "DJ",
                quote: "As a DJ, this app is a game-changer. It keeps the crowd engaged all night long.",
              },
              {
                name: "Jamie",
                role: "Music Lover",
                quote: "I've discovered so much new music thanks to PartyJuke. It's addictive!",
              },
            ].map((testimonial, index) => (
              <div key={index} className="bg-gray-100 p-6 rounded-lg">
                <p className="mb-4 text-gray-700">&quot;{testimonial.quote}&quot;</p>
                <p className="font-bold">{testimonial.name}</p>
                <p className="text-sm text-gray-500">{testimonial.role}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Bring the Music to Life?</h2>
          <Button size="lg" className="bg-black text-white hover:bg-gray-800" onClick={redirectToLogin}>
            Join the Jukebox Experience
          </Button>
        </div>
      </main>
    </div>
  );
}
