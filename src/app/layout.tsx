import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Research AI - Turn Questions Into Research",
    description: "AI-powered research tool that interviews you, builds dynamic forms, and conducts deep research with source attribution.",
    keywords: ["AI", "research", "form builder", "automation", "Mastra"],
    authors: [{ name: "Research AI" }],
    openGraph: {
        title: "Research AI - Turn Questions Into Research",
        description: "AI-powered research tool that interviews you, builds dynamic forms, and conducts deep research with source attribution.",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    );
}
