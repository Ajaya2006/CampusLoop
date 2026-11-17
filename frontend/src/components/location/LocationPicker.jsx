import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import { cx } from '../../utils/format';

const PHOTON = 'https://photon.komoot.io';
const DEFAULT_CENTER = [20.5937, 78.9629];
const MAX_LABEL = 180;
const MAX_DETAILS = 300;

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#6D4AFF;border:3px solid #fff;box-shadow:0 2px 8px rgba(23,23,37,.4)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

function unique(parts) {
  return [...new Set(parts.filter(Boolean))];
}

function toPlace(feature) {
  const p = feature?.properties || {};
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const name = p.name || street || p.city || p.district || p.state || p.country || '';
  const label = unique([name, p.city && p.city !== name ? p.city : '']).join(', ');
  const details = unique([
    street && street !== name ? street : '',
    p.district,
    p.city,
    p.state,
    p.postcode,
    p.country,
  ]).join(', ');
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;
  return {
    label: label.slice(0, MAX_LABEL),
    details: details.slice(0, MAX_DETAILS),
    latitude: Number(coordinates[1]),
    longitude: Number(coordinates[0]),
  };
}

function fallbackName(latitude, longitude) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export default function LocationPicker({ value = {}, onChange, error }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [query, setQuery] = useState(value.label || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');

  const hasCoords = Number.isFinite(value.latitude) && Number.isFinite(value.longitude);

  const applyPlace = (place, { fly = false } = {}) => {
    if (!place) return;
    setQuery(place.label);
    setResults([]);
    setOpen(false);
    setMessage('');
    onChange?.(place);
    if (fly && mapRef.current) {
      mapRef.current.flyTo([place.latitude, place.longitude], 16, { duration: 0.8 });
    }
  };

  const reverse = async (latitude, longitude) => {
    setLocating(true);
    try {
      const response = await fetch(
        `${PHOTON}/reverse?lat=${latitude}&lon=${longitude}&lang=en`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) throw new Error('reverse failed');
      const data = await response.json();
      const place = toPlace(data.features?.[0]) || {
        label: fallbackName(latitude, longitude),
        details: '',
      };
      applyPlace({ ...place, latitude, longitude });
    } catch {
      applyPlace({ label: fallbackName(latitude, longitude), details: '', latitude, longitude });
      setMessage('Address lookup is unavailable, so the coordinates were saved instead.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return undefined;
    const start = hasCoords ? [value.latitude, value.longitude] : DEFAULT_CENTER;
    const map = L.map(mapContainer.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView(start, hasCoords ? 15 : 5);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker(start, { draggable: true, icon: pinIcon, keyboard: false });
    if (hasCoords) marker.addTo(map);

    marker.on('dragend', () => {
      const point = marker.getLatLng();
      reverse(point.lat, point.lng);
    });
    map.on('click', (event) => {
      marker.setLatLng(event.latlng).addTo(map);
      reverse(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    const resize = () => map.invalidateSize();
    const timer = setTimeout(resize, 120);
    window.addEventListener('resize', resize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Map is created once; coordinate changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (!hasCoords) {
      marker.remove();
      return;
    }
    const point = L.latLng(value.latitude, value.longitude);
    marker.setLatLng(point).addTo(map);
    if (!map.getBounds().contains(point)) map.panTo(point);
  }, [hasCoords, value.latitude, value.longitude]);

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 3) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `${PHOTON}/api/?q=${encodeURIComponent(term)}&limit=6&lang=en`,
          { signal: controller.signal, headers: { Accept: 'application/json' } },
        );
        if (!response.ok) throw new Error('search failed');
        const data = await response.json();
        if (active) {
          setResults((data.features || []).map(toPlace).filter(Boolean));
          setMessage('');
        }
      } catch (err) {
        if (active && err.name !== 'AbortError') {
          setResults([]);
          setMessage('Place search is unavailable right now. You can still drop a pin on the map.');
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const useMyLocation = () => {
    setMessage('');
    if (!navigator.geolocation) {
      setMessage('This browser does not support location access. Search for a place or drop a pin instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapRef.current?.flyTo([latitude, longitude], 16, { duration: 0.8 });
        reverse(latitude, longitude);
      },
      (geoError) => {
        setLocating(false);
        setMessage(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission was blocked. Allow it in your browser, or search and drop a pin manually.'
            : 'Your location could not be determined. Search for a place or drop a pin instead.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    setMessage('');
    markerRef.current?.remove();
    mapRef.current?.setView(DEFAULT_CENTER, 5);
    onChange?.({ label: '', details: '', latitude: null, longitude: null });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="place-search" className="text-sm font-medium text-ink">Pickup location</label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60 dark:hover:bg-brand-900/30"
        >
          {locating ? <Loader2 size={12} className="animate-spin" /> : <Crosshair size={12} />}
          Use my location
        </button>
      </div>

      <div className="relative mt-1.5">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="place-search"
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search a campus, landmark, street or city…"
          autoComplete="off"
          className={cx(
            'h-11 w-full rounded-control border bg-surface pl-9 pr-16 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-line focus:border-brand-400 focus:ring-brand-500/20',
          )}
          aria-invalid={Boolean(error)}
        />
        {searching ? (
          <Loader2 size={14} className="absolute right-9 top-1/2 -translate-y-1/2 animate-spin text-muted" />
        ) : null}
        {query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear location"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition hover:bg-elevated hover:text-ink"
          >
            <X size={14} />
          </button>
        ) : null}

        {open && (results.length > 0 || searching) ? (
          <ul className="pop-in absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-control border border-line bg-surface/95 py-1 shadow-lift backdrop-blur-xl">
            {results.map((place, index) => (
              <li key={`${place.latitude}-${place.longitude}-${index}`}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyPlace(place, { fly: true })}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-elevated"
                >
                  <MapPin size={15} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">{place.label}</span>
                    {place.details ? <span className="block truncate text-[11px] text-muted">{place.details}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        ref={mapContainer}
        className="relative isolate z-0 mt-2 h-[210px] w-full overflow-hidden rounded-control border border-line bg-canvas"
        aria-label="Pickup location map"
      />

      {hasCoords ? (
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2 rounded-control bg-canvas px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <MapPin size={13} className="shrink-0 text-brand-500" />
              <span className="truncate">{value.label || fallbackName(value.latitude, value.longitude)}</span>
            </p>
            {value.details ? <p className="mt-0.5 truncate text-[11px] text-muted">{value.details}</p> : null}
            <p className="mt-0.5 text-[10px] text-muted">
              {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
              {' · '}
              <a
                href={`https://www.openstreetmap.org/?mlat=${value.latitude}&mlon=${value.longitude}#map=16/${value.latitude}/${value.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-600 hover:underline"
              >
                Open in OpenStreetMap
              </a>
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[10px] font-semibold text-success">
            <Check size={11} /> Pinned
          </span>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted">
          Search for a place, use your current location, or tap the map to drop a pin. Only the area is shown to buyers.
        </p>
      )}

      <p className="mt-1 text-[10px] text-muted">
        Search and address details by Photon · map data © OpenStreetMap contributors.
      </p>
      {message ? <p className="mt-1 text-[11px] text-warning">{message}</p> : null}
      {error ? <p className="mt-1 text-[11px] text-danger">{error}</p> : null}
    </div>
  );
}
