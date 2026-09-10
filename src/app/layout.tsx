import type { Metadata } from "next";
import { Comfortaa, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const comfortaa = Comfortaa({
	variable: "--font-comfortaa",
	subsets: ["latin"],
	weight: ["700"],
});

export const metadata: Metadata = {
	title: {
		default: "buobu",
		template: "%s - buobu",
	},
	description: "Track your goals and habits",
	icons: {
		icon: "/favicon.ico",
		shortcut: "/favicon.ico",
		apple: "/favicon.ico",
	},
	other: {
		build_version: process.env.NEXT_PUBLIC_BUILD_VERSION || "unknown",
		build_time: process.env.NEXT_PUBLIC_BUILD_TIME || "unknown",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${comfortaa.variable} antialiased`}
				suppressHydrationWarning
			>
				<AppProviders>{children}</AppProviders>
			</body>
		</html>
	);
}
