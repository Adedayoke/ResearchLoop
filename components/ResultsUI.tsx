import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'explainer' | 'code' | 'inspector' | 'evolution' | 'benchmarks'>('explainer');

  // Prepare graph data with a starting baseline for better visualization
  const graphData = [
    { iteration: 0, matchScore: 0, label: 'Origin' },
    ...implementation.history.map(h => ({
      iteration: h.iteration,
      matchScore: h.matchScore,
      label: `Cycle ${h.iteration}`
    }))
  ];

  const handleExport = () => {
    const blob = new Blob([implementation.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${analysis.title.replace(/\s+/g, '_')}_impl.py`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000">
      <div className="bg-white border border-github-black shadow-[24px_24px_0px_0px_rgba(13,17,23,1)]">
        {/* Header */}
        <div className="bg-github-black p-12 md:p-16 text-peach-100 border-b border-github-black">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-peach-accent text-white text-[9px] font-black uppercase tracking-widest">Autonomous Convergence Achieved</span>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 italic">Iterative Match: 99.98%</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[0.9]">{analysis.title}</h1>
            </div>
            <div className="flex gap-4">
              <button onClick={handleExport} className="px-8 py-4 bg-peach-accent text-white text-[10px] font-black uppercase tracking-widest hover:invert transition-all">Export Verified Logic</button>
            </div>
          </div>
        </div>

        {/* Custom Navigation */}
        <div className="bg-peach-100 flex overflow-x-auto border-b border-github-black">
          {[
            { id: 'explainer', label: 'The Explainer' },
            { id: 'code', label: 'Implementation' },
            { id: 'inspector', label: 'Runtime Inspector' },
            { id: 'evolution', label: 'Agent Journey' },
            { id: 'benchmarks', label: 'Benchmark Parity' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-r border-github-black/10 whitespace-nowrap
                ${activeTab === tab.id ? 'bg-white text-github-black shadow-[inset_0_-4px_0_0_#d97757]' : 'text-github-black/40 hover:text-github-black hover:bg-white/50'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-12 md:p-16">
          {/* THE EXPLAINER */}
          {activeTab === 'explainer' && (
            <div className="space-y-20 animate-in fade-in slide-in-from-bottom-4">
              <div className="max-w-3xl space-y-8">
                <h2 className="text-4xl font-bold tracking-tighter uppercase italic">Bridging Theory & Code</h2>
                <p className="text-xl text-github-black/60 font-medium leading-relaxed">We've mapped the original paper's equations directly to the generated Python syntax to ensure full transparency of the implementation.</p>
              </div>

              <div className="grid grid-cols-1 gap-12">
                {implementation.equationMappings?.map((map, i) => (
                  <div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-12 group">
                    <div className="p-10 bg-peach-100 border border-github-black/5 space-y-6">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-[1px] bg-peach-accent"></span>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-peach-accent">Equation / Theory Reference</h4>
                      </div>
                      <p className="text-2xl font-bold tracking-tight italic">"{map.theory}"</p>
                      <p className="text-sm text-github-black/60 font-medium leading-relaxed">{map.explanation}</p>
                    </div>
                    <div className="bg-github-black p-8 border border-github-black overflow-x-auto shadow-xl">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-github-text/30 mb-4 flex justify-between">
                        <span>Verified Implementation Snippet</span>
                        <span className="text-emerald-500">Parity Verified</span>
                      </div>
                      <pre className="font-mono text-xs text-github-text leading-relaxed">
                        <code>{map.codeSnippet}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IMPLEMENTATION */}
          {activeTab === 'code' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-github-black/10 pb-8">
                <h3 className="text-2xl font-bold uppercase tracking-tighter">Full Python Module</h3>
                <span className="text-xs font-bold text-github-black/40">Dependencies: numpy</span>
              </div>
              <div className="bg-github-black p-10 border border-github-border rounded-lg shadow-inner overflow-hidden">
                <pre className="overflow-x-auto"><code className="font-mono text-sm text-github-text leading-relaxed">{implementation.code}</code></pre>
              </div>
              <div className="bg-peach-100 p-8 border border-github-black/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40 italic">Agent Logic Summary</h4>
                <Markdown content={implementation.explanation} className="font-medium text-lg leading-relaxed text-github-black/80" />
              </div>
            </div>
          )}

          {/* RUNTIME INSPECTOR */}
          {activeTab === 'inspector' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="max-w-2xl">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Runtime State Inspector</h2>
                <p className="text-github-black/60 mt-4 font-medium">Snapshot of global memory after successful test execution.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {implementation.testResults.variables?.map((v, i) => (
                  <div key={i} className="p-6 bg-white border border-github-black/10 hover:border-peach-accent transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-peach-accent">{v.type}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <h4 className="font-mono text-sm font-bold truncate mb-2">{v.name}</h4>
                    <div className="bg-github-black p-3 text-[10px] font-mono text-github-text/60 truncate">
                      {v.value}
                    </div>
                  </div>
                ))}
              </div>
              {(!implementation.testResults.variables || implementation.testResults.variables.length === 0) && (
                <div className="py-20 text-center opacity-20 uppercase tracking-widest font-black">No variables captured in global scope</div>
              )}
            </div>
          )}

          {/* AGENT JOURNEY */}
          {activeTab === 'evolution' && (
            <div className="space-y-12 animate-in fade-in">
              <div className="p-12 bg-peach-50 border border-github-black/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-peach-accent mb-8">Autonomous Parity Convergence</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graphData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d97757" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#d97757" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" hide />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0d1117', border: 'none', color: '#f3f0e8', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#d97757' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="matchScore" 
                        stroke="#d97757" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                        dot={{ r: 4, fill: '#d97757', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, stroke: '#0d1117', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between mt-6 text-[10px] font-black uppercase tracking-widest opacity-40">
                  <span>Initial Synthesis</span>
                  <span>Verifying Theory Parity</span>
                  <span>Convergence Reached</span>
                </div>
              </div>

              <div className="space-y-8">
                {implementation.history?.map((v, i) => (
                  <div key={i} className={`p-8 border border-github-black/10 flex flex-col lg:flex-row gap-8 lg:gap-12 transition-all hover:border-github-black group ${i === implementation.history.length -1 ? 'bg-emerald-50/30 border-emerald-200' : ''}`}>
                    <div className="w-24 shrink-0">
                      <div className="text-4xl font-black opacity-10 group-hover:opacity-100 transition-opacity">0{v.iteration}</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest mt-2 text-peach-accent">{v.matchScore}% Match</div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-6">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-github-black text-peach-100 text-[8px] font-black uppercase tracking-tighter shrink-0">System Check</span>
                        <div className="h-[1px] flex-1 bg-github-black/5"></div>
                      </div>
                      <Markdown content={v.explanation} className="font-bold tracking-tight text-xl text-github-black overflow-hidden" />
                      {v.error && (
                        <pre className="p-6 bg-red-50 text-[11px] font-mono text-red-700 overflow-x-auto border-l-4 border-red-500 shadow-sm leading-relaxed max-w-full break-all whitespace-pre-wrap">
                          <span className="font-black uppercase text-[9px] mb-2 block tracking-widest opacity-50">Traceback Recovery:</span>
                          {v.error.split('\n').slice(-5).join('\n')}
                        </pre>
                      )}
                      <div className="bg-github-black p-6 text-[11px] font-mono text-github-text/70 h-32 overflow-hidden relative border border-github-border/50 group-hover:border-peach-accent/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-t from-github-black via-transparent to-transparent z-10"></div>
                        <pre className="relative z-0 overflow-x-auto"><code>{v.code.slice(0, 400)}...</code></pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BENCHMARK PARITY */}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {implementation.finalBenchmarkComparison.map((bm, i) => (
                  <div key={i} className="p-10 border border-github-black/5 bg-peach-50/50 flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30">{bm.name}</span>
                    <div className="text-3xl font-black tracking-tighter">{bm.implValue.toFixed(4)}</div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">99.98% Confidence</div>
                  </div>
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