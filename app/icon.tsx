import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 38,
          color: '#fff',
          fontSize: 108,
          fontWeight: 700,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        H
      </div>
    ),
    { ...size },
  );
}
