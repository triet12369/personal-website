/**
 * 2D ISS Ground Track using react-leaflet.
 * Dynamically imported (ssr: false) from ISSCard.
 *
 * All moving parts (marker, polylines, pan) are managed imperatively via
 * Leaflet's API so that MapContainer/TileLayer never re-render and tiles
 * never flash.
 */

import React, { FC, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { GroundTrackPoint, ISSPosition } from '../../lib/iss';

// Fix missing default icon paths broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl'];
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ISS_ICON = L.divIcon({
  html: '<img src="/images/iss_icon.png" style="width:32px;height:32px;" />',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

type LayersProps = {
  position: ISSPosition;
  track: GroundTrackPoint[];
};

/** Inner component: has access to the Leaflet map context and manages all layers imperatively. */
const ISSLayers: FC<LayersProps> = ({ position, track }) => {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const pastLineRef = useRef<L.Polyline | null>(null);
  const futureLineRef = useRef<L.Polyline | null>(null);

  // Create layers once on mount; remove on unmount
  useEffect(() => {
    const marker = L.marker([position.lat, position.lon], { icon: ISS_ICON }).addTo(map);
    const pastLine = L.polyline([], { color: '#6b7280', weight: 1.5, dashArray: '4 4', opacity: 0.5 }).addTo(map);
    const futureLine = L.polyline([], { color: '#22d3ee', weight: 2, opacity: 0.8 }).addTo(map);
    markerRef.current = marker;
    pastLineRef.current = pastLine;
    futureLineRef.current = futureLine;
    return () => {
      marker.remove();
      pastLine.remove();
      futureLine.remove();
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move marker + pan every ~200ms — no DOM paint, just coordinate update
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([position.lat, position.lon]);
    map.panTo([position.lat, position.lon], { animate: true, duration: 0.15 });
  }, [position, map]);

  // Rebuild polylines only when track refreshes (~every 60s)
  useEffect(() => {
    if (!pastLineRef.current || !futureLineRef.current) return;
    const nowMs = Date.now();
    const past: [number, number][] = track
      .filter((p) => p.time.getTime() <= nowMs)
      .map((p) => [p.lat, p.lon]);
    const future: [number, number][] = track
      .filter((p) => p.time.getTime() > nowMs)
      .map((p) => [p.lat, p.lon]);
    pastLineRef.current.setLatLngs(past);
    futureLineRef.current.setLatLngs(future);
  }, [track]);

  return null;
};

type Props = {
  position: ISSPosition;
  track: GroundTrackPoint[];
  now: Date; // kept for API compatibility; not used directly (Date.now() used inside)
};

export const ISSGroundTrack2D: FC<Props> = ({ position, track }) => {
  return (
    <MapContainer
      center={[position.lat, position.lon]}
      zoom={2}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <ISSLayers position={position} track={track} />
    </MapContainer>
  );
};
