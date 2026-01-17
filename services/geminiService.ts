
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PaperAnalysis, ImplementationResult } from "../types";

export class GeminiService {
  private getClient() {
    // Exclusively use process.env.API_KEY as per guidelines
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  private handleError(error: any) {
    console.error("Gemini API Error:", error);
    const message = error?.message || "";
    
    if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
      throw new Error("PRO_PERMISSION_ERROR: The selected API key does not have permission for this model. This typically requires a paid GCP project with billing enabled for Pro features.");
    }
    
    if (message.includes('Requested entity was not found') || message.includes('404')) {
      throw new Error("API_KEY_NOT_FOUND: The requested model was not found or the API key is invalid. Please select a valid key from a paid project.");
    }

    throw new Error(message || "An unexpected error occurred during reasoning.");
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
      // Create a fresh instance for imaging to ensure latest key
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: `A clean, high-fidelity technical architecture blueprint for: ${analysis.title}. Professional engineering schematic showing modular components and data flow. Modern tech aesthetic, white background, peach accents. 2K resolution.` }],
        },
        config: { 
          imageConfig: { aspectRatio: "16:9", imageSize: "2K" },
          tools: [{googleSearch: {}}] 
        },
      });
      
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
      return '';
    } catch (e: any) {
      console.warn("Pro Visualizer failed, attempting fallback...", e);
      
      // If permission is denied for Pro imaging, we catch it but don't crash the loop
      // We still handle the error reporting in the main flow if needed
      if (e?.message?.includes('403') || e?.message?.includes('PERMISSION_DENIED')) {
          console.error("Imaging permission denied. User may need to select a billing-enabled key.");
      }

      try {
        const fallback = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: `Technical architecture diagram for research paper: ${analysis.title}` }] }
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
