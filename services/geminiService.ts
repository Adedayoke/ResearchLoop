
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PaperAnalysis, ImplementationResult, GroundingSource } from "../types";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  public isNotFoundError(error: any): boolean {
    const message = error?.message || "";
    return message.includes('Requested entity was not found') || message.includes('404');
  }

  public isTierError(error: any): boolean {
    const message = error?.message || "";
    return (
      message.includes('403') || 
      message.includes('PERMISSION_DENIED') || 
      message.includes('permission denied') ||
      message.includes('billing') ||
      message.includes('quota')
    );
  }

  async analyzePaper(pdfBase64: string, isPro: boolean): Promise<PaperAnalysis> {
    const ai = this.getClient();
    let model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const tools = isPro ? [{ googleSearch: {} }] : undefined;

    const generate = async (m: string) => {
      const budget = m.includes('pro') ? 16000 : 8000;
      const total = budget + 4000;

      return await ai.models.generateContent({
        model: m,
        contents: {
          parts: [
            { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
            { text: "Analyze this research paper. Extract title, summary, methodology, and algorithm logic. Output JSON." }
          ]
        },
        config: {
          systemInstruction: "You are a world-class research engineer. Extract algorithm logic and return valid JSON.",
          thinkingConfig: { thinkingBudget: budget },
          maxOutputTokens: total,
          responseMimeType: "application/json",
          tools: m.includes('pro') ? tools : undefined,
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
    };

    try {
      let response;
      try {
        response = await generate(model);
      } catch (err) {
        if ((this.isTierError(err) || this.isNotFoundError(err)) && isPro) {
          response = await generate("gemini-3-flash-preview");
        } else throw err;
      }

      const text = response.text || '{}';
      const data = JSON.parse(text);
      const sources: GroundingSource[] = [];
      const metadata = response.candidates?.[0]?.groundingMetadata;
      if (metadata?.groundingChunks) {
        metadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.web) sources.push({ title: chunk.web.title || "External Citation", uri: chunk.web.uri });
        });
      }
      return { ...data, groundingSources: sources };
    } catch (e: any) { throw e; }
  }

  async generateInitialImplementation(analysis: PaperAnalysis, isPro: boolean): Promise<ImplementationResult> {
    const ai = this.getClient();
    let model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const prompt = `Implement "${analysis.title}" in Python 3.10 + NumPy. Include modular classes and full unit tests. Output JSON.`;

    const config = (m: string) => {
      const budget = m.includes('pro') ? 20000 : 10000;
      return {
        thinkingConfig: { thinkingBudget: budget },
        maxOutputTokens: budget + 8000,
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
      };
    };

    try {
      let response;
      try {
        response = await ai.models.generateContent({ model, contents: prompt, config: config(model) });
      } catch (err) {
        if ((this.isTierError(err) || this.isNotFoundError(err)) && isPro) {
          response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt, config: config("gemini-3-flash-preview") });
        } else throw err;
      }
      const result = JSON.parse(response.text || '{}');
      return { ...result, testResults: { passed: false, logs: "" }, iterationCount: 1, history: [] };
    } catch (e: any) { throw e; }
  }

  async startResearcherChat(analysis: PaperAnalysis, implementation: ImplementationResult, isPro: boolean) {
    const ai = this.getClient();
    const systemInstruction = `You are the ResearchLoop Agent. You just implemented the paper "${analysis.title}". 
    The methodology is: ${analysis.methodology}. 
    The implementation code is: ${implementation.code}. 
    Answer follow-up questions accurately and technically. Use markdown for code and math.`;

    const tryConnect = async (m: string) => {
      return ai.chats.create({
        model: m,
        config: { systemInstruction }
      });
    };

    try {
      if (isPro) {
        try {
          const session = await tryConnect("gemini-3-pro-preview");
          return { session, modelUsed: 'pro' };
        } catch (e) {
          console.warn("Pro Chat failed, falling back to Flash...");
          const session = await tryConnect("gemini-3-flash-preview");
          return { session, modelUsed: 'flash' };
        }
      } else {
        const session = await tryConnect("gemini-3-flash-preview");
        return { session, modelUsed: 'flash' };
      }
    } catch (e: any) { throw e; }
  }

  async generateArchitectureDiagram(analysis: PaperAnalysis, isPro: boolean): Promise<string> {
    const ai = this.getClient();
    const tryGenerate = async (m: string) => {
      const response = await ai.models.generateContent({
        model: m,
        contents: { 
          parts: [{ 
            text: `Professional technical architecture diagram and data-flow schematic for the research paper: ${analysis.title}. 
            Style: Academic 2D blueprint, technical vector illustration, high clarity.` 
          }] 
        },
        config: { 
          imageConfig: { 
            aspectRatio: "16:9",
            ...(m.includes('pro') ? { imageSize: "1K" } : {})
          } 
        },
      });
      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData);
      return imagePart?.inlineData?.data ? `data:image/png;base64,${imagePart.inlineData.data}` : '';
    };

    try {
      let result = '';
      if (isPro) {
        try {
          result = await tryGenerate('gemini-3-pro-image-preview');
        } catch (e) {
          result = await tryGenerate('gemini-2.5-flash-image');
        }
      } else {
        result = await tryGenerate('gemini-2.5-flash-image');
      }
      return result;
    } catch (e: any) {
      console.error("Architecture synthesis failed:", e.message);
      return '';
    }
  }

  async generateVocalExplanation(implementation: ImplementationResult): Promise<string> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Synthesize a brief neural explanation for this implementation: ${implementation.explanation.slice(0, 300)}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (e) { return ''; }
  }

  async refineImplementation(analysis: PaperAnalysis, currentResult: ImplementationResult, errorLogs: string, isPro: boolean): Promise<any> {
    const ai = this.getClient();
    let model = isPro ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const prompt = `The current Python implementation for "${analysis.title}" failed with these errors: ${errorLogs}. Fix the logic. Return JSON.`;
    try {
      const budget = model.includes('pro') ? 24000 : 12000;
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { 
          thinkingConfig: { thinkingBudget: budget }, 
          maxOutputTokens: budget + 5000,
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (e: any) { throw e; }
  }
}
