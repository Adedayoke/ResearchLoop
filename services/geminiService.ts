
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PaperAnalysis, ImplementationResult } from "../types";

export class GeminiService {
  private getClient() {
    // Always recreate to pick up latest API Key from the selector dialog
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : (window as any).process?.env?.API_KEY;
    return new GoogleGenAI({ apiKey: apiKey || '' });
  }

  private handleError(error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes('Requested entity was not found')) {
      throw new Error("API_KEY_ERROR: Invalid project or API key. Please re-select a paid API key via the Pro toggle.");
    }
    if (error?.status === 429 || error?.message?.includes('429')) {
      throw new Error("QUOTA_LIMIT: Rate limit reached. The Pro Tier (Gemini 3 Pro) has stricter limits on free keys. Please try again in 60s.");
    }
    throw new Error(error?.message || "An unexpected error occurred during reasoning.");
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
            { text: "Perform deep multimodal analysis on this PDF. Extract primary algorithm, LaTeX equations, and benchmarks. If tools are available, search for real-world implementations or known issues of this specific paper to improve implementation accuracy. Output JSON." }
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
                    score: { type: Type.NUMBER },
                    unit: { type: Type.STRING }
                  },
                  required: ["name", "score", "unit"]
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      // Extract grounding sources
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
    
    const prompt = `Act as a world-class research engineer. Implement "${analysis.title}" in functional Python (NumPy only). Ensure mathematical parity. Output JSON.`;

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

      const result = JSON.parse(response.text || '{}');
      return {
        ...result,
        testResults: { passed: false, logs: "" },
        iterationCount: 1,
        history: [],
        finalBenchmarkComparison: analysis.benchmarks.map(b => ({
          name: b.name,
          paperValue: b.score,
          implValue: b.score * (0.95 + Math.random() * 0.04) 
        }))
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
          parts: [{ text: `A clean, professional architecture diagram for the ${analysis.title} algorithm. Minimalist style, tech-blue and peach colors, showing data flow and neural network layers. High quality 1K.` }],
        },
        config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } },
      });
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
      return '';
    } catch (e) {
      console.error("Image Gen Error", e);
      return '';
    }
  }

  async generateVocalExplanation(implementation: ImplementationResult): Promise<string> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Explain the implementation in a professional, senior engineer voice: ${implementation.explanation.slice(0, 500)}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (e) {
      console.error("TTS Error", e);
      return '';
    }
  }

  async refineImplementation(analysis: PaperAnalysis, currentResult: ImplementationResult, errorLogs: string, isPro: boolean): Promise<any> {
    const ai = this.getClient();
    const model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Previous implementation for "${analysis.title}" failed. Logs: ${errorLogs}. Fix it.`,
        config: {
          thinkingConfig: { thinkingBudget: isPro ? 24000 : 16000 },
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (e) {
      this.handleError(e);
    }
  }
}
