
import React, { useState, useRef, useEffect } from 'react';
import { PaperAnalysis, ImplementationResult } from '../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { marked } from 'marked';

interface ResultsUIProps {
  analysis: PaperAnalysis;
  implementation: ImplementationResult;
}

const Markdown: React.FC<{ content: string; className?: string }> = ({ content, className = "" }) => {
  const html = marked.parse(content) as string;
  return <div className={`markdown-body break-words ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};

const ResultsUI: React.FC<ResultsUIProps> = ({ analysis, implementation }) => {
  const [activeTab, setActiveTab] = useState<'explainer' | 'code' | 'inspector' | 'evolution' | 'benchmarks' | 'grounding' | 'pro'>('explainer');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const graphData = [
    { iteration: 0, matchScore: 0, label: 'Origin' },
    ...implementation.history.map(h => ({
      iteration: h.iteration,
      matchScore: h.matchScore,
      label: `Cycle ${h.iteration}`
    }))
  ];

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const playVocal = async () => {
    if (!implementation.audioData) return;
    if (isPlaying) return;

    setIsPlaying(true);
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = ctx;

    const bytes = decodeBase64(implementation.audioData);
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000">
      <div className="bg-white border border-github-black shadow-[24px_24px_0px_0px_rgba(13,17,23,1)]">
        {/* Header */}
        <div className="bg-github-black p-12 md:p-16 text-peach-100 border-b border-github-black relative overflow-hidden">
          {implementation.architectureImage && (
            <div className="absolute top-0 right-0 w-1/3 h-full opacity-20 pointer-events-none">
              <img src={implementation.architectureImage} alt="" className="object-cover w-full h-full grayscale" />
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 relative z-10">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-peach-accent text-white text-[9px] font-black uppercase tracking-widest">Autonomous Convergence Achieved</span>
                {implementation.architectureImage && <span className="px-3 py-1 bg-white text-github-black text-[9px] font-black uppercase tracking-widest">PRO TIER Verified</span>}
              </div>
              <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[0.9]">{analysis.title}</h1>
            </div>
            <div className="flex gap-4">
              {implementation.audioData && (
                <button onClick={playVocal} className={`px-8 py-4 border border-peach-100 text-peach-100 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-github-black transition-all ${isPlaying ? 'opacity-50' : ''}`}>
                  {isPlaying ? 'Playing Audio...' : 'Hear Explanation'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-peach-100 flex overflow-x-auto border-b border-github-black">
          {[
            { id: 'explainer', label: 'The Explainer' },
            { id: 'code', label: 'Implementation' },
            { id: 'grounding', label: 'Research Sources', pro: true },
            { id: 'pro', label: 'AI Visualizer', pro: true },
            { id: 'inspector', label: 'Runtime Inspector' },
            { id: 'evolution', label: 'Agent Journey' },
            { id: 'benchmarks', label: 'Benchmark Parity' }
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
              <div className="max-w-3xl space-y-8">
                <h2 className="text-4xl font-bold tracking-tighter uppercase italic">Bridging Theory & Code</h2>
                <p className="text-xl text-github-black/60 font-medium leading-relaxed">Direct linkage between academic prose and functional Python.</p>
              </div>
              <div className="grid grid-cols-1 gap-12">
                {implementation.equationMappings?.map((map, i) => (
                  <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-12 group">
                    <div className="p-10 bg-peach-100 border border-github-black/5 space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-peach-accent">Theory Reference</h4>
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

          {activeTab === 'grounding' && (
            <div className="space-y-12 animate-in fade-in">
              <h2 className="text-4xl font-bold tracking-tighter uppercase">Grounding Sources</h2>
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

          {activeTab === 'pro' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="max-w-2xl">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">AI Architecture Visualizer</h2>
                <p className="text-github-black/60 mt-4 font-medium italic">Synthesized from paper methodology description via Gemini 3 Pro Vision.</p>
              </div>
              {implementation.architectureImage && (
                <div className="border-4 border-github-black shadow-[20px_20px_0px_0px_#d97757]">
                  <img src={implementation.architectureImage} alt="AI Architecture" className="w-full h-auto" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="bg-github-black p-10 border border-github-border rounded-lg shadow-inner overflow-hidden">
                <pre className="overflow-x-auto"><code className="font-mono text-sm text-github-text leading-relaxed">{implementation.code}</code></pre>
              </div>
            </div>
          )}

          {activeTab === 'evolution' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="p-12 bg-peach-50 border border-github-black/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-peach-accent mb-8">Autonomous Parity Convergence</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Area type="monotone" dataKey="matchScore" stroke="#d97757" strokeWidth={4} fill="#d97757" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'benchmarks' && (
            <div className="space-y-12 animate-in fade-in">
               <div className="h-[500px] w-full pt-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={implementation.finalBenchmarkComparison} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip />
                    <Bar dataKey="paperValue" name="PAPER" fill="#0d1117" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="implValue" name="VERIFIED" fill="#d97757" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsUI;
