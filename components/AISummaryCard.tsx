import React, { useState } from 'react';
import { AIAnalysis } from '../types';

interface AISummaryCardProps {
    analysis: AIAnalysis | null;
    loading: boolean;
    onRefresh: () => void;
}

const AISummaryCard: React.FC<AISummaryCardProps> = ({ analysis, loading, onRefresh }) => {
    const [view, setView] = useState<'summary' | 'email'>('summary');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (analysis?.emailDraft) {
            navigator.clipboard.writeText(analysis.emailDraft);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isError = analysis?.summary.startsWith('⚠️');

    return (
        <div className={`rounded-xl shadow-lg p-6 text-white mb-8 relative overflow-hidden transition-all border ${isError ? 'bg-slate-900 border-amber-500/50' : 'bg-gradient-to-br from-indigo-900 to-purple-900 border-transparent'}`}>
            {/* Background decoration */}
            {!isError && <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 mb-6 gap-4">
                <div className="flex items-center gap-3">
                    {isError ? (
                        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    )}
                    <div>
                        <h2 className={`text-xl font-bold tracking-tight ${isError ? 'text-amber-500' : 'text-white'}`}>
                            {isError ? 'Service Notice' : 'AI Insights'}
                        </h2>
                    </div>
                    {/* Toggle View (Hidden on Error) */}
                    {!isError && (
                        <div className="bg-black/20 rounded-lg p-1 flex ml-2 sm:ml-4">
                            <button
                                onClick={() => setView('summary')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${view === 'summary' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:text-white'}`}
                            >
                                Summary
                            </button>
                            <button
                                onClick={() => setView('email')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${view === 'email' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:text-white'}`}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email Draft
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {!isError && view === 'email' && (
                        <button 
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${copied ? 'bg-green-500 border-green-500 text-white' : 'bg-white/10 hover:bg-white/20 border-white/20'}`}
                        >
                            {copied ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Copy Draft
                                </>
                            )}
                        </button>
                    )}
                    <button 
                        onClick={onRefresh}
                        disabled={loading}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border disabled:opacity-50 ${isError ? 'bg-amber-900/30 hover:bg-amber-900/50 border-amber-800 text-amber-200' : 'bg-white/10 hover:bg-white/20 border-white/20'}`}
                    >
                        {loading ? (
                            <svg className={`animate-spin h-4 w-4 ${isError ? 'text-amber-400' : 'text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                        Retry
                    </button>
                </div>
            </div>

            {loading && !analysis ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                </div>
            ) : analysis ? (
                <>
                    {view === 'summary' ? (
                        <div className="grid md:grid-cols-3 gap-6 relative z-10 animate-fade-in">
                            <div className="col-span-1 md:col-span-2">
                                <p className={`text-sm leading-relaxed mb-4 font-light ${isError ? 'text-amber-100/90' : 'text-indigo-100'}`}>
                                    {analysis.summary}
                                </p>
                                {!isError && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-purple-300 mb-2">Recommended Actions</h3>
                                        <ul className="space-y-2">
                                            {analysis.actions && analysis.actions.length > 0 ? (
                                                analysis.actions.map((action, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-white/90">
                                                        <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"></span>
                                                        {action}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-sm text-indigo-300 italic">No specific actions identified.</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            {!isError && (
                                <div className="bg-black/20 rounded-lg p-4 backdrop-blur-sm border border-white/5">
                                    <h3 className="text-xs font-bold uppercase text-red-300 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Top Risks
                                    </h3>
                                    <ul className="space-y-2">
                                        {analysis.topRisks && analysis.topRisks.length > 0 ? (
                                            analysis.topRisks.map((risk, idx) => (
                                                <li key={idx} className="text-sm text-white/80 border-b border-white/5 last:border-0 pb-1">
                                                    {risk}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="text-sm text-indigo-300 italic">No major risks detected.</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-fade-in relative z-10">
                            <div className="bg-white/10 rounded-lg p-4 border border-white/10 font-mono text-sm text-indigo-100 leading-relaxed whitespace-pre-wrap shadow-inner h-64 overflow-y-auto">
                                {analysis.emailDraft}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-indigo-200 text-sm">Click refresh to generate an AI analysis of your projects.</div>
            )}
        </div>
    );
};

export default AISummaryCard;