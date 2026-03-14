"use client";

import { useEffect, useRef, useCallback } from "react";

interface MapProps {
  lat: number;
  lng: number;
  medicLat?: number | null;
  medicLng?: number | null;
  routeCoords?: Array<{ lat: number; lng: number }>;
  medicName?: string;
  medicPhotoUrl?: string | null;
}

function buildMedicIconHtml(medicName?: string, medicPhotoUrl?: string | null): string {
  const inner = medicPhotoUrl
    ? `<img src="${medicPhotoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`
    : medicName
      ? `<span style="font-size:16px;font-weight:700;color:#0d9488;line-height:1;">${medicName.charAt(0).toUpperCase()}</span>`
      : `<span style="font-size:18px;line-height:1;">▲</span>`;
  return `<div style="width:38px;height:38px;background:#fff;border:3px solid #0d9488;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(13,148,136,0.35);overflow:hidden;">${inner}</div>`;
}

export default function Map({ lat, lng, medicLat, medicLng, routeCoords, medicName, medicPhotoUrl }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const medicMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLayerRef = useRef<any>(null);

  const recenter = useCallback(() => {
    if (!mapRef.current) return;
    if (routeLayerRef.current) {
      try { mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] }); return; } catch { /* ignore */ }
    }
    if (medicLat != null && medicLng != null) {
      try {
        const L = (window as any).L;
        if (L) mapRef.current.fitBounds(L.latLngBounds([[lat, lng], [medicLat, medicLng]]), { padding: [50, 50] });
      } catch { /* ignore */ }
    }
  }, [lat, lng, medicLat, medicLng]);

  // Инициализация карты
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, { center: [lat, lng], zoom: 15, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Маркер клиента (красный)
      const clientIcon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:#ef4444;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        className: "",
      });
      clientMarkerRef.current = L.marker([lat, lng], { icon: clientIcon }).addTo(map);

      // Маркер медика (бирюзовый)
      if (medicLat != null && medicLng != null) {
        const medicIcon = L.divIcon({
          html: buildMedicIconHtml(medicName, medicPhotoUrl),
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          className: "",
        });
        medicMarkerRef.current = L.marker([medicLat, medicLng], { icon: medicIcon }).addTo(map);
        const bounds = L.latLngBounds([[lat, lng], [medicLat, medicLng]]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      mapRef.current = map;
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clientMarkerRef.current = null;
        medicMarkerRef.current = null;
        routeLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обновление позиции клиента
  useEffect(() => {
    if (!mapRef.current || !clientMarkerRef.current) return;
    clientMarkerRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  // Обновление позиции медика
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;
      if (medicLat == null || medicLng == null) return;
      if (medicMarkerRef.current) {
        medicMarkerRef.current.setLatLng([medicLat, medicLng]);
      } else {
        const medicIcon = L.divIcon({
          html: buildMedicIconHtml(medicName, medicPhotoUrl),
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          className: "",
        });
        medicMarkerRef.current = L.marker([medicLat, medicLng], { icon: medicIcon }).addTo(mapRef.current);
        // fitBounds только при первом появлении медика на карте
        try {
          const bounds = L.latLngBounds([[lat, lng], [medicLat, medicLng]]);
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        } catch { /* ignore */ }
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicLat, medicLng]);

  // Обновление маршрута
  useEffect(() => {
    if (!mapRef.current || !routeCoords?.length) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;
      if (routeLayerRef.current) {
        try { mapRef.current.removeLayer(routeLayerRef.current); } catch { /* ignore */ }
      }
      routeLayerRef.current = L.polyline(
        routeCoords.map((c) => [c.lat, c.lng] as [number, number]),
        { color: "#0d9488", weight: 4, opacity: 0.8 }
      ).addTo(mapRef.current);
    });
    return () => { cancelled = true; };
  }, [routeCoords]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%", borderRadius: "inherit" }} />
        <button
          onClick={recenter}
          title="Вернуть к маршруту"
          style={{
            position: "absolute", top: 10, right: 10, zIndex: 1000,
            width: 36, height: 36,
            background: "#fff", border: "none", borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          🎯
        </button>
      </div>
    </>
  );
}
