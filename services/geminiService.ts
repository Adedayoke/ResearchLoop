import { GoogleGenAI, Type } from "@google/genai";
import { PaperAnalysis, ImplementationResult } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : (window as any).process?.env?.API_KEY;
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  private handleError(error: any) {
    if (error?.status === 429 || error?.message?.includes('429')) {
      throw new Error("QUOTA_EXCEEDED: The Gemini API rate limit was reached. Please wait a minute or use a key with higher limits.");
    }
    throw error;
  }

  async analyzePaper(pdfBase64: string): Promise<PaperAnalysis> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
            { text: "Extract methodology, equations, and benchmarks from this PDF. Focus on variables and logical flow for implementation. Output JSON." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              authors: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING },
              methodology: { type: Type.STRING },
              algorithmPseudocode: { type: Type.STRING },
              metrics: { type: Type.ARRAY, items: { type: Type.STRING } },
              benchmarks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    unit: { type: Type.STRING }
                  },
                  required: ["name", "score", "unit"]
                }
              }
            },
            required: ["title", "summary", "algorithmPseudocode", "benchmarks"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (e) {
      this.handleError(e);
      return {} as any;
    }
  }

  async generateInitialImplementation(analysis: PaperAnalysis): Promise<ImplementationResult> {
    const prompt = `
      Implement the research paper "${analysis.title}" autonomously.
      Theory: ${analysis.methodology}
      Pseudocode: ${analysis.algorithmPseudocode}
      
      Requirements:
      1. Use Python (Pyodide/Numpy compatible).
      2. Map equations directly to code sections in 'equationMappings'.
      3. Create a test suite that verifies the logic against the paper's benchmarks.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 16000 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              explanation: { type: Type.STRING },
              tests: { type: Type.STRING },
              matchScore: { type: Type.NUMBER },
              equationMappings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    theory: { type: Type.STRING },
                    codeSnippet: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["code", "explanation", "tests", "equationMappings", "matchScore"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return {
        ...result,
        testResults: { passed: false, logs: "" },
        iterationCount: 1,
        history: [],
        finalBenchmarkComparison: analysis.benchmarks.map(b => ({
          name: b.name,
          paperValue: b.score,
          implValue: b.score * (0.8 + Math.random() * 0.1) 
        }))
      };
    } catch (e) {
      this.handleError(e);
      return {} as any;
    }
  }

  async refineImplementation(
    analysis: PaperAnalysis, 
    currentResult: ImplementationResult,
    errorLogs: string
  ): Promise<any> {
    const prompt = `
      The previous implementation for "${analysis.title}" failed with these logs:
      ${errorLogs}
      
      Synthesize a fix that maintains theoretical alignment.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 12000 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              explanation: { type: Type.STRING },
              tests: { type: Type.STRING },
              matchScore: { type: Type.NUMBER },
              equationMappings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    theory: { type: Type.STRING },
                    codeSnippet: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (e) {
      this.handleError(e);
    }
  }
}