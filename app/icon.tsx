import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #0f766e 0%, #134e4a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
        }}
      >
        {/* Силуэт медсестры с крестом на груди */}
        <svg width="145" height="150" viewBox="0 0 100 110" fill="none">
          {/* Голова */}
          <circle cx="50" cy="22" r="18" fill="white" />
          {/* Тело / плечи */}
          <path d="M5 110 C5 70 22 55 50 55 C78 55 95 70 95 110 Z" fill="white" />
          {/* Крест на груди */}
          <rect x="43" y="66" width="14" height="28" rx="3" fill="#0f766e" />
          <rect x="35" y="74" width="30" height="12" rx="3" fill="#0f766e" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
