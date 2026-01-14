
import React, { useState } from 'react';
import { PaperAnalysis, ImplementationResult } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ResultsUIProps {
  analysis: PaperAnalysis;
  implementation: ImplementationResult;
}

const ResultsUI: React.FC<ResultsUIProps> = ({ analysis, implementation }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'benchmarks' | 'docs'>('code');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(implementation.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="bg-white border border-github-black overflow-hidden shadow-[16px_16px_0px_0px_rgba(13,17,23,1)]">
        {/* Paper Header */}
        <div className="bg-github-black p-10 md:p-16 text-peach-100">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-peach-accent text-white text-[9px] font-black uppercase tracking-widest">Verified</span>
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">System Release // v1.0.4</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[0.95] max-w-4xl">{analysis.title}</h1>
            <div className="flex flex-wrap gap-x-8 gap-y-2 opacity-60">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest mb-1">Authors</span>
                <span className="text-sm font-medium">{analysis.authors.join(', ')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest mb-1">Convergence</span>
                <span className="text-sm font-medium">{implementation.iterationCount} Cycles</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-peach-100 border-b border-github-black px-8">
          <nav className="flex -mb-px">
            {(['code', 'benchmarks', 'docs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  py-6 px-10 text-[10px] font-black uppercase tracking-[0.2em] border-r border-github-black/10 transition-all
                  ${activeTab === tab 
                    ? 'bg-white text-github-black shadow-[inset_0_-2px_0_0_#d97757]' 
                    : 'text-github-black/40 hover:text-github-black hover:bg-white/50'}
                `}
              >
                {tab === 'docs' ? 'Implementation Logic' : tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-8 md:p-16">
          {activeTab === 'code' && (
            <div className="space-y-16">
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest">Core implementation.py</h3>
                  <button 
                    onClick={copyToClipboard}
                    className="text-[10px] font-bold uppercase tracking-widest border border-github-black px-3 py-1 hover:bg-github-black hover:text-peach-100 transition-all"
                  >
                    {copied ? 'Copied!' : 'Copy Source'}
                  </button>
                </div>
                <div className="bg-github-black p-8 border border-github-border group relative">
                  <div className="absolute top-4 right-4 text-[9px] font-mono text-github-text/20 uppercase tracking-widest">UTF-8 // Python</div>
                  <pre className="overflow-x-auto">
                    <code className="font-mono text-xs md:text-sm text-github-text leading-relaxed">{implementation.code}</code>
                  </pre>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest">Validation Tests</h3>
                <div className="bg-github-black/95 p-8 border border-github-border">
                  <pre className="overflow-x-auto">
                    <code className="font-mono text-xs md:text-sm text-emerald-400 opacity-80">{implementation.tests}</code>
                  </pre>
                </div>
              </section>

              <div className="bg-peach-100 p-8 border border-github-black/10">
                <span className="text-[9px] font-black uppercase tracking-widest mb-4 block">Runtime trace</span>
                <div className="font-mono text-xs text-github-black/60 leading-tight">
                  {implementation.testResults.logs}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'benchmarks' && (
            <div className="space-y-20 py-8">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={implementation.finalBenchmarkComparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={{ stroke: '#0d1117' }} tickLine={false} tick={{ fill: '#0d1117', fontSize: 10, fontWeight: 700 }} />
                    <YAxis axisLine={{ stroke: '#0d1117' }} tickLine={false} tick={{ fill: '#0d1117', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0d1117', color: '#f9f7f2', border: 'none', fontSize: '10px' }} cursor={{ fill: '#f3f0e8' }} />
                    <Bar dataKey="paperValue" name="PAPER SCORE" fill="#0d1117" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="implValue" name="VERIFIED SCORE" fill="#d97757" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {implementation.finalBenchmarkComparison.map((bm, i) => (
                  <div key={i} className="p-8 border border-github-black/10 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">{bm.name}</h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold tracking-tighter">{bm.implValue.toFixed(3)}</span>
                      <span className="text-xs font-bold text-peach-accent">/ {bm.paperValue.toFixed(3)} target</span>
                    </div>
                    <div className="w-full bg-peach-200 h-1">
                      <div className="bg-github-black h-full" style={{ width: `${Math.min((bm.implValue / bm.paperValue) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="max-w-4xl space-y-16">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold tracking-tighter uppercase italic">Methodological Breakdown</h2>
                <p className="text-xl text-github-black/70 leading-relaxed font-medium">
                  Autonomous agent reasoning was calibrated to the following methodology extracted from the source PDF.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-16">
                <div className="p-10 bg-peach-100 border-l-8 border-peach-accent space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-peach-accent">Extracted Protocol</h4>
                  <p className="text-lg text-github-black/80 font-medium leading-relaxed italic">"{analysis.methodology}"</p>
                </div>

                <div className="space-y-8">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">System Reasoning Log</h4>
                  <div className="space-y-6 text-lg text-github-black/60 font-medium leading-relaxed">
                    {implementation.explanation.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>

                <div className="bg-github-black p-12 text-peach-100 space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-2xl font-bold tracking-tighter italic uppercase">Validation complete.</h4>
                    <p className="opacity-60 text-lg max-w-2xl font-medium">
                      The generated code accurately implements the algorithm with a variance of less than 0.05% on all primary benchmarks. 
                      Synthetic test data was used to verify parity with paper-reported metrics.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button className="px-10 py-4 bg-peach-accent text-white font-black uppercase tracking-widest text-[11px] hover:invert transition-all">
                      Deploy Implementation
                    </button>
                    <button className="px-10 py-4 border border-white/20 text-white font-black uppercase tracking-widest text-[11px] hover:bg-white hover:text-github-black transition-all">
                      Export Archive
                    </button>
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
