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

// Premium subtle dark style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

// Premium clean light style (reduces POI clutter)
const lightMapStyle = [
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
];

let isGoogleMapsConfigured = false;

// Injects CSS to force Google Maps InfoWindows to respect dark mode
function injectInfoWindowStyles() {
  const styleId = 'gmaps-info-window-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      .dark .gm-style-iw.gm-style-iw-c { background-color: #18181b !important; padding: 12px !important; border-radius: 8px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.5); }
      .dark .gm-style-iw-tc::after { background: #18181b !important; }
      .dark .gm-style-iw-d { overflow: hidden !important; }
      .dark .gm-ui-hover-effect > span { background-color: #a1a1aa !important; }
      .gm-style-iw-d { overflow: hidden !important; }
    `;
    document.head.appendChild(style);
  }
}

export function MapView({
  markers = [],
  route = [],
  centerFallback = [30.0444, 31.2357],
  height = 400,
  className,
}: MapViewProps) {
  const { i18n } = useTranslation();
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;
    injectInfoWindowStyles();

    const initMap = async () => {
      try {
        if (!isGoogleMapsConfigured) {
          setOptions({
            key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
            v: 'weekly',
            language: i18n.language || 'en',
          });
          isGoogleMapsConfigured = true;
        }

        await Promise.all([importLibrary('maps'), importLibrary('marker')]);
        if (!isMounted || !containerRef.current) return;

        const isDark = document.documentElement.classList.contains('dark');

        const map = new google.maps.Map(containerRef.current, {
          center: { lat: centerFallback[0], lng: centerFallback[1] },
          zoom: 11,
          styles: isDark ? darkMapStyle : lightMapStyle,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const bounds = new google.maps.LatLngBounds();
        let hasBounds = false;

        // Draw Route (Layered for visual pop)
        if (route.length > 0) {
          const path = route.map(([lat, lng]) => ({ lat, lng }));
          
          // 1. Casing (Background Outline)
          const casing = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: isDark ? '#18181b' : '#ffffff',
            strokeOpacity: 1.0,
            strokeWeight: 8,
          });
          casing.setMap(map);

          // 2. Main Polyline
          const polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#3b82f6', // Bright blue
            strokeOpacity: 0.9,
            strokeWeight: 4,
          });
          polyline.setMap(map);

          path.forEach((point) => {
            bounds.extend(point);
            hasBounds = true;
          });
        }

        const infoWindow = new google.maps.InfoWindow();

        // Draw Markers
        markers.forEach((markerInfo) => {
          // Modern teardrop pin with a central dot
          const svgIcon = encodeURIComponent(`
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 2C11.373 2 6 7.373 6 14C6 23 18 34 18 34C18 34 30 23 30 14C30 7.373 24.627 2 18 2Z" fill="${markerInfo.color}"/>
              <circle cx="18" cy="14" r="5" fill="white"/>
            </svg>
          `);

          const position = { lat: markerInfo.lat, lng: markerInfo.lng };
          const marker = new google.maps.Marker({
            position,
            map,
            title: markerInfo.title,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${svgIcon}`,
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 36), // Anchor bottom center
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
            // Apply generous padding so markers/routes aren't clipped by the edges
            map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
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