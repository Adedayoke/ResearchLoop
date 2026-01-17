
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PaperAnalysis, ImplementationResult } from "../types";

export class GeminiService {
  private getClient() {
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : (window as any).process?.env?.API_KEY;
    return new GoogleGenAI({ apiKey: apiKey || '' });
  }

  private handleError(error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes('Requested entity was not found')) {
      throw new Error("API_KEY_ERROR: Invalid project or API key.");
    }
    throw new Error(error?.message || "An unexpected error occurred.");
  }

  async analyzePaper(pdfBase64: string, isPro: boolean): Promise<PaperAnalysis> {
    const ai = this.getClient();
    const model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const tools = isPro ? [{ googleSearch: {} }] : undefined;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
            { text: "Analyze this research paper. Extract the title, authors, summary, methodology, and a list of key architectural features or benchmarks. Focus on the mathematical core. Output JSON." }
          ]
        },
        config: {
          thinkingConfig: { thinkingBudget: isPro ? 12000 : 4000 },
          responseMimeType: "application/json",
          tools,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              authors: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING },
              methodology: { type: Type.STRING },
              algorithmPseudocode: { type: Type.STRING },
              benchmarks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const sources: any[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        });
      }

      return { ...data, groundingSources: sources };
    } catch (e) {
      this.handleError(e);
      return {} as any;
    }
  }

  async generateInitialImplementation(analysis: PaperAnalysis, isPro: boolean): Promise<ImplementationResult> {
    const ai = this.getClient();
    const model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    
    const prompt = `Act as a Senior Research Engineer. Implement the core logic of "${analysis.title}" in Python 3.10 using NumPy.
Requirements:
1. Code must be self-contained and mathematically accurate to the paper.
2. Use explicit NumPy broadcasting and check shapes to avoid dimension errors.
3. Provide a 'tests' script that exercises the core algorithm with sample data.
4. map research quotes to specific code snippets in 'equationMappings'.
Output JSON.`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: isPro ? 32768 : 24576 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              explanation: { type: Type.STRING },
              tests: { type: Type.STRING },
              structuralParity: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    feature: { type: Type.STRING },
                    paperClaim: { type: Type.STRING },
                    implementationDetail: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['Verified', 'Partial', 'Conceptual'] }
                  }
                }
              },
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

      const result = JSON.parse(response.text || '{}');
      return {
        ...result,
        testResults: { passed: false, logs: "" },
        iterationCount: 1,
        history: []
      };
    } catch (e) {
      this.handleError(e);
      return {} as any;
    }
  }

  async generateArchitectureDiagram(analysis: PaperAnalysis): Promise<string> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: `High-fidelity technical schematic of the research architecture for: ${analysis.title}. Diagram showing computational nodes, data tensors, and mathematical flow. White background, professional engineering blue and orange palette.` }],
        },
        config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } },
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
      return '';
    } catch (e) {
      return '';
    }
  }

  async generateVocalExplanation(implementation: ImplementationResult): Promise<string> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `In a professional tone, summarize how this code implements the paper's core methodology: ${implementation.explanation.slice(0, 400)}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (e) {
      return '';
    }
  }

  async refineImplementation(analysis: PaperAnalysis, currentResult: ImplementationResult, errorLogs: string, isPro: boolean): Promise<any> {
    const ai = this.getClient();
    const model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    
    const prompt = `CRITICAL FIX REQUIRED for "${analysis.title}".
The following Python implementation failed with a traceback. 

TRACEBACK:
${errorLogs}

PREVIOUS CODE:
${currentResult.code}

INSTRUCTIONS:
1. Carefully diagnose the error (e.g., NumPy shape mismatch, broadcasting issue, or initialization error).
2. Rewrite the code and tests to fix this specific error while maintaining mathematical correctness.
3. Be aggressive about shape-safety in NumPy operations.
Output JSON.`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: isPro ? 32768 : 24576 },
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (e) {
      this.handleError(e);
    }
  }
}
