"use client";

import { useEffect, useRef } from "react";

interface TrackingMapProps {
  clientLat: number;
  clientLng: number;
  medicLat: number;
  medicLng: number;
  medicName: string;
}

export default function TrackingMap({
  clientLat,
  clientLng,
  medicLat,
  medicLng,
  medicName,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const medicMarkerRef = useRef<unknown>(null);
  const lineRef = useRef<unknown>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Client marker
      const clientIcon = L.divIcon({
        html: `<div style="width:32px;height:32px;background:#0d9488;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        className: "",
      });
      L.marker([clientLat, clientLng], { icon: clientIcon })
        .addTo(map)
        .bindPopup("Ваш адрес");

      // Medic marker
      const medicIcon = L.divIcon({
        html: `<div style="width:38px;height:38px;background:#fff;border:3px solid #0d9488;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(13,148,136,0.35);font-size:18px;">👩‍⚕️</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        className: "",
      });
      const medicMarker = L.marker([medicLat, medicLng], { icon: medicIcon })
        .addTo(map)
        .bindPopup(medicName);
      medicMarkerRef.current = medicMarker;

      // Dashed line
      const line = L.polyline(
        [[clientLat, clientLng], [medicLat, medicLng]],
        { color: "#0d9488", weight: 2.5, dashArray: "6 6", opacity: 0.7 }
      ).addTo(map);
      lineRef.current = line;

      map.fitBounds([[clientLat, clientLng], [medicLat, medicLng]], { padding: [40, 40] });
      mapRef.current = map;
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any).remove();
        mapRef.current = null;
        medicMarkerRef.current = null;
        lineRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update medic position on prop change
  useEffect(() => {
    if (!mapRef.current || !medicMarkerRef.current || !lineRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (medicMarkerRef.current as any).setLatLng([medicLat, medicLng]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lineRef.current as any).setLatLngs([[clientLat, clientLng], [medicLat, medicLng]]);
  }, [medicLat, medicLng, clientLat, clientLng]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ width: "100%", height: "100%", borderRadius: "inherit" }} />
    </>
  );
}
