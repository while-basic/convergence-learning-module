import React, { useRef, useEffect } from 'react';
import { Landscape, Point } from '../types';

interface VisualizerProps {
  landscape: Landscape;
  agents: Point[];
  trails?: Point[][]; // Array of paths (history of positions) for each agent
  width?: number;
  height?: number;
  showTrails?: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ landscape, agents, trails = [], width = 400, height = 400, showTrails = true }) => {
  const landscapeCanvasRef = useRef<HTMLCanvasElement>(null);
  const trailsCanvasRef = useRef<HTMLCanvasElement>(null);

  // Function to map real coordinates to canvas pixels
  const toCanvas = (x: number, y: number) => {
    const rangeX = landscape.maxX - landscape.minX;
    const rangeY = landscape.maxY - landscape.minY;
    const px = ((x - landscape.minX) / rangeX) * width;
    const py = height - ((y - landscape.minY) / rangeY) * height; // Invert Y for canvas
    return { x: px, y: py };
  };

  // Draw Landscape (Heatmap style) - Only redraws when landscape changes
  useEffect(() => {
    const canvas = landscapeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    
    // Find min/max value for normalization estimate
    let minZ = Infinity;
    let maxZ = -Infinity;
    
    // Coarse pass for scaling
    for(let cx = 0; cx < width; cx+=20) {
        for(let cy = 0; cy < height; cy+=20) {
             const lx = landscape.minX + (cx / width) * (landscape.maxX - landscape.minX);
             const ly = landscape.minY + ((height - cy) / height) * (landscape.maxY - landscape.minY);
             const z = landscape.func(lx, ly);
             if(z < minZ) minZ = z;
             if(z > maxZ) maxZ = z;
        }
    }
    if (minZ === Infinity) minZ = 0;
    if (maxZ === -Infinity) maxZ = 100;
    if (maxZ === minZ) maxZ = minZ + 1;

    // Draw pixels
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const lx = landscape.minX + (px / width) * (landscape.maxX - landscape.minX);
        const ly = landscape.minY + ((height - py) / height) * (landscape.maxY - landscape.minY);
        
        const z = landscape.func(lx, ly);
        
        // Normalize Z 0..1
        const t = Math.max(0, Math.min(1, (z - minZ) / (maxZ - minZ)));
        
        // OLED Style: Deep Black to White with Blue tint
        const intensity = Math.floor(t * 255);
        
        const index = (py * width + px) * 4;
        data[index] = intensity * 0.2;     // R
        data[index + 1] = intensity * 0.2; // G
        data[index + 2] = intensity * 0.5 + 20; // B
        data[index + 3] = 255;             // Alpha
      }
    }
    
    ctx.putImageData(imgData, 0, 0);

  }, [landscape, width, height]);

  // Trails Layer - Redraws when trails change
  useEffect(() => {
      const canvas = trailsCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      if (showTrails && trails.length > 0) {
        ctx.lineWidth = 1;
        trails.forEach((trail) => {
            if(trail.length < 2) return;
            ctx.beginPath();
            // Gradient trail or simple fade
            ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`; 
            
            const start = toCanvas(trail[0].x, trail[0].y);
            ctx.moveTo(start.x, start.y);
            
            for(let j=1; j<trail.length; j++) {
                const p = toCanvas(trail[j].x, trail[j].y);
                ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        });
      }
  }, [trails, landscape, width, height, showTrails]);

  return (
    <div className="relative border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-blue-900/10" style={{ width, height }}>
       {/* Background Layer: Landscape Heatmap */}
       <canvas 
         ref={landscapeCanvasRef} 
         width={width} 
         height={height} 
         className="absolute top-0 left-0 z-0"
       />
       
       {/* Middle Layer: Trails */}
       <canvas
         ref={trailsCanvasRef}
         width={width}
         height={height}
         className="absolute top-0 left-0 z-10 pointer-events-none"
       />
       
       {/* Agent Layer (DOM elements for crispness/animations) */}
       <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20">
         {agents.map((agent, i) => {
            const pos = toCanvas(agent.x, agent.y);
            return (
                <div 
                    key={i}
                    className="absolute w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-75 ease-linear"
                    style={{ 
                        left: pos.x, 
                        top: pos.y, 
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: i === 0 && agents.length > 1 ? '#34C759' : '#FFFFFF', // Best agent green
                        boxShadow: i === 0 && agents.length > 1 ? '0 0 15px #34C759' : '0 0 10px rgba(255,255,255,0.8)'
                    }} 
                />
            )
         })}
       </div>
       
       <div className="absolute bottom-2 left-2 text-xs text-white/50 font-mono pointer-events-none z-30">
          Domain: [{landscape.minX}, {landscape.maxX}] × [{landscape.minY}, {landscape.maxY}]
       </div>
    </div>
  );
};

export default Visualizer;