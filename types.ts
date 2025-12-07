export enum AlgorithmType {
  GREEDY = 'GREEDY',
  HILL_CLIMBING = 'HILL_CLIMBING',
  SIMULATED_ANNEALING = 'SIMULATED_ANNEALING',
  GENETIC = 'GENETIC',
}

export interface Point {
  x: number;
  y: number;
  value: number; // The z-value or cost
}

export interface SimulationState {
  running: boolean;
  iteration: number;
  bestPoint: Point | null;
  history: { iteration: number; cost: number }[];
  agents: Point[]; // Current population or single agent position
  trails: Point[][]; // History of positions for each agent
}

export interface OptimizationConfig {
  algo: AlgorithmType;
  learningRate: number; // or Step Size
  temperature?: number; // For Annealing
  populationSize?: number; // For Genetic
  mutationRate?: number; // For Genetic
  maxIterations: number;
}

export interface Landscape {
  name: string;
  description: string;
  // Function z = f(x, y)
  func: (x: number, y: number) => number;
  // Bounds
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  // Optimal
  globalMin: number;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  concept: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface SavedExperiment {
  id: string;
  name: string;
  timestamp: number;
  config: OptimizationConfig;
  landscapeName: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}