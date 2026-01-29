import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
    try {
        // Get client IP from headers (works with Vercel, Cloudflare, etc.)
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const cfConnectingIp = request.headers.get('cf-connecting-ip');
        let ip = cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || realIp || '';

        // In local development, IP headers might be empty or localhost
        // In this case, let ipapi.co detect the IP automatically
        const isLocalhost = !ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');

        // Call ipapi.co from server side (no CORS issues)
        // When IP is local/empty, use the base URL which auto-detects
        const apiUrl = isLocalhost ? 'https://ipapi.co/json/' : `https://ipapi.co/${ip}/json/`;
        
        const res = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'ResearchAI/1.0',
                'Accept': 'application/json',
            },
            // Add cache to prevent rate limiting
            next: { revalidate: 300 }, // Cache for 5 minutes
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('ipapi.co error:', res.status, errorText);
            throw new Error(`Failed to fetch location: ${res.status}`);
        }

        const data = await res.json();

        // Check if we got valid data (ipapi.co returns error field on failure)
        if (data.error) {
            console.error('ipapi.co returned error:', data.reason || data.error);
            throw new Error(data.reason || 'Location detection failed');
        }

        // Only return valid data, not "Unknown"
        const city = data.city;
        const country = data.country_name;
        const region = data.region;
        const timezone = data.timezone;

        // If we got empty/null values, throw to trigger fallback
        if (!city || !country) {
            throw new Error('Invalid location data received');
        }

        return NextResponse.json({
            city,
            country,
            region: region || city,
            timezone: timezone || 'UTC',
        });
    } catch (error) {
        console.error('Location detection error:', error);
        
        // Try timezone-based fallback using Intl API
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Extract city from timezone (e.g., "America/New_York" -> "New York")
            const parts = timezone.split('/');
            if (parts.length >= 2) {
                const cityFromTz = parts[parts.length - 1].replace(/_/g, ' ');
                return NextResponse.json({
                    city: cityFromTz,
                    country: 'Unknown',
                    region: parts[0].replace(/_/g, ' '),
                    timezone,
                    detected: 'timezone-fallback',
                });
            }
        } catch {
            // Ignore
        }
        
        // Return error status instead of fake data
        return NextResponse.json({
            city: '',
            country: '',
            region: '',
            timezone: 'UTC',
            error: 'Could not detect location',
        }, { status: 500 });
    }
}
