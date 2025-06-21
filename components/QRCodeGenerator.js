import { useEffect, useRef } from 'react';

const QRCodeGenerator = ({ value, size = 200 }) => {
  const canvasRef = useRef();

  useEffect(() => {
    if (typeof window !== 'undefined' && value) {
      import('qrcode').then((QRCode) => {
        QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 2,
          color: {
            dark: '#1a1a2e',
            light: '#ffffff'
          }
        });
      });
    }
  }, [value, size]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="rounded-lg shadow-lg" />
      <p className="text-sm text-white/70 mt-2 text-center break-all max-w-[200px]">
        Student ID: {value?.split('-')[0]}
      </p>
    </div>
  );
};

export default QRCodeGenerator;