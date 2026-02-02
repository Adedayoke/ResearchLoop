
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PaperAnalysis, ImplementationResult, GroundingSource } from "../types";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        { text: "Analyze this research paper. Extract the title, summary, methodology, and algorithm pseudocode. CRITICAL: Use your Google Search tool to find official citations, GitHub repositories, or benchmarks related to this paper. I need you to find at least 3 external web sources to provide as grounding metadata. Ensure the groundingSources field in candidates is populated." }
      ],
      config: {
        systemInstruction: "You are a research engineer. Extract logic for implementation. Always use Google Search to verify claims and provide grounding sources in your response metadata. Return the response as a clean JSON object.",
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
    
    // Robust Grounding Extraction from the model response
    const metadata = response.candidates?.[0]?.groundingMetadata;
    if (metadata?.groundingChunks) {
      metadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          if (!sources.find(s => s.uri === chunk.web.uri)) {
            sources.push({ 
              title: chunk.web.title || 'Verified Source', 
              uri: chunk.web.uri 
            });
          }
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
      5. Identify structural parity between the paper's claims and the implementation.
      6. In 'equationMappings', the 'theory' field must be PURE LaTeX (no markdown backticks, no quotes). Example: \\sum_{i=1}^n x_i`,
      config: {
        systemInstruction: "You are a senior algorithm engineer. Synthesize high-performance, mathematically accurate Python code. Use thinking to ensure mathematical correctness. Always return raw LaTeX strings in JSON, never wrapped in markdown.",
        thinkingConfig: { thinkingBudget: isPro ? 16000 : 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING, description: "The core implementation code." },
            explanation: { type: Type.STRING, description: "Detailed technical explanation." },
            tests: { type: Type.STRING, description: "Python test code using assertions." },
            equationMappings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  theory: { type: Type.STRING, description: "Pure LaTeX formula." },
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
      contents: `The previous implementation of "${analysis.title}" failed. Error: ${errorLogs}. Fix the code: ${currentResult.code}`,
      config: {
        systemInstruction: "You are an expert debugger. Analyze tracebacks and fix conceptual or syntactical errors.",
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
        contents: `Technical architecture schematic for: "${analysis.title}". Professional blueprint style.`
      });
      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData);
      return imagePart?.inlineData?.data ? `data:image/png;base64,${imagePart.inlineData.data}` : undefined;
    } catch (e) {
      return undefined;
    }
  }

  async generateVocalExplanation(implementation: ImplementationResult): Promise<string | undefined> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: `Explain this implementation: ${implementation.explanation.substring(0, 500)}`,
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
      return undefined;
    }
  }
}
