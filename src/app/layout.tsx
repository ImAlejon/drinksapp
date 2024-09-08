import type { Metadata } from "next";
import "./globals.css";
import SupabaseProvider from "@/components/SupabaseProvider";
import AuthProvider from "@/components/AuthProvider";
import { MainNav } from "@/components/MainNav";

// Remove or comment out these lines if they're not used
// const geistSans = Geist_sans({ subsets: ['latin'] })
// const geistMono = Geist_mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Drinks App",
  description: "Drinks App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <AuthProvider>
            <MainNav />
            <main>{children}</main>
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
