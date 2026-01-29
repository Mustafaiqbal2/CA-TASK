
import { LocationContext } from './state-machine';

const CACHE_KEY = 'research_ai_location';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface CachedLocation {
    data: LocationContext;
    timestamp: number;
}

/**
 * Detect user location using IP geolocation API
 */
export async function detectLocation(): Promise<LocationContext> {
    // Check cache first
    const cached = getCachedLocation();
    if (cached) return cached;

    try {
        // Try ipapi.co first (more detailed)
        const response = await fetch('https://ipapi.co/json/');

        if (!response.ok) {
            // Simple fallback to ip-api.com (http only usually, but some endpoints work)
            // Or specific fallback
            throw new Error('Geolocation service failed');
        }

        const data = await response.json();

        // ipapi.co returns: country_name, region, city, timezone
        // ip-api.com returns: country, regionName, city, timezone

        const location: LocationContext = {
            country: data.country_name || data.country || 'Unknown',
            city: data.city || 'Unknown',
            region: data.region || data.regionName || 'Unknown',
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            isOverridden: false,
        };

        cacheLocation(location);
        return location;
    } catch (error) {
        console.warn('Geolocation detection failed:', error);

        const defaultLocation: LocationContext = {
            country: 'Unknown',
            city: 'Unknown',
            region: 'Unknown',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            isOverridden: false,
        };

        return defaultLocation;
    }
}

/**
 * Get location from local storage cache
 */
function getCachedLocation(): LocationContext | null {
    if (typeof window === 'undefined') return null;

    try {
        const json = localStorage.getItem(CACHE_KEY);
        if (!json) return null;

        const cached: CachedLocation = JSON.parse(json);
        const now = Date.now();

        if (now - cached.timestamp > CACHE_DURATION) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return cached.data;
    } catch (e) {
        return null;
    }
}

/**
 * Save location to local storage cache
 */
function cacheLocation(location: LocationContext): void {
    if (typeof window === 'undefined') return;

    const cached: CachedLocation = {
        data: location,
        timestamp: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
}

export function clearLocationCache(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CACHE_KEY);
}
