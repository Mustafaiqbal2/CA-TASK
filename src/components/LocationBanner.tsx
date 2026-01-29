
'use client';

import { useState, useEffect } from 'react';
import { useAppStore, LocationContext } from '@/lib/state-machine';
import { detectLocation } from '@/lib/location';
import styles from './LocationBanner.module.css';

// Icons
const LocationIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);



export function LocationBanner() {
    const { location, setLocation } = useAppStore();
    const [loading, setLoading] = useState(true);

    // Initial detection
    useEffect(() => {
        async function initLocation() {
            // If we already have location in store (that is not default/unknown), don't re-detect
            if (location && location.country !== 'Unknown') {
                setLoading(false);
                return;
            }

            try {
                const detected = await detectLocation();
                setLocation(detected);
            } catch (e) {
                console.error("Location detection failed", e);
            } finally {
                setLoading(false);
            }
        }

        initLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setLocation]);

    if (loading && !location) {
        return null;
    }

    const displayText = (() => {
        if (loading) return "Detecting...";
        if (location?.city && location.city !== 'Unknown') {
            const parts = [location.city];
            if (location.country && location.country !== 'Unknown') parts.push(location.country);
            return parts.join(', ');
        }
        if (location?.country && location.country !== 'Unknown') return location.country;
        return "Global Context";
    })();

    return (
        <div className={styles.banner}>
            <div className={styles.content}>
                <div className={styles.label}>
                    <LocationIcon />
                    <span className={styles.labelText}>
                        Research Context:
                    </span>
                </div>

                <div className={styles.displayBadge}>
                    <span className={styles.locationText}>
                        {displayText}
                    </span>
                </div>
            </div>
        </div>
    );
}
