import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #0d9488 0%, #065f46 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
        }}
      >
        {/* Просто большой белый крест */}
        <svg width="130" height="130" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="1" width="6" height="22" rx="3" fill="white" />
          <rect x="1" y="9" width="22" height="6" rx="3" fill="white" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
