import { AlgorithmType, Landscape, Point } from '../types';

// Helper: Random number in range
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper: Clamp value
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const stepSimulation = (
  algo: AlgorithmType,
  agents: Point[],
  landscape: Landscape,
  iteration: number,
  config: { stepSize: number; temperature: number; mutationRate: number }
): Point[] => {
  const { func, minX, maxX, minY, maxY } = landscape;
  const newAgents: Point[] = [];

  switch (algo) {
    case AlgorithmType.GREEDY: // Simple Hill Climbing (Steepest Descent equivalent here)
    case AlgorithmType.HILL_CLIMBING:
      agents.forEach(agent => {
        // Try moves in 4 directions
        const directions = [
          { dx: config.stepSize, dy: 0 },
          { dx: -config.stepSize, dy: 0 },
          { dx: 0, dy: config.stepSize },
          { dx: 0, dy: -config.stepSize },
        ];
        
        let bestMove = { ...agent };
        
        for (const dir of directions) {
          const nx = clamp(agent.x + dir.dx, minX, maxX);
          const ny = clamp(agent.y + dir.dy, minY, maxY);
          const nVal = func(nx, ny);
          
          if (nVal < bestMove.value) {
            bestMove = { x: nx, y: ny, value: nVal };
          }
        }
        newAgents.push(bestMove);
      });
      break;

    case AlgorithmType.SIMULATED_ANNEALING:
      agents.forEach(agent => {
        // Generate random neighbor
        const angle = Math.random() * Math.PI * 2;
        const dist = config.stepSize;
        const nx = clamp(agent.x + Math.cos(angle) * dist, minX, maxX);
        const ny = clamp(agent.y + Math.sin(angle) * dist, minY, maxY);
        const nVal = func(nx, ny);

        const currentTemp = config.temperature / (1 + iteration * 0.1);
        const delta = nVal - agent.value;

        // Metropolis Criterion: Accept if better, or if lucky based on temp
        if (delta < 0 || Math.random() < Math.exp(-delta / currentTemp)) {
          newAgents.push({ x: nx, y: ny, value: nVal });
        } else {
          newAgents.push(agent);
        }
      });
      break;

    case AlgorithmType.GENETIC:
      // Sort by fitness (lowest value is best)
      const sorted = [...agents].sort((a, b) => a.value - b.value);
      // Elitism: Keep top 20%
      const eliteCount = Math.floor(agents.length * 0.2);
      const elites = sorted.slice(0, eliteCount);
      
      newAgents.push(...elites);

      // Fill rest with children
      while (newAgents.length < agents.length) {
        // Tournament selection
        const p1 = sorted[Math.floor(Math.random() * (sorted.length / 2))]; // Prefer better half
        const p2 = sorted[Math.floor(Math.random() * (sorted.length / 2))];

        // Crossover
        let childX = (p1.x + p2.x) / 2;
        let childY = (p1.y + p2.y) / 2;

        // Mutation
        if (Math.random() < config.mutationRate) {
          childX += randomRange(-config.stepSize * 2, config.stepSize * 2);
          childY += randomRange(-config.stepSize * 2, config.stepSize * 2);
        }

        childX = clamp(childX, minX, maxX);
        childY = clamp(childY, minY, maxY);
        newAgents.push({ x: childX, y: childY, value: func(childX, childY) });
      }
      break;
  }

  return newAgents;
};
