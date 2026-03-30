/**
 * 2D ISS Ground Track using react-leaflet.
 * Dynamically imported (ssr: false) from ISSCard.
 */

import React, { FC, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
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

type AutoPanProps = { position: ISSPosition };

const AutoPan: FC<AutoPanProps> = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lon], map.getZoom(), { animate: true, duration: 0.8 });
  }, [map, position.lat, position.lon]);
  return null;
};

type Props = {
  position: ISSPosition;
  track: GroundTrackPoint[];
  now: Date;
};

export const ISSGroundTrack2D: FC<Props> = ({ position, track, now }) => {
  const nowMs = now.getTime();
  const past = track.filter((p) => p.time.getTime() <= nowMs).map((p): [number, number] => [p.lat, p.lon]);
  const future = track.filter((p) => p.time.getTime() > nowMs).map((p): [number, number] => [p.lat, p.lon]);

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
      {past.length > 1 && (
        <Polyline
          positions={past}
          pathOptions={{ color: '#6b7280', weight: 1.5, dashArray: '4 4', opacity: 0.5 }}
        />
      )}
      {future.length > 1 && (
        <Polyline
          positions={future}
          pathOptions={{ color: '#22d3ee', weight: 2, opacity: 0.8 }}
        />
      )}
      <Marker position={[position.lat, position.lon]} icon={ISS_ICON} />
      <AutoPan position={position} />
    </MapContainer>
  );
};
