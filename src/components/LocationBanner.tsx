
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, LocationContext } from '@/lib/state-machine';
import { detectLocation, clearLocationCache } from '@/lib/location';
import styles from './LocationBanner.module.css';

// Icons
const LocationIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const EditIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20,6 9,17 4,12" />
    </svg>
);

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const RefreshIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
    </svg>
);

export function LocationBanner() {
    const { location, setLocation } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleStartEdit = () => {
        setEditValue(location?.city && location.city !== 'Unknown'
            ? `${location.city}, ${location.country}`
            : location?.country || '');
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (editValue.trim()) {
            // Parse the input - try to split by comma for city, country
            const parts = editValue.split(',').map(p => p.trim());
            const newLocation: LocationContext = {
                city: parts.length > 1 ? parts[0] : 'Unknown',
                country: parts.length > 1 ? parts[1] : parts[0],
                region: 'Unknown',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                isOverridden: true,
            };
            setLocation(newLocation);
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditValue('');
    };

    const handleRedetect = async () => {
        setLoading(true);
        clearLocationCache();
        try {
            const detected = await detectLocation();
            setLocation(detected);
        } catch (e) {
            console.error("Location re-detection failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

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

                {isEditing ? (
                    <div className={styles.editContainer}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="City, Country"
                            className={styles.editInput}
                        />
                        <button
                            onClick={handleSaveEdit}
                            className={styles.iconButton}
                            title="Save"
                        >
                            <CheckIcon />
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className={styles.iconButton}
                            title="Cancel"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                ) : (
                    <div className={styles.displayContainer}>
                        <div className={styles.displayBadge}>
                            <span className={styles.locationText}>
                                {displayText}
                            </span>
                            {location?.isOverridden && (
                                <span className={styles.overrideBadge} title="Manually set">
                                    ✓
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleStartEdit}
                            className={styles.iconButton}
                            title="Change location"
                        >
                            <EditIcon />
                        </button>
                        {location?.isOverridden && (
                            <button
                                onClick={handleRedetect}
                                className={styles.iconButton}
                                title="Re-detect location"
                            >
                                <RefreshIcon />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
