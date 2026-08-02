import React, { useState, useEffect, useRef } from 'react';

export default function WebcamCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Unable to access camera. Please check permissions.');
        console.error(err);
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSnap = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onCapture(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 fade-in">
      <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-xl text-charcoal">Capture Photo</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500 transition flex items-center gap-1">
            <span className="text-sm uppercase tracking-wider font-bold">Cancel</span>
          </button>
        </div>
        
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded text-center mb-4">{error}</div>
        ) : (
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
        )}
        
        <div className="mt-6 flex justify-center">
          <button 
            type="button"
            onClick={handleSnap} 
            disabled={!!error}
            className="bg-gold-500 text-white px-8 py-3 rounded-full hover:bg-gold-600 transition shadow-lg flex items-center gap-2 uppercase tracking-widest text-sm font-bold disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Snap Photo
          </button>
        </div>
      </div>
    </div>
  );
}
