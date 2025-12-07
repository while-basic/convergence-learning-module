import { GoogleGenAI } from "@google/genai";
import { AlgorithmType, Landscape } from "../types";

const initGenAI = () => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key missing");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getGeminiFeedback = async (
  algo: AlgorithmType,
  landscapeName: string,
  startValue: number,
  endValue: number,
  iterations: number,
  didConverge: boolean,
  sessionContext?: string | null
) => {
  const ai = initGenAI();
  if (!ai) return "AI Configuration missing. Please check API Key.";

  const improvement = ((startValue - endValue) / startValue) * 100;
  
  let prompt = `
    You are an expert AI Optimization Tutor.
    The user just ran a simulation.
    
    Context:
    - Algorithm: ${algo}
    - Landscape: ${landscapeName} (Lower is better)
    - Starting Cost: ${startValue.toFixed(4)}
    - Final Cost: ${endValue.toFixed(4)}
    - Iterations: ${iterations}
    - Improvement: ${improvement.toFixed(2)}%
  `;

  if (sessionContext) {
      prompt += `
      
      SPECIAL SESSION CONTEXT (Christopher's Lab):
      The user is simulating an optimization of a cognitive research lab based on this data:
      ${sessionContext}
      
      Your feedback must metaphorically relate the mathematical result to this cognitive session.
      E.g., if it converged well, mention "Successfully integrated multi-LLM orchestration."
      If it failed, mention "Got stuck on fragmented notes or anomalies."
      `;
  }

  prompt += `
    Task:
    Provide a brief, strictly 2-sentence feedback.
    1. Grade the effectiveness (S, A, B, C, F) and explain why briefly.
    2. Give a specific tip on how to improve (e.g., adjust learning rate, increase temperature).
    
    Tone: Professional, encouraging, concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to retrieve AI analysis at this moment.";
  }
};

export const getUseCaseGuidance = async (userDescription: string) => {
    const ai = initGenAI();
    if (!ai) return null;

    const prompt = `
      The user wants to optimize: "${userDescription}".
      Translate this real-world problem into a specific optimization algorithm configuration.
      
      Return ONLY a valid JSON object with:
      {
        "suggestedAlgo": "GREEDY" | "HILL_CLIMBING" | "SIMULATED_ANNEALING" | "GENETIC",
        "learningRate": number (0.01 to 1.0),
        "temperature": number (for annealing, 10 to 1000),
        "populationSize": number (for genetic, 10 to 100),
        "mutationRate": number (for genetic, 0.01 to 0.5),
        "reasoning": "One concise sentence explaining why this setup fits the problem."
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    } catch (e) {
        console.error(e);
        return null;
    }
}

export const analyzeConfiguration = async (config: any, landscapeName: string) => {
  const ai = initGenAI();
  if (!ai) return "AI Key missing.";

  const prompt = `
    Analyze this optimization experiment setup:
    
    Landscape: ${landscapeName}
    Algorithm: ${config.algo}
    Learning Rate: ${config.learningRate}
    Max Iterations: ${config.maxIterations}
    ${config.algo === 'SIMULATED_ANNEALING' ? `Temperature: ${config.temperature}` : ''}
    ${config.algo === 'GENETIC' ? `Population: ${config.populationSize}, Mutation: ${config.mutationRate}` : ''}

    Predict the outcome in 1 sentence. Will it converge? Will it get stuck in local minima?
    Provide a probability of success (0-100%).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "Analysis failed.";
  }
};

export const getELI5Analysis = async (config: any, landscapeName: string, bestCost: number) => {
  const ai = initGenAI();
  if (!ai) return "AI Offline";

  const prompt = `
    Explain the current optimization situation like the user is 5 years old.
    
    Scenario:
    - We are trying to find the lowest point on a map called "${landscapeName}".
    - We are using a strategy called "${config.algo}".
    - Best depth found so far: ${bestCost.toFixed(2)}.
    
    Task:
    1. Use a simple analogy (e.g., looking for treasure, climbing down a foggy mountain, ants finding food).
    2. Explain what is happening right now with the current settings.
    3. Tell them one simple thing to change to do better.
    
    Keep it strictly under 50 words. Fun and educational tone.
  `;

  try {
     const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (e) {
    return "Something went wrong explaining this!";
  }
};

export const sendChatQuery = async (history: any[], currentContext: any, userMessage: string) => {
   const ai = initGenAI();
   if (!ai) return "AI Offline";

   const prompt = `
     You are a helpful research assistant in an optimization lab.
     
     Current Experiment Context:
     - Algorithm: ${currentContext.config.algo}
     - Landscape: ${currentContext.landscape}
     - Current Iteration: ${currentContext.iteration}
     - Current Best Value: ${currentContext.bestValue}
     
     User Question: "${userMessage}"
     
     Answer clearly and concisely. If the user asks about the graph, refer to the 'Current Best Value' and iteration progress.
   `;

   try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (e) {
    return "I couldn't process that request right now.";
  }
};