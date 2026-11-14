import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LocationMap({ latitude, longitude, label, details, className = '' }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!container.current || mapRef.current) return undefined;
    const map = L.map(container.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([latitude, longitude], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);
    const marker = L.circleMarker([latitude, longitude], {
      radius: 9,
      color: '#FFFFFF',
      weight: 3,
      fillColor: '#F26B3A',
      fillOpacity: 1,
    }).addTo(map);
    const popup = document.createElement('div');
    const title = document.createElement('p');
    title.style.cssText = 'margin:0;font-weight:600;font-size:12px';
    title.textContent = label || 'Pickup area';
    popup.appendChild(title);
    if (details) {
      const line = document.createElement('p');
      line.style.cssText = 'margin:2px 0 0;font-size:11px;color:#78828F';
      line.textContent = details;
      popup.appendChild(line);
    }
    marker.bindPopup(popup);
    mapRef.current = map;
    markerRef.current = marker;
    const timer = setTimeout(() => map.invalidateSize(), 120);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([latitude, longitude]);
    if (!map.getBounds().contains([latitude, longitude])) map.panTo([latitude, longitude]);
  }, [latitude, longitude]);

  return (
    <div
      ref={container}
      className={`isolate z-0 h-[220px] w-full bg-canvas ${className}`}
      aria-label="Pickup location map"
    />
  );
}
