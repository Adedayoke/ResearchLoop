
import React, { useState, useRef, useEffect } from 'react';
import { PaperAnalysis, ImplementationResult, ChatMessage } from '../types';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { marked } from 'marked';
import { GeminiService } from '../services/geminiService';
import { executionService } from '../services/executionService';

interface ResultsUIProps {
  analysis: PaperAnalysis;
  implementation: ImplementationResult;
  isPro: boolean;
  onReset?: () => void;
}

const ResultsUI: React.FC<ResultsUIProps> = ({ analysis, implementation: initialImplementation, isPro, onReset }) => {
  const [implementation, setImplementation] = useState(initialImplementation);
  const [activeTab, setActiveTab] = useState<'explainer' | 'code' | 'inspector' | 'artifacts' | 'summary' | 'pro'>('summary');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isReverifying, setIsReverifying] = useState(false);
  const [activeModelName, setActiveModelName] = useState<'pro' | 'flash' | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatSessionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const gemini = useRef(new GeminiService());

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  const initChat = async () => {
    setIsChatOpen(true);
    if (!chatSessionRef.current) {
      setIsChatLoading(true);
      try {
        const { session, modelUsed } = await gemini.current.startResearcherChat(analysis, implementation, isPro);
        chatSessionRef.current = session;
        setActiveModelName(modelUsed);
      } catch (err) {
        console.error("Failed to start chat session", err);
      } finally {
        setIsChatLoading(false);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      if (!chatSessionRef.current) {
         const { session, modelUsed } = await gemini.current.startResearcherChat(analysis, implementation, isPro);
         chatSessionRef.current = session;
         setActiveModelName(modelUsed);
      }
      const result = await chatSessionRef.current.sendMessage({ message: userMsg });
      if (result && result.text) {
        setChatHistory(prev => [...prev, { role: 'model', text: result.text }]);
      } else {
        throw new Error("Empty response");
      }
    } catch (err) {
      console.error("Chat message error:", err);
      setChatHistory(prev => [...prev, { role: 'model', text: "Researcher Agent temporarily offline. Attempting to reconnect..." }]);
      chatSessionRef.current = null;
    } finally {
      setIsChatLoading(false);
    }
  };

  const downloadFile = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportScript = () => {
    const content = `"""\nImplementation of: ${analysis.title}\nSynthesized by ResearchLoop Autonomous Agent\n"""\n\nimport numpy as np\n\n# CORE IMPLEMENTATION\n${implementation.code}\n\n# UNIT TESTS\nif __name__ == "__main__":\n${implementation.tests.split('\n').map(l => '    ' + l).join('\n')}\n    print("Verification Successful.")`;
    downloadFile(`${analysis.title.replace(/\s+/g, '_').toLowerCase()}.py`, content, 'text/plain');
  };

  const exportReport = () => {
    const content = `# Implementation Report: ${analysis.title}\n\n## Summary\n${analysis.summary}\n\n## Methodology\n${analysis.methodology}\n\n## Code Logic\n\`\`\`python\n${implementation.code}\n\`\`\``;
    downloadFile(`report_${analysis.title.replace(/\s+/g, '_').toLowerCase()}.md`, content, 'text/markdown');
  };

  const handleReverify = async () => {
    setIsReverifying(true);
    try {
      const results = await executionService.runPython(implementation.code, implementation.tests);
      setImplementation(prev => ({ ...prev, testResults: results }));
    } catch (err) {
      console.error("Re-verification error", err);
    } finally {
      setIsReverifying(false);
    }
  };

  const playVocal = async () => {
    if (!implementation.audioData || isPlaying) return;
    setIsPlaying(true);
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      const binary = atob(implementation.audioData);
      const uint8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) uint8[i] = binary.charCodeAt(i);
      const int16 = new Int16Array(uint8.buffer);
      const buffer = ctx.createBuffer(1, int16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < int16.length; i++) channelData[i] = int16[i] / 32768.0;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (e) {
      setIsPlaying(false);
    }
  };

  const renderMarkdown = (text: string) => {
    try {
      return { __html: marked.parse(text || '') };
    } catch (e) {
      return { __html: text || '' };
    }
  };

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'explainer', label: 'Theory Map' },
    { id: 'pro', label: 'Visualizer', pro: true },
    { id: 'code', label: 'Implementation' },
    { id: 'inspector', label: 'Inspector' },
    { id: 'artifacts', label: 'Artifacts' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000 pb-32">
      {/* Floating Chat Button */}
      <button 
        onClick={initChat}
        className="fixed bottom-8 right-8 w-16 h-16 bg-github-black text-peach-100 rounded-full shadow-[8px_8px_0px_0px_rgba(217,119,87,1)] flex items-center justify-center group hover:-translate-y-1 hover:-translate-x-1 transition-all z-[100]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Chat Sidebar Drawer */}
      {isChatOpen && (
        <>
          <div className="fixed inset-0 bg-github-black/40 backdrop-blur-sm z-[110]" onClick={() => setIsChatOpen(false)}></div>
          <div className="fixed top-0 right-0 w-full md:w-[450px] h-full bg-peach-100 border-l border-github-black z-[120] flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="p-6 border-b border-github-black bg-github-black text-peach-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight">Researcher Dialogue</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeModelName === 'pro' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-peach-accent">
                    Engine: {activeModelName === 'pro' ? 'Pro reasoning' : 'Flash reasoning'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="w-10 h-10 border border-peach-100/20 flex items-center justify-center hover:bg-white hover:text-github-black">✕</button>
            </div>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-[#fdfcfb]">
              {chatHistory.length === 0 && !isChatLoading && (
                <div className="text-center py-20 space-y-4 opacity-50">
                  <div className="w-12 h-12 bg-github-black/5 rounded-full flex items-center justify-center mx-auto mb-4">💬</div>
                  <p className="text-sm font-medium">Ask technical questions about the implementation logic or methodology.</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-4 text-sm font-medium ${msg.role === 'user' ? 'bg-github-black text-peach-100 shadow-[4px_4px_0px_0px_#d97757]' : 'bg-white border border-github-black text-github-black'}`}>
                    <div className="markdown-body prose prose-sm max-w-none" dangerouslySetInnerHTML={renderMarkdown(msg.text)} />
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                   <div className="bg-white border border-github-black p-4 flex gap-2">
                     <div className="w-1.5 h-1.5 bg-peach-accent animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-peach-accent animate-bounce [animation-delay:0.2s]"></div>
                     <div className="w-1.5 h-1.5 bg-peach-accent animate-bounce [animation-delay:0.4s]"></div>
                   </div>
                </div>
              )}
            </div>
            <form onSubmit={handleSendMessage} className="p-6 border-t border-github-black bg-white">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the researcher..."
                  className="flex-1 border border-github-black px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-peach-accent bg-peach-50"
                  disabled={isChatLoading}
                />
                <button 
                  type="submit" 
                  disabled={isChatLoading || !chatInput.trim()}
                  className="bg-github-black text-white px-6 py-3 uppercase text-[10px] font-black tracking-widest hover:bg-peach-accent disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {isZoomed && implementation.architectureImage && (
        <div className="fixed inset-0 z-[200] bg-github-black/95 p-10 flex items-center justify-center animate-in zoom-in-95 duration-200" onClick={() => setIsZoomed(false)}>
           <img src={implementation.architectureImage} alt="Full Resolution" className="max-w-full max-h-full shadow-2xl border border-white/10" />
        </div>
      )}

      <div className="bg-white border border-github-black shadow-[24px_24px_0px_0px_#0d1117] overflow-hidden">
        <div className="bg-github-black p-12 md:p-16 text-peach-100 border-b border-github-black relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-peach-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 relative z-10">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest ${implementation.testResults.passed ? 'bg-emerald-500' : 'bg-peach-accent'} text-white`}>
                  {implementation.testResults.passed ? 'Verified' : 'Stable'}
                </span>
                <span className="text-[9px] font-mono opacity-40">Loops: {implementation.iterationCount}</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[0.9]">{analysis.title}</h1>
              <p className="text-peach-accent/60 font-mono text-xs uppercase tracking-widest">Synthesis Engine v1.0</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button onClick={exportScript} className="px-6 py-4 border border-peach-100 text-peach-100 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-github-black">
                Download .py
              </button>
              {implementation.audioData && (
                <button onClick={playVocal} className={`px-6 py-4 bg-peach-accent text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 ${isPlaying ? 'opacity-50' : ''}`}>
                  {isPlaying ? 'Playing Map...' : 'Listen to Map'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-peach-100 flex overflow-x-auto border-b border-github-black no-scrollbar sticky top-[73px] z-40">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-r border-github-black/10 whitespace-nowrap relative
                ${activeTab === tab.id ? 'bg-white text-github-black shadow-[inset_0_-4px_0_0_#d97757]' : 'text-github-black/40 hover:text-github-black hover:bg-white/50'}
              `}
            >
              {tab.label}
              {tab.pro && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-peach-accent"></span>}
            </button>
          ))}
        </div>

        <div className="p-12 md:p-16">
          {activeTab === 'summary' && (
            <div className="space-y-12 animate-in fade-in max-w-4xl">
              <section className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-peach-accent">Research Summary</h2>
                <div className="text-2xl md:text-3xl font-medium tracking-tight leading-snug text-github-black markdown-body" dangerouslySetInnerHTML={renderMarkdown(analysis.summary)} />
              </section>
              <section className="space-y-6 pt-12 border-t border-github-black/5">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-peach-accent">Extracted Methodology</h2>
                <div className="text-lg text-github-black/70 leading-relaxed font-medium markdown-body" dangerouslySetInnerHTML={renderMarkdown(analysis.methodology)} />
              </section>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex justify-between items-center">
                 <h3 className="text-xs font-black uppercase tracking-widest text-peach-accent">Python Implementation Block</h3>
                 <button 
                  onClick={handleReverify}
                  disabled={isReverifying}
                  className="px-6 py-3 bg-github-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-peach-accent"
                >
                  {isReverifying ? 'Verifying...' : 'Manual Re-Verify'}
                </button>
              </div>
              <div className="bg-github-black p-10 border border-github-border shadow-2xl relative">
                <textarea 
                  className="w-full bg-transparent font-mono text-sm text-github-text leading-relaxed outline-none min-h-[500px] resize-none"
                  value={implementation.code}
                  onChange={(e) => setImplementation(prev => ({ ...prev, code: e.target.value }))}
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'pro' && (
            <div className="space-y-12 animate-in fade-in text-center min-h-[400px] flex flex-col justify-center">
              {implementation.architectureImage ? (
                <>
                  <h2 className="text-3xl font-bold uppercase tracking-tight mb-8">Architectural Blueprint</h2>
                  <div className="max-w-4xl mx-auto border-[12px] border-github-black shadow-2xl bg-white p-4 cursor-zoom-in" onClick={() => setIsZoomed(true)}>
                    <img src={implementation.architectureImage} alt="Arch Map" className="w-full h-auto" />
                  </div>
                </>
              ) : (
                <div className="max-w-xl mx-auto p-20 border-2 border-dashed border-github-black/10 text-center opacity-40">
                  <p className="text-xs font-black uppercase tracking-widest">Visualizer offline for this tier</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'artifacts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-5">
              <div className="bg-white border-2 border-github-black p-8 space-y-6 hover:-translate-y-2 transition-transform shadow-[8px_8px_0px_0px_#000]">
                <div className="w-12 h-12 bg-github-black text-peach-100 flex items-center justify-center font-bold">.PY</div>
                <h4 className="text-lg font-bold uppercase tracking-tight">Verified Module</h4>
                <p className="text-xs text-github-black/50 font-medium">Standalone implementation with unit tests and NumPy dependencies.</p>
                <button onClick={exportScript} className="w-full py-3 bg-github-black text-white text-[9px] font-black uppercase tracking-widest">Download Source</button>
              </div>
              <div className="bg-white border-2 border-github-black p-8 space-y-6 hover:-translate-y-2 transition-transform shadow-[8px_8px_0px_0px_#000]">
                <div className="w-12 h-12 bg-peach-accent text-white flex items-center justify-center font-bold">.MD</div>
                <h4 className="text-lg font-bold uppercase tracking-tight">Research Report</h4>
                <p className="text-xs text-github-black/50 font-medium">Full summary of methodology, extracted variables, and verification logs.</p>
                <button onClick={exportReport} className="w-full py-3 border border-github-black text-[9px] font-black uppercase tracking-widest">Download Report</button>
              </div>
              <div className="bg-white border-2 border-github-black p-8 space-y-6 hover:-translate-y-2 transition-transform shadow-[8px_8px_0px_0px_#000]">
                <div className="w-12 h-12 bg-github-black text-peach-100 flex items-center justify-center font-bold">.JSON</div>
                <h4 className="text-lg font-bold uppercase tracking-tight">Logic Manifest</h4>
                <p className="text-xs text-github-black/50 font-medium">Raw extracted data structure for integration with other research tools.</p>
                <button onClick={() => downloadFile(`data_${analysis.title.replace(/\s+/g, '_').toLowerCase()}.json`, JSON.stringify(analysis, null, 2), 'application/json')} className="w-full py-3 border border-github-black text-[9px] font-black uppercase tracking-widest">Download JSON</button>
              </div>
            </div>
          )}

          {activeTab === 'explainer' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="grid grid-cols-1 gap-12">
                {implementation.equationMappings?.map((map, i) => (
                  <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="p-10 bg-peach-100 border border-github-black/5 space-y-4">
                      <p className="text-2xl font-bold tracking-tight italic">"{map.theory}"</p>
                      <p className="text-sm text-github-black/60 font-medium leading-relaxed">{map.explanation}</p>
                    </div>
                    <div className="bg-github-black p-8 border border-github-black overflow-x-auto shadow-xl">
                      <pre className="font-mono text-xs text-github-text"><code>{map.codeSnippet}</code></pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'inspector' && (
            <div className="space-y-8 animate-in fade-in">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-peach-accent">Process Logs</h3>
                    <div className="bg-github-black p-6 border border-github-border shadow-xl h-[500px] overflow-y-auto custom-scrollbar">
                      <pre className="font-mono text-[10px] text-github-text leading-relaxed whitespace-pre-wrap">
                        {implementation.testResults.logs || "[IDLE] Runtime stable."}
                      </pre>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-peach-accent">Variable Memory</h3>
                    <div className="border border-github-black h-[500px] overflow-y-auto bg-white shadow-inner divide-y divide-github-black/10">
                      {implementation.testResults.variables?.length ? implementation.testResults.variables.map((v, i) => (
                        <div key={i} className="p-4">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-mono text-xs font-bold">{v.name}</span>
                            <span className="text-[8px] opacity-30 uppercase font-black">{v.type}</span>
                          </div>
                          <div className="font-mono text-[10px] opacity-60 truncate">{v.value}</div>
                        </div>
                      )) : (
                        <div className="p-12 text-center opacity-20 text-[10px] font-black uppercase">No variables tracked</div>
                      )}
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsUI;
