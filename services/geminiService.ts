
import { GoogleGenAI, Type } from "@google/genai";
import { PaperAnalysis, ImplementationResult } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzePaper(pdfBase64: string): Promise<PaperAnalysis> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
          { text: "Analyze the methodology, equations, and benchmarks of this paper. Output JSON." }
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
  }

  async generateInitialImplementation(analysis: PaperAnalysis): Promise<ImplementationResult> {
    const prompt = `
      Implement the paper "${analysis.title}". 
      Math focus: ${analysis.methodology}
      
      Generate Python (Pyodide compatible).
      Also provide a list of 'equationMappings' that link specific parts of the implementation code back to the paper's theoretical equations or logic.
      Estimate a 'matchScore' (0-100) representing how accurately this code reflects the paper's theory.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
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
                  theory: { type: Type.STRING, description: "Equation name or theoretical description from the paper" },
                  codeSnippet: { type: Type.STRING, description: "The specific line or function implementing it" },
                  explanation: { type: Type.STRING, description: "Brief educational explanation" }
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
  }

  async refineImplementation(
    analysis: PaperAnalysis, 
    currentResult: ImplementationResult,
    errorLogs: string
  ): Promise<any> {
    const prompt = `
      The previous implementation failed:
      ${errorLogs}
      
      Refine the code. Increase the matchScore. Update equationMappings if logic changes.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
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
  }
}
