
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PaperAnalysis, ImplementationResult } from "../types";

export class GeminiService {
  private getClient() {
    // Priority: system process.env -> window.process.env -> empty string
    const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) 
      ? process.env.API_KEY 
      : (window as any).process?.env?.API_KEY;
    
    return new GoogleGenAI({ apiKey: apiKey || '' });
  }

  private handleError(error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes('Requested entity was not found') || error?.message?.includes('API_KEY_INVALID')) {
      throw new Error("API_KEY_ERROR: A valid paid API key is required for Pro features. Please check your billing at ai.google.dev/gemini-api/docs/billing.");
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
            { text: "Analyze this research paper. IMPORTANT: The 'title' field must contain ONLY the headline. REMOVE authors and metadata. Extract methodology. Output JSON." }
          ]
        },
        config: {
          systemInstruction: "You are a research engineer. Extract logic and return a clean, metadata-free paper title.",
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
    
    const prompt = `Implement "${analysis.title}" in Python 3.10 + NumPy. Translate abstract methodology into classes. Use shape assertions. Provide unit tests. Output JSON.`;

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
      // gemini-3-pro-image-preview for high-quality architectural schema
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: `A clean, high-fidelity technical architecture blueprint for: ${analysis.title}. Professional engineering schematic showing modular components and data flow. Modern tech aesthetic, white background, peach accents. 2K resolution.` }],
        },
        config: { 
          imageConfig: { aspectRatio: "16:9", imageSize: "2K" },
          // Fix: Use 'googleSearch' instead of 'google_search' as 'google_search' is not a valid property in ToolUnion.
          tools: [{googleSearch: {}}] 
        },
      });
      
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        // Iterate through all parts as model might return text AND image
        for (const part of parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
      return '';
    } catch (e) {
      console.error("Visualizer Error:", e);
      // Fallback to simpler model if Pro fails or is restricted in the environment
      try {
        const fallback = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: `Architecture diagram for ${analysis.title}` }] }
        });
        const part = fallback.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        return part ? `data:image/png;base64,${part.inlineData?.data}` : '';
      } catch (fErr) {
        return '';
      }
    }
  }

  async generateVocalExplanation(implementation: ImplementationResult): Promise<string> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Explain this implementation: ${implementation.explanation.slice(0, 500)}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          // Fix: Wrap 'voiceName' inside 'prebuiltVoiceConfig' as per the latest SDK guidelines.
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: 'Kore' } 
            } 
          },
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
    
    const prompt = `REPAIR Logic for "${analysis.title}". Traceback: ${errorLogs}. Fix the implementation while maintaining paper math.`;

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
