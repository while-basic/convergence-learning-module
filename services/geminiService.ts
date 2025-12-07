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
      Translate this into an optimization problem configuration.
      Return ONLY a valid JSON object with:
      {
        "suggestedAlgo": "GREEDY" | "HILL_CLIMBING" | "SIMULATED_ANNEALING" | "GENETIC",
        "reasoning": "One sentence explaining why."
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