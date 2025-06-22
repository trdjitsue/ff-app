import { useEffect, useRef, useState } from 'react';

export default function QRScanner({ onScan, onError, isActive }) {
  const videoRef = useRef();
  const [scanner, setScanner] = useState(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);
  }, []);

  const checkCameraPermission = async () => {
    try {
      // For iOS, we need to request permission explicitly
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment' // Use back camera
          } 
        });
        
        // Stop the stream immediately, we just needed to check permission
        stream.getTracks().forEach(track => track.stop());
        setHasCamera(true);
        setPermissionStatus('granted');
        return true;
      } else {
        setPermissionStatus('not-supported');
        return false;
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      if (error.name === 'NotAllowedError') {
        setPermissionStatus('denied');
      } else if (error.name === 'NotFoundError') {
        setPermissionStatus('no-camera');
      } else {
        setPermissionStatus('error');
      }
      return false;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && isActive) {
      // First check camera permission
      checkCameraPermission().then(hasPermission => {
        if (hasPermission) {
          import('qr-scanner').then(({ default: QrScanner }) => {
            const qrScanner = new QrScanner(
              videoRef.current,
              (result) => {
                onScan(result.data);
              },
              {
                highlightScanRegion: true,
                highlightCodeOutline: true,
                maxScansPerSecond: 1,
                preferredCamera: 'environment' // Use back camera
              }
            );

            QrScanner.hasCamera().then(setHasCamera);
            setScanner(qrScanner);

            return () => {
              qrScanner.destroy();
            };
          }).catch(error => {
            console.error('QR Scanner import error:', error);
            onError('ไม่สามารถโหลด QR Scanner ได้');
          });
        }
      });
    }

    return () => {
      if (scanner) {
        scanner.destroy();
      }
    };
  }, [isActive, onScan]);

  useEffect(() => {
    if (scanner && isActive && hasCamera) {
      scanner.start().catch(error => {
        console.error('Scanner start error:', error);
        onError('ไม่สามารถเริ่มกล้องได้: ' + error.message);
      });
    } else if (scanner) {
      scanner.stop();
    }
  }, [scanner, isActive, onError, hasCamera]);

  const requestCameraPermission = async () => {
    setPermissionStatus('requesting');
    const hasPermission = await checkCameraPermission();
    if (hasPermission) {
      window.location.reload(); // Reload to reinitialize scanner
    }
  };

  if (permissionStatus === 'checking') {
    return (
      <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-blue-200">🔍 กำลังตรวจสอบกล้อง...</p>
      </div>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
        <p className="text-red-200 mb-4">📷 ไม่ได้รับอนุญาตใช้กล้อง</p>
        {isIOS ? (
          <div className="text-red-300 text-sm space-y-2">
            <p><strong>สำหรับ iPhone/iPad:</strong></p>
            <p>1. ไปที่ Settings → Safari → Camera</p>
            <p>2. เลือก "Ask" หรือ "Allow"</p>
            <p>3. รีเฟรชหน้าเว็บนี้</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              รีเฟรชหน้า
            </button>
          </div>
        ) : (
          <div className="text-red-300 text-sm space-y-2">
            <p>กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์</p>
            <button 
              onClick={requestCameraPermission}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              ขออนุญาตใหม่
            </button>
          </div>
        )}
      </div>
    );
  }

  if (permissionStatus === 'no-camera') {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
        <p className="text-red-200">📷 ไม่พบกล้อง</p>
        <p className="text-red-300 text-sm mt-2">อุปกรณ์นี้ไม่มีกล้อง</p>
      </div>
    );
  }

  if (permissionStatus === 'not-supported') {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
        <p className="text-red-200">📷 เบราว์เซอร์ไม่รองรับกล้อง</p>
        <p className="text-red-300 text-sm mt-2">กรุณาใช้เบราว์เซอร์ที่รองรับ</p>
      </div>
    );
  }

  if (!hasCamera && isActive) {
    return (
      <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6 text-center">
        <p className="text-yellow-200 mb-4">📷 กำลังเชื่อมต่อกล้อง...</p>
        <button 
          onClick={requestCameraPermission}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full max-w-md mx-auto rounded-xl shadow-lg"
        style={{ maxHeight: '400px' }}
        playsInline
        muted
      />
      <div className="absolute inset-0 border-2 border-cyan-400 rounded-xl pointer-events-none">
        <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-cyan-400"></div>
        <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-cyan-400"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-cyan-400"></div>
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-cyan-400"></div>
      </div>
      
      {isIOS && (
        <div className="mt-4 text-center text-white/70 text-sm">
          💡 หากกล้องไม่ทำงาน ลองรีเฟรชหน้าเว็บ
        </div>
      )}
    </div>
  );
}