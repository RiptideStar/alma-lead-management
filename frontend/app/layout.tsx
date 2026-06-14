import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alma — Immigration Case Assessment",
  description:
    "Request a free immigration case assessment from an Alma attorney.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
