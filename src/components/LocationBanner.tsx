'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './LocationBanner.module.css';

type LocationData = {
  city: string;
  country: string;
  region: string;
  timezone: string;
  isOverridden?: boolean;
};

function useLocation() {
  const [location, setLocationState] = useState<LocationData | null>(() => {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem('location');
      return raw ? (JSON.parse(raw) as LocationData) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLocation = (next: LocationData) => {
    setLocationState(next);
    setError(null);

    try {
      window.localStorage.setItem('location', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const detectLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Lightweight client-side IP-based lookup (fallbacks to Unknown on failure)
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('Failed to detect location');

      const data: any = await res.json();

      setLocation({
        city: data?.city ?? 'Unknown',
        country: data?.country_name ?? 'Unknown',
        region: data?.region ?? 'Unknown',
        timezone: data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        isOverridden: false,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detection failed');
      setLocationState(prev =>
        prev ?? {
          city: 'Unknown',
          country: 'Unknown',
          region: 'Unknown',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          isOverridden: false,
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-detect once if nothing is stored or user hasn't overridden it.
    if (!location || !location.isOverridden) {
      void detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, isLoading, error, setLocation, detectLocation };
}

// Popular locations with their data
const COMMON_LOCATIONS = [
  { id: 'auto', label: '🔍 Auto-detect my location', city: '', country: '', region: '' },
  { id: 'new-york', label: '🗽 New York, USA', city: 'New York', country: 'United States', region: 'New York' },
  { id: 'san-francisco', label: '🌉 San Francisco, USA', city: 'San Francisco', country: 'United States', region: 'California' },
  { id: 'los-angeles', label: '🌴 Los Angeles, USA', city: 'Los Angeles', country: 'United States', region: 'California' },
  { id: 'london', label: '🇬🇧 London, UK', city: 'London', country: 'United Kingdom', region: 'England' },
  { id: 'berlin', label: '🇩🇪 Berlin, Germany', city: 'Berlin', country: 'Germany', region: 'Berlin' },
  { id: 'paris', label: '🇫🇷 Paris, France', city: 'Paris', country: 'France', region: 'Île-de-France' },
  { id: 'tokyo', label: '🇯🇵 Tokyo, Japan', city: 'Tokyo', country: 'Japan', region: 'Tokyo' },
  { id: 'sydney', label: '🇦🇺 Sydney, Australia', city: 'Sydney', country: 'Australia', region: 'New South Wales' },
  { id: 'toronto', label: '🇨🇦 Toronto, Canada', city: 'Toronto', country: 'Canada', region: 'Ontario' },
  { id: 'singapore', label: '🇸🇬 Singapore', city: 'Singapore', country: 'Singapore', region: 'Singapore' },
  { id: 'dubai', label: '🇦🇪 Dubai, UAE', city: 'Dubai', country: 'United Arab Emirates', region: 'Dubai' },
  { id: 'mumbai', label: '🇮🇳 Mumbai, India', city: 'Mumbai', country: 'India', region: 'Maharashtra' },
  { id: 'amsterdam', label: '🇳🇱 Amsterdam, Netherlands', city: 'Amsterdam', country: 'Netherlands', region: 'North Holland' },
  { id: 'global', label: '🌍 Global (No specific location)', city: 'Global', country: 'Global', region: 'Global' },
];

export function LocationBanner() {
  const { location, isLoading, error, setLocation, detectLocation } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectLocation = async (loc: typeof COMMON_LOCATIONS[0]) => {
    if (loc.id === 'auto') {
      // Trigger auto-detection
      setIsOpen(false);
      setSearchQuery('');
      await detectLocation();
    } else {
      // Set the selected location
      setLocation({
        city: loc.city,
        country: loc.country,
        region: loc.region,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isOverridden: true,
      });
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const filteredLocations = COMMON_LOCATIONS.filter(loc =>
    loc.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Determine display text
  const getDisplayText = () => {
    if (isLoading) return '🔄 Detecting...';
    if (error) return '⚠️ Detection failed';
    if (!location || (location.city === 'Unknown' && location.country === 'Unknown')) {
      return '📍 Select location';
    }
    if (location.city === 'Global') {
      return '🌍 Global';
    }
    return `📍 ${location.city}, ${location.country}`;
  };

  // Determine if location is set
  const hasLocation = location && location.city !== 'Unknown' && location.city !== '';

  return (
    <div className={styles.banner} ref={dropdownRef}>
      <button
        className={`${styles.locationButton} ${isOpen ? styles.active : ''} ${!hasLocation ? styles.noLocation : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span className={styles.locationText}>{getDisplayText()}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronUp : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchContainer}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>
          
          <div className={styles.locationList}>
            {filteredLocations.map((loc) => (
              <button
                key={loc.id}
                className={`${styles.locationOption} ${
                  location?.city === loc.city && location?.country === loc.country
                    ? styles.selected
                    : ''
                }`}
                onClick={() => handleSelectLocation(loc)}
              >
                <span className={styles.optionLabel}>{loc.label}</span>
                {location?.city === loc.city && location?.country === loc.country && loc.id !== 'auto' && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </button>
            ))}
            
            {filteredLocations.length === 0 && (
              <div className={styles.noResults}>
                No locations found. Try "Auto-detect" or select a nearby city.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
