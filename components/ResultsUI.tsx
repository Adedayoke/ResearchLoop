
import React, { useState, useRef, useEffect } from 'react';
import { PaperAnalysis, ImplementationResult } from '../types';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { marked } from 'marked';

interface ResultsUIProps {
  analysis: PaperAnalysis;
  implementation: ImplementationResult;
  onReset?: () => void;
}

const ResultsUI: React.FC<ResultsUIProps> = ({ analysis, implementation, onReset }) => {
  const [activeTab, setActiveTab] = useState<'explainer' | 'code' | 'inspector' | 'evolution' | 'parity' | 'grounding' | 'pro' | 'summary'>('summary');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const graphData = [
    { iteration: 0, stability: 0, label: 'Origin' },
    ...implementation.history.map(h => ({
      iteration: h.iteration,
      stability: h.stabilityScore,
      label: `Cycle ${h.iteration}`
    }))
  ];

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

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'explainer', label: 'Theory Map' },
    { id: 'pro', label: 'AI Visualizer', pro: true },
    { id: 'code', label: 'Implementation' },
    { id: 'parity', label: 'Structural Analysis' },
    { id: 'inspector', label: 'Runtime Inspector' },
    { id: 'evolution', label: 'Agent Journey' },
    { id: 'grounding', label: 'Search Sources', pro: true }
  ].filter(tab => !tab.pro || (tab.pro && (implementation.architectureImage || (analysis.groundingSources && analysis.groundingSources.length > 0))));

  const renderMarkdown = (text: string) => {
    return { __html: marked.parse(text || '') };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000">
      {isZoomed && implementation.architectureImage && (
        <div className="fixed inset-0 z-[200] bg-github-black/95 p-10 flex items-center justify-center animate-in zoom-in-95 duration-200" onClick={() => setIsZoomed(false)}>
           <button className="absolute top-10 right-10 text-white font-bold text-2xl">✕</button>
           <img src={implementation.architectureImage} alt="Full Resolution Architecture" className="max-w-full max-h-full shadow-2xl border border-white/10" />
        </div>
      )}

      <div className="bg-white border border-github-black shadow-[24px_24px_0px_0px_rgba(13,17,23,1)] overflow-hidden">
        {/* Header */}
        <div className="bg-github-black p-12 md:p-16 text-peach-100 border-b border-github-black relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-peach-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 relative z-10">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest ${implementation.testResults.passed ? 'bg-emerald-500' : 'bg-peach-accent'} text-white`}>
                  {implementation.testResults.passed ? 'Verified Logic Convergence' : 'Partial Logic Synthesis'}
                </span>
                {implementation.architectureImage && <span className="px-3 py-1 bg-white text-github-black text-[9px] font-black uppercase tracking-widest">Multimodal High-Fidelity</span>}
              </div>
              <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[0.9]">{analysis.title}</h1>
              {analysis.authors && analysis.authors.length > 0 && (
                <p className="text-peach-accent/60 font-mono text-xs uppercase tracking-widest">Authored by: {analysis.authors.join(', ')}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {implementation.audioData && (
                <button onClick={playVocal} className={`px-6 py-4 border border-peach-100 text-peach-100 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-github-black transition-all ${isPlaying ? 'opacity-50' : ''}`}>
                  {isPlaying ? 'Synthesizing...' : 'Hear Theory Map'}
                </button>
              )}
              {onReset && (
                <button onClick={onReset} className="px-6 py-4 bg-peach-accent text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">
                  New Research
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
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
              {tab.pro && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-peach-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-peach-accent"></span>
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-12 md:p-16">
          {activeTab === 'summary' && (
            <div className="space-y-12 animate-in fade-in max-w-4xl">
              <section className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-peach-accent">Research Abstract</h2>
                <div 
                  className="text-2xl md:text-3xl font-medium tracking-tight leading-snug text-github-black markdown-body" 
                  dangerouslySetInnerHTML={renderMarkdown(analysis.summary)}
                />
              </section>
              
              <section className="space-y-6 pt-12 border-t border-github-black/5">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-peach-accent">Core Methodology</h2>
                <div 
                  className="text-lg text-github-black/70 leading-relaxed font-medium markdown-body" 
                  dangerouslySetInnerHTML={renderMarkdown(analysis.methodology)}
                />
              </section>

              {analysis.benchmarks && analysis.benchmarks.length > 0 && (
                <section className="space-y-6 pt-12 border-t border-github-black/5">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-peach-accent">Verified Benchmarks</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analysis.benchmarks.map((b, i) => (
                      <div key={i} className="p-6 bg-peach-100 border border-github-black/5 space-y-2">
                        <h4 className="font-bold text-sm uppercase tracking-tight">{b.name}</h4>
                        <p className="text-xs text-github-black/60 font-medium leading-relaxed">{b.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'explainer' && (
            <div className="space-y-20 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 gap-12">
                {implementation.equationMappings?.map((map, i) => (
                  <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-12 group">
                    <div className="p-10 bg-peach-100 border border-github-black/5 space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-peach-accent">Methodology Segment</h4>
                        <span className="text-[9px] font-mono text-github-black/30">ID: {Math.random().toString(36).substr(2, 5).toUpperCase()}</span>
                      </div>
                      <p className="text-2xl font-bold tracking-tight italic">"{map.theory}"</p>
                      <p className="text-sm text-github-black/60 font-medium leading-relaxed">{map.explanation}</p>
                    </div>
                    <div className="bg-github-black p-8 border border-github-black overflow-x-auto shadow-xl group-hover:scale-[1.01] transition-transform">
                      <pre className="font-mono text-xs text-github-text leading-relaxed"><code>{map.codeSnippet}</code></pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pro' && implementation.architectureImage && (
            <div className="space-y-12 animate-in fade-in text-center">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Architectural Synthesis</h2>
                <p className="text-github-black/60 font-medium text-lg max-w-2xl mx-auto">Multimodal logic extracted from PDF vector representations and methodology prose.</p>
              </div>
              <div 
                className="max-w-4xl mx-auto border-[12px] border-github-black shadow-[30px_30px_0px_0px_rgba(217,119,87,0.15)] bg-white p-4 cursor-zoom-in transition-transform hover:scale-[1.01]"
                onClick={() => setIsZoomed(true)}
              >
                <img src={implementation.architectureImage} alt="AI Architecture" className="w-full h-auto" />
                <div className="mt-6 pt-6 border-t border-github-black/5 flex justify-between items-center px-4">
                   <span className="text-[9px] font-black uppercase tracking-widest text-github-black/30">Schema Hash: {Math.random().toString(16).slice(2, 10).toUpperCase()}</span>
                   <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-peach-accent">Gemini 3 Pro Schematic</span>
                      <span className="text-[9px] font-bold text-github-black/40">Click to expand</span>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parity' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="max-w-3xl space-y-4">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Structural Verification</h2>
                {!implementation.testResults.passed && (
                  <div className="p-6 bg-red-50 border border-red-100 text-red-700 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest">⚠️ Convergence Interrupted</p>
                    <p className="text-sm font-medium">Loop terminated before full stability. Inspector contains raw tracebacks.</p>
                  </div>
                )}
              </div>
              <div className="border border-github-black divide-y divide-github-black">
                {implementation.structuralParity?.map((point, i) => (
                  <div key={i} className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-10 bg-white hover:bg-peach-50 transition-colors">
                    <div className="space-y-2">
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase ${point.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-peach-100 text-peach-accent'}`}>
                        {point.status}
                      </span>
                      <h4 className="text-xl font-bold uppercase tracking-tighter">{point.feature}</h4>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase opacity-30">Paper Logic</span>
                      <p className="text-sm text-github-black/60 leading-relaxed font-medium">{point.paperClaim}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase opacity-30">Synthesized Instance</span>
                      <p className="text-sm font-mono text-github-black leading-relaxed">{point.implementationDetail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="bg-github-black p-10 border border-github-border shadow-2xl overflow-hidden relative">
                <div className="absolute top-4 right-4 flex gap-4">
                   <button onClick={() => navigator.clipboard.writeText(implementation.code)} className="text-[9px] font-black uppercase tracking-widest text-github-text/40 hover:text-white transition-colors">Copy logic</button>
                </div>
                <pre className="overflow-x-auto"><code className="font-mono text-sm text-github-text leading-relaxed">{implementation.code}</code></pre>
              </div>
            </div>
          )}

          {activeTab === 'inspector' && (
            <div className="space-y-12 animate-in fade-in">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-peach-accent">WASM Process Output</h3>
                    <div className="bg-github-black p-6 border border-github-border shadow-xl h-[500px] overflow-y-auto custom-scrollbar">
                      <pre className="font-mono text-[10px] text-github-text leading-relaxed whitespace-pre-wrap">{implementation.testResults.logs || "[IDLE] System ready for execution."}</pre>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-peach-accent">Memory Map</h3>
                    <div className="border border-github-black divide-y divide-github-black/10 h-[500px] overflow-y-auto bg-white shadow-inner">
                      {implementation.testResults.variables && implementation.testResults.variables.length > 0 ? implementation.testResults.variables.map((v, i) => (
                        <div key={i} className="p-4 bg-white hover:bg-peach-50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-mono text-xs font-bold text-github-black">{v.name}</span>
                            <span className="text-[9px] font-black uppercase opacity-30">{v.type}</span>
                          </div>
                          <div className="font-mono text-[10px] text-github-black/60 truncate">{v.value}</div>
                        </div>
                      )) : (
                        <div className="p-12 text-center text-[10px] font-black uppercase opacity-20">No active memory objects</div>
                      )}
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'evolution' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="p-12 bg-peach-50 border border-github-black/5 shadow-inner">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-peach-accent mb-8">Convergence Probability</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Area type="monotone" dataKey="stability" stroke="#d97757" strokeWidth={4} fill="#d97757" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-8 mt-12 pt-12 border-t border-github-black/10">
                {implementation.history.map((h, i) => (
                  <div key={i} className="p-8 border border-github-black/5 bg-white space-y-4 group hover:border-peach-accent/30 transition-all shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-tight">Loop iteration 0{h.iteration}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${h.error ? 'text-peach-accent' : 'text-emerald-500'}`}>
                        {h.error ? 'Structural Failure' : 'Logic Stability Achieved'}
                      </span>
                    </div>
                    <p className="text-sm text-github-black/70 leading-relaxed font-medium italic">"{h.explanation}"</p>
                    {h.error && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-100 font-mono text-[10px] text-red-700 overflow-x-auto">
                        <span className="font-bold uppercase mb-2 block text-red-900 underline decoration-red-900/30">Traceback Repair Log:</span>
                        {h.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'grounding' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="max-w-3xl space-y-4">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Grounding Sources</h2>
                <p className="text-github-black/60 font-medium">Search-based verification performed during multimodal synthesis.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {analysis.groundingSources?.map((source, i) => (
                  <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="p-8 bg-white border border-github-black/10 hover:border-peach-accent transition-all group flex flex-col justify-between h-48">
                    <div>
                      <span className="text-[9px] font-black text-peach-accent uppercase tracking-widest mb-4 block">Ref [0{i+1}]</span>
                      <h4 className="text-xl font-bold group-hover:text-peach-accent line-clamp-2 leading-tight">{source.title}</h4>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 truncate block border-t border-github-black/5 pt-4">{source.uri.replace(/^https?:\/\//, '')}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(217,119,87,0.5); }
      `}</style>
    </div>
  );
};

export default ResultsUI;
