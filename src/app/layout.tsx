import type { Metadata } from "next";
import "./globals.css";
import SupabaseProvider from '@/components/SupabaseProvider';
import AuthProvider from '@/components/AuthProvider';
import { MainNav } from "@/components/MainNav";
import { Toaster } from 'react-hot-toast';
import { UserCreditsProvider } from '@/contexts/UserCreditsContext';

export const metadata: Metadata = {
  title: "Drinks App",
  description: "Drinks App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <UserCreditsProvider>
            <AuthProvider>
              <MainNav />
              {children}
            </AuthProvider>
          </UserCreditsProvider>
          <Toaster position="bottom-left" />
        </SupabaseProvider>
      </body>
    </html>
  );
}
