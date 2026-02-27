"use client";

import { useEffect, useRef } from "react";

export interface MedicMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  distanceKm?: number;
}

interface MapProps {
  lat: number;
  lng: number;
  onMove?: (lat: number, lng: number) => void;
  medics?: MedicMarker[];
}

export default function Map({ lat, lng, onMove, medics = [] }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const medicMarkersRef = useRef<unknown[]>([]);

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

  // Обновляем маркеры медиков при изменении списка
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      // Удаляем старые маркеры
      medicMarkersRef.current.forEach((m) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m as any).remove();
      });
      medicMarkersRef.current = [];

      // Добавляем новые
      medics.forEach((medic) => {
        if (medic.lat == null || medic.lng == null) return;
        const icon = L.divIcon({
          html: `
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              cursor: pointer;
            ">
              <div style="
                width: 34px; height: 34px;
                background: #fff;
                border: 3px solid #0d9488;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(13,148,136,0.35);
                font-size: 16px;
              ">👩‍⚕️</div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          className: "",
        });

        const distText = medic.distanceKm != null
          ? ` • ${medic.distanceKm.toFixed(1)} км`
          : "";
        const ratingText = medic.rating != null
          ? `⭐ ${medic.rating.toFixed(1)}`
          : "Нет оценок";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = L.marker([medic.lat, medic.lng], { icon }).addTo(mapRef.current as any);
        m.bindPopup(`
          <div style="font-family: sans-serif; min-width: 130px;">
            <b style="font-size:14px;">${medic.name}</b><br/>
            <span style="color:#64748b; font-size:12px;">${ratingText}${distText}</span>
          </div>
        `);
        medicMarkersRef.current.push(m);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medics]);

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
