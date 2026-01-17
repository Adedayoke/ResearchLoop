
import React, { useState, useRef } from 'react';
import { PaperAnalysis, ImplementationResult } from '../types';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { marked } from 'marked';

interface ResultsUIProps {
  analysis: PaperAnalysis;
  implementation: ImplementationResult;
}

const ResultsUI: React.FC<ResultsUIProps> = ({ analysis, implementation }) => {
  const [activeTab, setActiveTab] = useState<'explainer' | 'code' | 'inspector' | 'evolution' | 'parity' | 'grounding' | 'pro'>('explainer');
  const [isPlaying, setIsPlaying] = useState(false);
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
      console.error("Playback failed", e);
      setIsPlaying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000">
      <div className="bg-white border border-github-black shadow-[24px_24px_0px_0px_rgba(13,17,23,1)] overflow-hidden">
        {/* Header */}
        <div className="bg-github-black p-12 md:p-16 text-peach-100 border-b border-github-black relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 relative z-10">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest ${implementation.testResults.passed ? 'bg-emerald-500' : 'bg-peach-accent'} text-white`}>
                  {implementation.testResults.passed ? 'Verified Logic Convergence' : 'Structural Traceback Unresolved'}
                </span>
                {implementation.architectureImage && <span className="px-3 py-1 bg-white text-github-black text-[9px] font-black uppercase tracking-widest">PRO TIER VISUALS</span>}
              </div>
              <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[0.9]">{analysis.title}</h1>
            </div>
            <div className="flex gap-4">
              {implementation.audioData && (
                <button onClick={playVocal} className={`px-8 py-4 border border-peach-100 text-peach-100 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-github-black transition-all ${isPlaying ? 'opacity-50 animate-pulse' : ''}`}>
                  {isPlaying ? 'Synthesized Voice Active' : 'Hear Vocal Analysis'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-peach-100 flex overflow-x-auto border-b border-github-black">
          {[
            { id: 'explainer', label: 'Theory Map' },
            { id: 'code', label: 'Implementation' },
            { id: 'parity', label: 'Structural Analysis' },
            { id: 'pro', label: 'AI Visualizer', pro: true },
            { id: 'inspector', label: 'Runtime Inspector' },
            { id: 'evolution', label: 'Agent Journey' },
            { id: 'grounding', label: 'Web Grounding', pro: true }
          ].filter(tab => !tab.pro || (tab.pro && implementation.architectureImage)).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-r border-github-black/10 whitespace-nowrap
                ${activeTab === tab.id ? 'bg-white text-github-black shadow-[inset_0_-4px_0_0_#d97757]' : 'text-github-black/40 hover:text-github-black hover:bg-white/50'}
              `}
            >
              {tab.label} {tab.pro && "✨"}
            </button>
          ))}
        </div>

        <div className="p-12 md:p-16">
          {activeTab === 'explainer' && (
            <div className="space-y-20 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 gap-12">
                {implementation.equationMappings?.map((map, i) => (
                  <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-12 group">
                    <div className="p-10 bg-peach-100 border border-github-black/5 space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-peach-accent">Theory Link</h4>
                      <p className="text-2xl font-bold tracking-tight italic">"{map.theory}"</p>
                      <p className="text-sm text-github-black/60 font-medium leading-relaxed">{map.explanation}</p>
                    </div>
                    <div className="bg-github-black p-8 border border-github-black overflow-x-auto shadow-xl">
                      <pre className="font-mono text-xs text-github-text leading-relaxed"><code>{map.codeSnippet}</code></pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pro' && implementation.architectureImage && (
            <div className="space-y-12 animate-in fade-in text-center">
              <h2 className="text-4xl font-bold tracking-tighter uppercase">AI Architecture Synthesis</h2>
              <div className="max-w-4xl mx-auto border-8 border-github-black shadow-[30px_30px_0px_0px_#d97757]">
                <img src={implementation.architectureImage} alt="AI Architecture" className="w-full h-auto" />
              </div>
              <p className="text-github-black/40 text-[10px] font-black uppercase tracking-widest mt-8">Multimodal Visualization generated from Research Context</p>
            </div>
          )}

          {activeTab === 'parity' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="max-w-3xl space-y-4">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Structural Parity Verification</h2>
                {!implementation.testResults.passed && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-widest mb-6">
                    ⚠️ Logic verification failed after 8 iterations. Structural details below are based on partial convergence.
                  </div>
                )}
                <p className="text-github-black/60 font-medium italic">Honest Engineering: Mapping methodology directly to the autonomous implementation.</p>
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
                      <span className="text-[9px] font-black uppercase opacity-30">Agent Implementation</span>
                      <p className="text-sm font-mono text-github-black leading-relaxed">{point.implementationDetail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="flex justify-between items-center border-b border-github-black/10 pb-6">
                <h2 className="text-2xl font-bold tracking-tighter uppercase">Verified Logical core</h2>
                <button onClick={() => {
                  const blob = new Blob([implementation.code], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'implementation.py';
                  a.click();
                }} className="text-[10px] font-black uppercase tracking-widest text-peach-accent hover:underline">Download .py</button>
              </div>
              <div className="bg-github-black p-10 border border-github-border rounded-lg shadow-inner overflow-hidden">
                <pre className="overflow-x-auto"><code className="font-mono text-sm text-github-text leading-relaxed">{implementation.code}</code></pre>
              </div>
            </div>
          )}

          {activeTab === 'inspector' && (
            <div className="space-y-12 animate-in fade-in">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-peach-accent">WASM Isolated Terminal</h3>
                    <div className="bg-github-black p-6 border border-github-border rounded-lg h-[500px] overflow-y-auto">
                      <pre className="font-mono text-[10px] text-github-text leading-relaxed whitespace-pre-wrap">{implementation.testResults.logs}</pre>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-peach-accent">Global Variable Space</h3>
                    <div className="border border-github-black divide-y divide-github-black/10 h-[500px] overflow-y-auto bg-white">
                      {implementation.testResults.variables?.map((v, i) => (
                        <div key={i} className="p-4 bg-white hover:bg-peach-50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-mono text-xs font-bold text-github-black">{v.name}</span>
                            <span className="text-[9px] font-black uppercase opacity-30">{v.type}</span>
                          </div>
                          <div className="font-mono text-[10px] text-github-black/60 truncate">{v.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'evolution' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="p-12 bg-peach-50 border border-github-black/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-peach-accent mb-8">Agent Convergence Journey</h3>
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
                  <div key={i} className="p-8 border border-github-black/5 bg-white space-y-4 group hover:border-peach-accent/30 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-tight">Loop Cycle 0{h.iteration}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${h.error ? 'text-peach-accent' : 'text-emerald-500'}`}>
                        {h.error ? 'RUNTIME COLLISION' : 'CONVERGED'}
                      </span>
                    </div>
                    <p className="text-sm text-github-black/70 leading-relaxed font-medium italic">"{h.explanation}"</p>
                    {h.error && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-100 font-mono text-[10px] text-red-700 overflow-x-auto">
                        <span className="font-bold uppercase mb-2 block text-red-900">Traceback Repair Log:</span>
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
              <h2 className="text-4xl font-bold tracking-tighter uppercase">Web Grounding Sources</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysis.groundingSources?.map((source, i) => (
                  <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="p-8 bg-white border border-github-black/10 hover:border-peach-accent transition-all group">
                    <h4 className="text-xl font-bold mb-4 group-hover:text-peach-accent">{source.title}</h4>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 truncate block">{source.uri}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsUI;
