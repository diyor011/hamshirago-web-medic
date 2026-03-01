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
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="20" rx="2" fill="white" />
          <rect x="2" y="9" width="20" height="6" rx="2" fill="white" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
