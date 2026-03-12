import React, { useEffect, useRef } from 'react';

interface WaterfallProps {
  data: number[]; // Array of signal strengths (0-1)
  width: number;
  height: number;
}

export const Waterfall: React.FC<WaterfallProps> = ({ data, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!bufferRef.current) {
      bufferRef.current = document.createElement('canvas');
      bufferRef.current.width = width;
      bufferRef.current.height = height;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferCtx = bufferRef.current.getContext('2d');

    if (!ctx || !bufferCtx) return;

    // Shift buffer down
    bufferCtx.drawImage(bufferRef.current, 0, 1);

    // Draw new line at the top
    const imageData = bufferCtx.createImageData(width, 1);
    for (let i = 0; i < width; i++) {
      // Map canvas pixel to data point
      const dataIdx = Math.floor((i / width) * data.length);
      const val = data[dataIdx] || 0;
      const idx = i * 4;
      
      // Heatmap color mapping (Blue -> Green -> Yellow -> Red)
      if (val < 0.2) {
        imageData.data[idx] = 0;
        imageData.data[idx + 1] = Math.floor(val * 5 * 100);
        imageData.data[idx + 2] = 150;
      } else if (val < 0.4) {
        imageData.data[idx] = 0;
        imageData.data[idx + 1] = 200;
        imageData.data[idx + 2] = Math.floor((1 - (val - 0.2) * 5) * 200);
      } else if (val < 0.6) {
        imageData.data[idx] = Math.floor((val - 0.4) * 5 * 255);
        imageData.data[idx + 1] = 255;
        imageData.data[idx + 2] = 0;
      } else if (val < 0.8) {
        imageData.data[idx] = 255;
        imageData.data[idx + 1] = Math.floor((1 - (val - 0.6) * 5) * 255);
        imageData.data[idx + 2] = 0;
      } else {
        imageData.data[idx] = 255;
        imageData.data[idx + 1] = 0;
        imageData.data[idx + 2] = 0;
      }
      imageData.data[idx + 3] = 255; // Alpha
    }
    bufferCtx.putImageData(imageData, 0, 0);

    // Copy buffer to main canvas
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bufferRef.current, 0, 0);
  }, [data, width, height]);

  return (
    <div className="relative border border-zinc-800 bg-black overflow-hidden rounded-lg">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full block"
      />
      <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] font-mono text-emerald-500 border border-emerald-500/30 uppercase tracking-wider">
        Waterfall Display
      </div>
    </div>
  );
};
