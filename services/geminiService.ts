
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PaperAnalysis, ImplementationResult, GroundingSource } from "../types";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  public isNotFoundError(error: any): boolean {
    return error?.message?.includes('Requested entity was not found') || false;
  }

  async analyzePaper(pdfBase64: string, isPro: boolean): Promise<PaperAnalysis> {
    const ai = this.getClient();
    const model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          inlineData: {
            data: pdfBase64,
            mimeType: "application/pdf"
          }
        },
        { text: "Analyze this research paper. Extract the title, summary, core methodology, and algorithm logic in pseudocode. Identify key metrics and benchmarks mentioned." }
      ],
      config: {
        systemInstruction: "You are a world-class research engineer. Your goal is to extract technical logic from papers for implementation purposes. Return valid JSON.",
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
                  description: { type: Type.STRING }
                }
              }
            }
          },
          required: ["title", "summary", "methodology", "algorithmPseudocode"]
        },
        tools: isPro ? [{ googleSearch: {} }] : undefined
      }
    });

    const data = JSON.parse(response.text || '{}');
    const sources: GroundingSource[] = [];
    
    // Extract grounding sources if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title || 'Source', uri: chunk.web.uri });
        }
      });
    }

    return { ...data, groundingSources: sources };
  }

  async generateInitialImplementation(analysis: PaperAnalysis, isPro: boolean): Promise<ImplementationResult> {
    const ai = this.getClient();
    const model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";

    const response = await ai.models.generateContent({
      model,
      contents: `Implement the research paper "${analysis.title}" in Python.
      Methodology: ${analysis.methodology}
      Pseudocode: ${analysis.algorithmPseudocode}
      
      Requirements:
      1. Use Python 3.10 and NumPy.
      2. Provide a clean, modular class implementation.
      3. Include a comprehensive test suite (assertions) that verifies the core logic.
      4. Map theoretical concepts to specific code blocks.
      5. Identify structural parity between the paper's claims and the implementation.`,
      config: {
        systemInstruction: "You are a senior algorithm engineer. Synthesize high-performance, mathematically accurate Python code from research summaries. Use thinking to ensure mathematical correctness.",
        thinkingConfig: { thinkingBudget: isPro ? 16000 : 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING, description: "The core implementation code." },
            explanation: { type: Type.STRING, description: "Detailed technical explanation of the implementation." },
            tests: { type: Type.STRING, description: "Standalone Python test code using assertions." },
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
            },
            structuralParity: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  feature: { type: Type.STRING },
                  paperClaim: { type: Type.STRING },
                  implementationDetail: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["Verified", "Partial", "Conceptual"] }
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
  }

  async refineImplementation(analysis: PaperAnalysis, currentResult: ImplementationResult, errorLogs: string, isPro: boolean): Promise<any> {
    const ai = this.getClient();
    const model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";

    const response = await ai.models.generateContent({
      model,
      contents: `The previous implementation of "${analysis.title}" failed during WASM verification.
      
      Error Logs:
      ${errorLogs}
      
      Previous Code:
      ${currentResult.code}
      
      Identify the logic error, fix it, and provide the corrected code and test suite.`,
      config: {
        systemInstruction: "You are an expert debugger. Analyze tracebacks, identify conceptual or syntactical errors in research implementations, and fix them. Ensure mathematical stability.",
        thinkingConfig: { thinkingBudget: isPro ? 8000 : 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING },
            explanation: { type: Type.STRING },
            tests: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  }

  async generateArchitectureDiagram(analysis: PaperAnalysis): Promise<string | undefined> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: `Create a professional technical architecture diagram and data-flow schematic for the research paper: "${analysis.title}". 
        Style: Academic schematic, high-fidelity 2D blueprint, clear technical notations, vector-like clarity.`
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData);
      return imagePart?.inlineData?.data ? `data:image/png;base64,${imagePart.inlineData.data}` : undefined;
    } catch (e) {
      console.error("Architecture visualization failed", e);
      return undefined;
    }
  }

  async generateVocalExplanation(implementation: ImplementationResult): Promise<string | undefined> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: `Provide a concise, expert neural explanation of the following implementation logic: ${implementation.explanation.substring(0, 500)}`,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' }
            }
          }
        }
      });

      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) {
      console.error("Audio synthesis failed", e);
      return undefined;
    }
  }
}
