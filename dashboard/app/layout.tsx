import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { ProjectProvider } from "@/lib/project-context";

export const metadata: Metadata = {
    title: "Memos",
    description: "Local memory workspace and dashboard",
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className="antialiased bg-black text-stone-300"
                suppressHydrationWarning
            >
                <ProjectProvider>
                    <Sidebar />
                    <Navbar />
                    <main className="ml-20 mt-20 p-4 min-h-screen transition-all duration-300">
                        {children}
                    </main>
                </ProjectProvider>
            </body>
        </html>
    );
}
