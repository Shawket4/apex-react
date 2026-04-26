// src/shared/ui/map-view.tsx
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  title?: string;
  popupHtml?: string;
}

export interface MapViewProps {
  markers?: MapMarker[];
  route?: Array<[number, number]>;
  centerFallback?: [number, number];
  height?: string | number;
  className?: string;
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

let isGoogleMapsConfigured = false;

export function MapView({
  markers = [],
  route = [],
  centerFallback = [30.0444, 31.2357],
  height = 400,
  className,
}: MapViewProps) {
  const { i18n } = useTranslation();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<google.maps.Map | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        // Only set options once per session to avoid console warnings
        if (!isGoogleMapsConfigured) {
          setOptions({
            key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
            v: 'weekly',
            language: i18n.language || 'en',
          });
          isGoogleMapsConfigured = true;
        }

        // Load the libraries needed. This populates the window.google.maps namespace.
        await Promise.all([
          importLibrary('maps'),
          importLibrary('marker')
        ]);

        if (!isMounted || !containerRef.current) return;

        const isDark = document.documentElement.classList.contains('dark');

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: centerFallback[0], lng: centerFallback[1] },
          zoom: 11,
          styles: isDark ? darkMapStyle : [],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;
        const bounds = new google.maps.LatLngBounds();
        let hasBounds = false;

        if (route.length > 0) {
          const path = route.map(([lat, lng]) => ({ lat, lng }));
          const polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#1F4DC0',
            strokeOpacity: 0.8,
            strokeWeight: 4,
          });
          polyline.setMap(map);
          path.forEach((point) => {
            bounds.extend(point);
            hasBounds = true;
          });
        }

        const infoWindow = new google.maps.InfoWindow();
        markers.forEach((markerInfo) => {
          const svgIcon = encodeURIComponent(`
            <svg fill="${markerInfo.color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="white" stroke-width="1.5"/>
            </svg>
          `);

          const position = { lat: markerInfo.lat, lng: markerInfo.lng };
          const marker = new google.maps.Marker({
            position,
            map,
            title: markerInfo.title,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${svgIcon}`,
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32),
            },
          });

          bounds.extend(position);
          hasBounds = true;

          if (markerInfo.popupHtml) {
            marker.addListener('click', () => {
              infoWindow.setContent(markerInfo.popupHtml!);
              infoWindow.open(map, marker);
            });
          }
        });

        if (hasBounds) {
          if (markers.length === 1 && route.length === 0) {
            map.setCenter(bounds.getCenter());
            map.setZoom(14);
          } else {
            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
          }
        }
      } catch (error) {
        console.error("Failed to initialize Google Maps:", error);
      }
    };

    void initMap();

    return () => {
      isMounted = false;
    };
  }, [markers, route, centerFallback, i18n.language]);

  return <div ref={containerRef} style={{ height }} className={className} />;
}