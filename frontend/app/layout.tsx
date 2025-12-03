import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Match Predictor",
  description: "Football Match Prediction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans text-slate-900">{children}</body>
    </html>
  );
}
