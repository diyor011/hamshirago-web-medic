"use client";

import { useEffect, useRef } from "react";

interface MapProps {
  lat: number;
  lng: number;
  onMove?: (lat: number, lng: number) => void;
}

export default function Map({ lat, lng, onMove }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    // Динамический импорт — leaflet нужен только на клиенте
    import("leaflet").then((L) => {
      // Если компонент уже размонтировали (StrictMode / fast refresh) — выходим
      if (!mounted || !containerRef.current || mapRef.current) return;

      // Фикс иконок leaflet в Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Кастомный маркер в цвет бренда
      const icon = L.divIcon({
        html: `
          <div style="
            width: 36px; height: 36px;
            background: #0d9488;
            border: 3px solid #fff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          "></div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        className: "",
      });

      const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onMove?.(pos.lat, pos.lng);
      });

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng]);
        onMove?.(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any).remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обновляем позицию маркера и карты при изменении lat/lng снаружи
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (markerRef.current as any).setLatLng([lat, lng]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mapRef.current as any).setView([lat, lng], 16, { animate: true });
  }, [lat, lng]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
      />
    </>
  );
}
