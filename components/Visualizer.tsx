import React, { useRef, useEffect } from 'react';
import { Landscape, Point } from '../types';

interface VisualizerProps {
  landscape: Landscape;
  agents: Point[];
  trails?: Point[][]; // Array of paths (history of positions) for each agent
  width?: number;
  height?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ landscape, agents, trails = [], width = 400, height = 400 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Function to map real coordinates to canvas pixels
  const toCanvas = (x: number, y: number) => {
    const rangeX = landscape.maxX - landscape.minX;
    const rangeY = landscape.maxY - landscape.minY;
    const px = ((x - landscape.minX) / rangeX) * width;
    const py = height - ((y - landscape.minY) / rangeY) * height; // Invert Y for canvas
    return { x: px, y: py };
  };

  // Draw Landscape (Heatmap style)
  useEffect(() => {
    const canvas = canvasRef.current;
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
        
        data[index] = intensity * 0.2;     // R
        data[index + 1] = intensity * 0.2; // G
        data[index + 2] = intensity * 0.5 + 20; // B
        data[index + 3] = 255;             // Alpha
        
        // Index increment
        var index = (py * width + px) * 4;
      }
    }
    
    ctx.putImageData(imgData, 0, 0);

  }, [landscape, width, height]);

  // Trails Layer (Canvas for performance)
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // We draw trails on top of the existing image data, so we don't clearRect if we want to keep the background.
      // Ideally, we'd use layers. For now, we redraw trails every time agents update (or trails update).
      // Since the background `useEffect` only runs on landscape change, we need to handle trail drawing carefully.
      // Re-drawing trails over the persistent background image is tricky without a second canvas.
      // For this simplified version, we will rely on the DOM overlay for agents, but trails need a canvas.
      
      // FIX: To avoid erasing the heatmap, we essentially need a transparent canvas on top.
      // However, current implementation has one canvas. 
      // Let's assume the user accepts the heatmap is static and we only draw trails if we had a 2nd canvas.
      // OR, we just render trails as SVG/Divs? Too heavy.
      // Let's rely on the DOM overlay for dots, and maybe skip trails for this specific component structure 
      // OR update the component structure to have a 2nd canvas.
      
      // Let's add a second canvas ref for trails/agents dynamically?
      // No, let's just use the existing one? No, `putImageData` overwrites.
      
      // We will skip trails implementation inside the MAIN canvas and add a secondary absolute canvas below.
  }, [trails]);

  return (
    <div className="relative border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-blue-900/10" style={{ width, height }}>
       {/* Background Layer: Landscape Heatmap */}
       <canvas 
         ref={canvasRef} 
         width={width} 
         height={height} 
         className="absolute top-0 left-0"
       />
       
       {/* Middle Layer: Trails (New Canvas) */}
       <canvas
         width={width}
         height={height}
         className="absolute top-0 left-0 pointer-events-none"
         ref={(node) => {
             if(node && trails.length > 0) {
                 const ctx = node.getContext('2d');
                 if(ctx) {
                     ctx.clearRect(0, 0, width, height);
                     ctx.lineWidth = 1;
                     trails.forEach((trail, i) => {
                         if(trail.length < 2) return;
                         ctx.beginPath();
                         // Fade out trails
                         ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`; 
                         const start = toCanvas(trail[0].x, trail[0].y);
                         ctx.moveTo(start.x, start.y);
                         
                         for(let j=1; j<trail.length; j++) {
                             const p = toCanvas(trail[j].x, trail[j].y);
                             ctx.lineTo(p.x, p.y);
                         }
                         ctx.stroke();
                     });
                 }
             }
         }}
       />
       
       {/* Agent Layer */}
       <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
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
                        backgroundColor: i === 0 && agents.length > 1 ? '#34C759' : '#FFFFFF'
                    }} 
                />
            )
         })}
       </div>
       
       <div className="absolute bottom-2 left-2 text-xs text-white/50 font-mono pointer-events-none">
          Domain: [{landscape.minX}, {landscape.maxX}] × [{landscape.minY}, {landscape.maxY}]
       </div>
    </div>
  );
};

export default Visualizer;