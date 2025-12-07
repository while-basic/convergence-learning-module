import { AlgorithmType, Landscape, LearningModule } from './types';

export const COGNITIVE_SESSION = {
  "session_id": "d3c2f00c-2369-4b01-b4b1-cc78f08fb38c",
  "timestamp": "2025-12-07T15:34:00-07:00",
  "context_summary": "Christopher listed fragmented notes outlining his cognitive research lab, tools, hardware, LLM stack, and the objective of building an automated multi-LLM sandbox for data collection and MLX training.",
  "cognitive_mode": "analytical-construction",
  "flow_state_indicators": [
    "rapid listing",
    "compressed notation",
    "parallel processing",
    "low-context switching",
    "task-architecture framing"
  ],
  "emergent_patterns": [
    "obsession with baseline stability",
    "multi-LLM orchestration",
    "automation loops",
    "distributed hardware utilization",
    "data pipeline thinking"
  ],
  "anomalies_or_notable_transitions": [
    "jump from hardware lists to high-level automation without middle detail",
    "switch from environment description to success metrics abruptly"
  ]
};

export const LANDSCAPES: Landscape[] = [
  {
    name: "Convex Bowl",
    description: "A simple convex function. Easy for any algorithm to find the bottom.",
    func: (x, y) => x * x + y * y,
    minX: -5, maxX: 5, minY: -5, maxY: 5,
    globalMin: 0
  },
  {
    name: "Rastrigin Function",
    description: "Many local minima. A nightmare for greedy algorithms, perfect for testing exploration.",
    func: (x, y) => {
      const A = 10;
      return A * 2 + (x * x - A * Math.cos(2 * Math.PI * x)) + (y * y - A * Math.cos(2 * Math.PI * y));
    },
    minX: -5.12, maxX: 5.12, minY: -5.12, maxY: 5.12,
    globalMin: 0
  },
  {
    name: "Ackley Function",
    description: "A large hole with many small bumps. Requires a mix of global search and local refinement.",
    func: (x, y) => {
      return -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (x * x + y * y))) - Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y))) + Math.E + 20;
    },
    minX: -5, maxX: 5, minY: -5, maxY: 5,
    globalMin: 0
  },
  {
    name: "Cognitive Sandbox",
    description: "Modeled on 'analytical-construction' patterns. High complexity with deep emergent basins and sharp anomaly spikes.",
    func: (x, y) => {
      // Hybrid function representing "Anomalies" (sharp spikes) and "Emergent Patterns" (deep, irregular basins)
      // Modified Schwefel-like behavior with noise
      const complexBase = 418.9829 * 2 - (x * Math.sin(Math.sqrt(Math.abs(x))) + y * Math.sin(Math.sqrt(Math.abs(y))));
      const anomalies = Math.sin(x * 5) * Math.cos(y * 5) * 50; // High frequency noise
      return (complexBase + anomalies) / 10 + 200; // Scaled for visualizer
    },
    minX: -500, maxX: 500, minY: -500, maxY: 500,
    globalMin: 0
  }
];

export const LEARNING_MODULES: LearningModule[] = [
  {
    id: 'fundamentals',
    title: 'The Landscape of Loss',
    description: 'Understand the core goal: finding the lowest point in a complex terrain.',
    concept: 'Optimization acts like a ball rolling down a hill. The "Cost Function" is the terrain. Your goal is to reach the absolute bottom (Global Minimum) efficiently.',
    difficulty: 'Beginner'
  },
  {
    id: 'greedy',
    title: 'Greedy & Hill Climbing',
    description: 'Always taking the step that looks best right now.',
    concept: 'Imagine climbing a mountain in fog. You only step up. This works for simple hills but gets you stuck on false peaks (Local Optima) in complex terrain.',
    difficulty: 'Beginner'
  },
  {
    id: 'annealing',
    title: 'Simulated Annealing',
    description: 'Accepting bad moves to escape traps.',
    concept: 'Inspired by metallurgy. Sometimes you must go UPHILL (take a worse solution) to escape a local trap. As the system "cools", you stop taking risks and settle.',
    difficulty: 'Intermediate'
  },
  {
    id: 'genetic',
    title: 'Genetic Evolution',
    description: 'Survival of the fittest solutions.',
    concept: 'Maintain a population of solutions. Mix them (crossover) and randomly change them (mutation). The best solutions survive to the next generation.',
    difficulty: 'Advanced'
  }
];

export const INITIAL_CONFIG = {
  algo: AlgorithmType.HILL_CLIMBING,
  learningRate: 0.1,
  maxIterations: 100,
  temperature: 100,
  populationSize: 20,
  mutationRate: 0.1
};

export const RESEARCH_OPTIONS = {
    learningRates: [0.01, 0.05, 0.1, 0.5, 1.0],
    temperatures: [10, 50, 100, 500, 1000],
    populationSizes: [10, 20, 50, 100],
    mutationRates: [0.01, 0.05, 0.1, 0.2, 0.5],
    maxIterations: [50, 100, 200, 500]
};