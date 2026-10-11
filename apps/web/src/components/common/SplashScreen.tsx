import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 2000, // เพิ่มเวลาให้พอดีกับการรับรู้ (2 วินาที)
}) => {
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // เริ่ม Fade out ล่วงหน้า 400ms ก่อนหมดเวลา
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, duration - 400);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 180);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white text-slate-900 select-none transition-opacity duration-400 cursor-pointer ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Container: โชว์โลโก้สะอาด นิ่ง ไม่กระพริบ ไม่วาดเส้น */}
      <div className="flex flex-col items-center">
        {/* Emblem & Brand Title */}
        <div className="flex items-center gap-3.5 mb-2 transition-transform duration-300 hover:scale-105">
          <img
            src="/logo.png"
            alt="KEYSTAY Logo"
            className="w-14 h-14 object-contain drop-shadow-sm"
          />
          <span className="text-3xl font-bold tracking-wider text-slate-900 font-sans leading-none">
            KEYSTAY
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-[11px] tracking-[0.25em] uppercase text-orange-500 font-semibold mt-1">
          ENTERPRISE HOSPITALITY SYSTEM
        </p>

        {/* Subtle Progress Bar */}
        <div className="w-36 h-[2px] bg-slate-100 rounded-full mt-8 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full"
            style={{
              animation: `splashProgress ${duration}ms linear forwards`,
            }}
          />
        </div>

        <span className="text-[10px] text-slate-400 mt-4 font-sans">
          คลิกที่ใดก็ได้เพื่อข้าม
        </span>
      </div>

      <style>{`
        @keyframes splashProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
