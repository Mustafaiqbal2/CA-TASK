import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface SearchResult {
  id: string;
  city: string;
  region: string;
  country: string;
  displayName: string;
  lat: number;
  lon: number;
}

// Use multiple geocoding providers for reliability
// Primary: OpenStreetMap Nominatim
// Fallback: BigDataCloud (for reverse geocoding)

// Forward geocoding - search for locations by name using Nominatim
async function searchLocations(query: string): Promise<SearchResult[]> {
  // Try Nominatim first
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '8');
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'ResearchAI-App/1.0 (https://research-ai.app; contact@research-ai.app)',
        'Accept': 'application/json',
        'Accept-Language': 'en',
      },
    });

    if (response.ok) {
      const results = await response.json();
      return results.map((r: any) => {
        const address = r.address || {};
        const city = address.city || address.town || address.village || address.municipality || address.county || '';
        const region = address.state || address.county || '';
        const country = address.country || '';
        
        return {
          id: `${r.place_id}`,
          city,
          region,
          country,
          displayName: r.display_name,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
        };
      }).filter((r: SearchResult) => r.city || r.region);
    }
  } catch (e) {
    console.error('Nominatim search failed:', e);
  }

  // Fallback to Photon (OpenStreetMap-based, by Komoot)
  try {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '8');
    url.searchParams.set('lang', 'en');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return (data.features || []).map((f: any) => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0];
        
        return {
          id: `photon-${props.osm_id || Math.random()}`,
          city: props.city || props.name || props.locality || '',
          region: props.state || props.county || '',
          country: props.country || '',
          displayName: [props.name, props.city, props.state, props.country].filter(Boolean).join(', '),
          lat: coords[1],
          lon: coords[0],
        };
      }).filter((r: SearchResult) => r.city || r.region);
    }
  } catch (e) {
    console.error('Photon search failed:', e);
  }

  return [];
}

// Reverse geocoding - get location from coordinates
async function reverseGeocode(lat: number, lon: number): Promise<any> {
  // Try BigDataCloud first (most reliable for reverse geocoding, no auth needed)
  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lon.toString());
    url.searchParams.set('localityLanguage', 'en');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        city: data.city || data.locality || data.principalSubdivision || 'Unknown',
        region: data.principalSubdivision || data.localityInfo?.administrative?.[1]?.name || '',
        country: data.countryName || 'Unknown',
        countryCode: data.countryCode || '',
        displayName: [data.city || data.locality, data.principalSubdivision, data.countryName].filter(Boolean).join(', '),
        lat,
        lon,
      };
    }
  } catch (e) {
    console.error('BigDataCloud reverse geocode failed:', e);
  }

  // Fallback to Nominatim
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lon.toString());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '10');
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'ResearchAI-App/1.0 (https://research-ai.app; contact@research-ai.app)',
        'Accept': 'application/json',
        'Accept-Language': 'en',
      },
    });

    if (response.ok) {
      const result = await response.json();
      const address = result.address || {};
      
      return {
        city: address.city || address.town || address.village || address.municipality || address.county || 'Unknown',
        region: address.state || address.county || '',
        country: address.country || 'Unknown',
        displayName: result.display_name,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      };
    }
  } catch (e) {
    console.error('Nominatim reverse geocode failed:', e);
  }

  // Final fallback - return coordinates-based response
  return {
    city: 'Unknown',
    region: '',
    country: 'Unknown',
    displayName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    lat,
    lon,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  try {
    // Reverse geocoding - get location from coordinates
    if (lat && lon) {
      const location = await reverseGeocode(parseFloat(lat), parseFloat(lon));
      return NextResponse.json(location);
    }
    
    // Forward geocoding - search by query
    if (query && query.length >= 2) {
      const results = await searchLocations(query);
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: 'Missing query parameter (q) or coordinates (lat, lon)' }, { status: 400 });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Geocoding failed' },
      { status: 500 }
    );
  }
}
