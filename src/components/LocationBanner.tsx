'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './LocationBanner.module.css';

type LocationData = {
  city: string;
  country: string;
  region: string;
  timezone: string;
  lat?: number;
  lon?: number;
  isOverridden?: boolean;
};

type SearchResult = {
  id: string;
  city: string;
  region: string;
  country: string;
  displayName: string;
  lat: number;
  lon: number;
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

  // Use browser's Geolocation API for precise location
  const detectLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      // Get precise coordinates from browser
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get city/country from coordinates
      const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to reverse geocode');
      }

      setLocation({
        city: data.city,
        country: data.country,
        region: data.region || data.city,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        lat: latitude,
        lon: longitude,
        isOverridden: false,
      });
    } catch (e: any) {
      console.error('Location detection failed:', e);
      
      // Handle specific geolocation errors
      if (e.code === 1) {
        setError('Location access denied. Please enable location permissions.');
      } else if (e.code === 2) {
        setError('Unable to determine location. Please search manually.');
      } else if (e.code === 3) {
        setError('Location request timed out. Please try again.');
      } else {
        setError(e.message || 'Detection failed');
      }

      // Fallback to timezone-based location
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const parts = timezone.split('/');
        if (parts.length >= 2) {
          const cityFromTz = parts[parts.length - 1].replace(/_/g, ' ');
          setLocation({
            city: cityFromTz,
            country: 'Unknown',
            region: parts[0].replace(/_/g, ' '),
            timezone,
            isOverridden: false,
          });
          setError(null);
          return;
        }
      } catch {
        // Ignore fallback errors
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-detect on mount if:
    // 1. No location stored at all
    // 2. Location exists but was NOT manually overridden (re-detect for accuracy)
    if (!location || !location.isOverridden) {
      void detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, isLoading, error, setLocation, detectLocation };
}

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function LocationBanner() {
  const { location, isLoading, error, setLocation, detectLocation } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Track mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock body scroll when dropdown is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, isMobile]);

  // Close dropdown when clicking outside (desktop only - mobile uses overlay)
  useEffect(() => {
    // Skip click outside handling on mobile - the overlay handles it
    if (isMobile) return;
    
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Check if click is outside both the banner and the dropdown content
      const isOutsideBanner = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsideDropdown = dropdownContentRef.current && !dropdownContentRef.current.contains(target);
      
      if (isOutsideBanner && isOutsideDropdown) {
        setIsOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search for locations when query changes
  useEffect(() => {
    async function searchLocations() {
      if (debouncedQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Search failed');
        }

        setSearchResults(data.results || []);
      } catch (e) {
        console.error('Location search failed:', e);
        setSearchError('Search failed. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }

    searchLocations();
  }, [debouncedQuery]);

  const handleSelectLocation = useCallback((result: SearchResult) => {
    setLocation({
      city: result.city || result.region,
      country: result.country,
      region: result.region,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lat: result.lat,
      lon: result.lon,
      isOverridden: true,
    });
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [setLocation]);

  const handleAutoDetect = useCallback(async () => {
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    await detectLocation();
  }, [detectLocation]);

  const handleSetGlobal = useCallback(() => {
    setLocation({
      city: 'Global',
      country: 'Global',
      region: 'Global',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isOverridden: true,
    });
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [setLocation]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Determine display text
  const getDisplayText = () => {
    if (isLoading) return 'Detecting...';
    if (!location || (location.city === 'Unknown' && location.country === 'Unknown')) {
      return 'Set location';
    }
    if (location.city === 'Global') {
      return '🌍 Global';
    }
    return `📍 ${location.city}`;
  };

  const hasLocation = location && location.city !== 'Unknown' && location.city !== '';

  return (
    <div className={styles.banner} ref={dropdownRef}>
      <button
        className={`${styles.locationButton} ${isOpen ? styles.active : ''} ${!hasLocation ? styles.noLocation : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        {isLoading && <span className={styles.loadingSpinner} />}
        <span className={styles.locationText}>{getDisplayText()}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronUp : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {isOpen && (
        <>
          {/* Dropdown content - rendered via portal on mobile for proper z-index handling */}
          {(() => {
            const dropdownContent = (
              <>
                {/* Mobile overlay backdrop */}
                <div 
                  className={styles.mobileOverlay} 
                  onClick={closeDropdown}
                  aria-hidden="true"
                />
                <div 
                  ref={dropdownContentRef}
                  className={styles.dropdown} 
                  role="dialog" 
                  aria-modal="true" 
                  aria-label="Select location"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Mobile Header with close button */}
                  <div className={styles.mobileHeader}>
                    <span className={styles.mobileTitle}>Select Location</span>
                    <button 
                      className={styles.mobileCloseButton}
                      onClick={closeDropdown}
                      aria-label="Close"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Search Header */}
                  <div className={styles.searchHeader}>
                    <div className={styles.searchInputWrapper}>
                      <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search any city worldwide..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      {searchQuery && (
                        <button 
                          className={styles.clearButton}
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            searchRef.current?.focus();
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className={styles.quickActions}>
                    <button 
                      className={styles.quickAction}
                      onClick={handleAutoDetect}
                      disabled={isLoading}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v2m0 16v2M2 12h2m16 0h2" />
                        <path d="M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                      </svg>
                      <span>Auto-detect location</span>
                      {isLoading && <span className={styles.loadingDots}>...</span>}
                    </button>
                    <button 
                      className={`${styles.quickAction} ${location?.city === 'Global' ? styles.selected : ''}`}
                      onClick={handleSetGlobal}
                    >
                      <span>🌍</span>
                      <span>Global (no specific location)</span>
                    </button>
                  </div>

                  {/* Error Message */}
                  {(error || searchError) && (
                    <div className={styles.errorMessage}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4m0 4h.01" />
                      </svg>
                      <span>{error || searchError}</span>
                    </div>
                  )}

                  {/* Search Results */}
                  <div className={styles.resultsContainer}>
                    {isSearching && (
                      <div className={styles.searchingState}>
                        <span className={styles.loadingSpinner} />
                        <span>Searching...</span>
                      </div>
                    )}

                    {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                      <div className={styles.noResults}>
                        <span>No cities found for &ldquo;{searchQuery}&rdquo;</span>
                        <span className={styles.noResultsHint}>Try a different spelling or nearby city</span>
                      </div>
                    )}

                    {!isSearching && searchResults.length > 0 && (
                      <div className={styles.resultsList}>
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            className={styles.resultItem}
                            onClick={() => handleSelectLocation(result)}
                          >
                            <div className={styles.resultIcon}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                            </div>
                            <div className={styles.resultContent}>
                              <span className={styles.resultCity}>
                                {result.city || result.region}
                              </span>
                              <span className={styles.resultDetails}>
                                {[result.region, result.country].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!searchQuery && !isSearching && (
                      <div className={styles.searchHint}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>Start typing to search for any city</span>
                      </div>
                    )}
                  </div>

                  {/* Current Location Display */}
                  {location && location.city !== 'Unknown' && (
                    <div className={styles.currentLocation}>
                      <span className={styles.currentLabel}>Current:</span>
                      <span className={styles.currentValue}>
                        {location.city === 'Global' ? '🌍 Global' : `📍 ${location.city}, ${location.country}`}
                      </span>
                    </div>
                  )}
                </div>
              </>
            );

            // Use portal on mobile to escape overflow:hidden containers
            if (isMobile && mounted) {
              return ReactDOM.createPortal(dropdownContent, document.body);
            }
            return dropdownContent;
          })()}
        </>
      )}
    </div>
  );
}
