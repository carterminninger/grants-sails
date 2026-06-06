import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grant's Sails — Seattle Sailing Experiences",
  description: "Mid-day and sunset sails on Puget Sound and Lake Union with Captain Grant. 4.99★ on Airbnb. Orcas, Olympic Mountains, Seattle skyline. Shilshole Bay Marina, Ballard.",
  keywords: ["Seattle sailing", "Puget Sound sail", "Lake Union sailboat", "Airbnb experience Seattle", "Captain Grant"],
  openGraph: {
    title: "Grant's Sails — Seattle Sailing Experiences",
    description: "Sail Puget Sound or Lake Union with USCG-licensed Captain Grant. Wildlife, mountains, and unforgettable Seattle views.",
    url: "https://grantssails.vercel.app",
    siteName: "Grant's Sails",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0b1e2d" }}>
        {children}
      </body>
    </html>
  );
}
