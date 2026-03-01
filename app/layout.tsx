import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./css/globals.css";

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Imlite - Compress Images, Not Quality",
  description: "Professional grade local image compression. Your photos never leave your device, ensuring 100% privacy and blazing fast speeds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>{children}</body>
    </html>
  );
}
