import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Biosim4 — Biological Evolution Simulator",
  description:
    "TypeScript port of biosim4: creatures with neural networks evolve through natural selection in a 2D grid world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
