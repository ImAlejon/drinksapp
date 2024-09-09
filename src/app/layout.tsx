import type { Metadata } from "next";
import "./globals.css";
import SupabaseProvider from '@/components/SupabaseProvider';
import { MainNav } from "@/components/MainNav";

export const metadata: Metadata = {
  title: "Drinks App",
  description: "Drinks App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <MainNav />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
