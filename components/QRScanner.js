import { useEffect, useRef, useState } from 'react';

export default function QRScanner({ onScan, onError, isActive }) {
  const videoRef = useRef();
  const [scanner, setScanner] = useState(null);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isActive) {
      import('qr-scanner').then(({ default: QrScanner }) => {
        const qrScanner = new QrScanner(
          videoRef.current,
          (result) => {
            onScan(result.data);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 1
          }
        );

        QrScanner.hasCamera().then(setHasCamera);
        setScanner(qrScanner);

        return () => {
          qrScanner.destroy();
        };
      });
    }

    return () => {
      if (scanner) {
        scanner.destroy();
      }
    };
  }, [isActive, onScan]);

  useEffect(() => {
    if (scanner && isActive) {
      scanner.start().catch(onError);
    } else if (scanner) {
      scanner.stop();
    }
  }, [scanner, isActive, onError]);

  if (!hasCamera && isActive) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
        <p className="text-red-200">📷 Camera not available</p>
        <p className="text-red-300 text-sm mt-2">Please check camera permissions</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full max-w-md mx-auto rounded-xl shadow-lg"
        style={{ maxHeight: '400px' }}
      />
      <div className="absolute inset-0 border-2 border-cyan-400 rounded-xl pointer-events-none">
        <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-cyan-400"></div>
        <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-cyan-400"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-cyan-400"></div>
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-cyan-400"></div>
      </div>
    </div>
  );
}