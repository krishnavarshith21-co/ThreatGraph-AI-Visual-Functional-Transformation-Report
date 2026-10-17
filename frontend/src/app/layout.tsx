import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "ThreatGraph AI — Autonomous Cyber Investigation & Knowledge Graph",
  description: "Next-generation SOC cyber threat investigation platform powered by FalkorDB graph database and Gemini agent reasoning.",
  keywords: ["cybersecurity", "threat intelligence", "graph database", "FalkorDB", "Gemini AI", "SOC", "incident response"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070C13] text-[#F3F4F0] antialiased selection:bg-[#83CFE0] selection:text-[#070C13] font-body">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
