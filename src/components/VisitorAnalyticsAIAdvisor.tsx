import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Send,
  Copy,
  Check,
  Globe,
  Clock,
  Search,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VisitorAnalyticsSummary } from '../types';

interface VisitorAnalyticsAIAdvisorProps {
  summary: VisitorAnalyticsSummary | null;
  timeframe: string;
  isDark: boolean;
}

export const VisitorAnalyticsAIAdvisor: React.FC<VisitorAnalyticsAIAdvisorProps> = ({
  summary,
  timeframe,
  isDark
}) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activePreset, setActivePreset] = useState<string>('overview');

  const handleGenerateInsights = async (focus: string = 'overview', customQ?: string) => {
    setLoading(true);
    setError(null);
    setActivePreset(customQ ? 'custom' : focus);

    try {
      const res = await fetch('/api/analytics/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          timeframe,
          focus,
          customQuestion: customQ || (customPrompt.trim() ? customPrompt.trim() : undefined),
          language
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to generate AI insights: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.insights) {
        setInsights(data.insights);
        setGeneratedAt(data.generatedAt || new Date().toISOString());
        setModelUsed(data.model || 'Gemini 3.7 Flash');
        if (customQ) setCustomPrompt('');
      } else {
        throw new Error(data.error || 'No insights returned from AI model.');
      }
    } catch (err: any) {
      console.error('AI Insights Error:', err);
      setError(err.message || 'Could not connect to AI advisor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!insights) return;
    navigator.clipboard.writeText(insights);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render markdown-like text cleanly with headers and bullet styling
  const renderFormattedInsights = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-3 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Header level 3
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className={`text-base font-bold pt-3 pb-1 border-b ${
                isDark ? 'text-blue-400 border-slate-800' : 'text-blue-700 border-slate-200'
              }`}>
                {trimmed.replace('### ', '')}
              </h4>
            );
          }

          // Header level 2 or 1
          if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            return (
              <h3 key={idx} className={`text-lg font-bold pt-4 pb-1.5 border-b ${
                isDark ? 'text-white border-slate-700' : 'text-slate-900 border-slate-200'
              }`}>
                {trimmed.replace(/^#+\s*/, '')}
              </h3>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'} dangerouslySetInnerHTML={{
                  __html: formatBoldSpans(content)
                }} />
              </div>
            );
          }

          // Numbered items (1. 2. 3.)
          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+\.)\s*(.*)$/);
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1.5">
                <span className="font-bold text-blue-500 shrink-0 text-xs mt-0.5">{match ? match[1] : '•'}</span>
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'} dangerouslySetInnerHTML={{
                  __html: formatBoldSpans(match ? match[2] : trimmed)
                }} />
              </div>
            );
          }

          return (
            <p key={idx} className={isDark ? 'text-slate-300' : 'text-slate-700'} dangerouslySetInnerHTML={{
              __html: formatBoldSpans(trimmed)
            }} />
          );
        })}
      </div>
    );
  };

  const formatBoldSpans = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  };

  return (
    <div className={`rounded-2xl border shadow-sm transition-all overflow-hidden ${
      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
    }`}>
      {/* Header Banner */}
      <div className={`p-5 sm:p-6 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
        isDark ? 'bg-gradient-to-r from-slate-950/80 to-blue-950/30 border-slate-800' : 'bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border-slate-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
            isDark ? 'bg-blue-600 text-white shadow-blue-900/40' : 'bg-blue-600 text-white shadow-blue-200'
          }`}>
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Orbi AI Visitor Intelligence Advisor
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isDark ? 'bg-blue-950 text-blue-400 border border-blue-800/60' : 'bg-blue-100 text-blue-700'
              }`}>
                {modelUsed || 'Gemini 3.7 Flash'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Executive AI synthesis of shopper traffic, demand search queries, and conversion bottlenecks.
            </p>
          </div>
        </div>

        {/* Top Controls: Language & Toggle */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Language Switcher */}
          <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                language === 'en'
                  ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('sw')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                language === 'sw'
                  ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Kiswahili
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-5">
          {/* Quick AI Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider mr-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              AI Focus:
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleGenerateInsights('overview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activePreset === 'overview' && insights
                  ? (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-blue-600 text-white border-blue-600 shadow-xs')
                  : (isDark ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700')
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Full Executive Intelligence
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleGenerateInsights('timing')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activePreset === 'timing'
                  ? (isDark ? 'bg-amber-600 text-white border-amber-500 shadow-xs' : 'bg-amber-600 text-white border-amber-600 shadow-xs')
                  : (isDark ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700')
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Peak Traffic & Promo Timing (EAT)
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleGenerateInsights('search_demand')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activePreset === 'search_demand'
                  ? (isDark ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs' : 'bg-indigo-600 text-white border-indigo-600 shadow-xs')
                  : (isDark ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700')
              }`}
            >
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              Search Demand & Missing Stock
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleGenerateInsights('funnel')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activePreset === 'funnel'
                  ? (isDark ? 'bg-purple-600 text-white border-purple-500 shadow-xs' : 'bg-purple-600 text-white border-purple-600 shadow-xs')
                  : (isDark ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700')
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-purple-400" />
              Funnel Drop-offs & Cart Recovery
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleGenerateInsights('promotions')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                activePreset === 'promotions'
                  ? (isDark ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs' : 'bg-emerald-600 text-white border-emerald-600 shadow-xs')
                  : (isDark ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700')
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp & Flash Offers
            </button>
          </div>

          {/* Custom Question Prompt Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customPrompt.trim()) {
                handleGenerateInsights('custom', customPrompt.trim());
              }
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={
                  language === 'sw'
                    ? "Uliza chochote kuhusu tabia za wateja... (mfano: Kwa nini TV zinatafutwa sana wikiendi?)"
                    : "Ask Orbi AI about visitor trends... (e.g. Which products have high views but zero checkout?)"
                }
                disabled={loading}
                className={`w-full text-xs sm:text-sm pl-3.5 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <HelpCircle className="w-4 h-4" />
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !customPrompt.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{loading ? 'Analyzing...' : 'Ask AI'}</span>
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
              isDark ? 'bg-rose-950/40 border-rose-800/80 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Animation */}
          {loading && (
            <div className={`p-8 rounded-2xl border text-center space-y-3 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/30 border-blue-100'
            }`}>
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-600/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Synthesizing Visitor & Search Intent Data...
              </h4>
              <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Cross-referencing {summary?.totalVisits || 0} interaction logs, search queries, peak traffic hours, and checkout funnels.
              </p>
            </div>
          )}

          {/* AI Result Card */}
          {insights && !loading && (
            <div className={`p-5 sm:p-6 rounded-2xl border relative ${
              isDark ? 'bg-slate-950 border-slate-800 shadow-inner' : 'bg-slate-50/80 border-slate-200/90 shadow-inner'
            }`}>
              {/* Card Tools (Copy, Generated Date, Model) */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    AI Analysis Generated {generatedAt ? new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      copied
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateInsights(activePreset)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                    title="Regenerate"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Formatted Insights Body */}
              {renderFormattedInsights(insights)}
            </div>
          )}

          {/* Initial State Prompt if no insights generated yet */}
          {!insights && !loading && (
            <div className={`p-6 rounded-2xl border border-dashed text-center space-y-3 ${
              isDark ? 'border-slate-800 bg-slate-950/30 text-slate-400' : 'border-slate-200 bg-slate-50/50 text-slate-500'
            }`}>
              <Sparkles className="w-8 h-8 mx-auto text-blue-500/80" />
              <div>
                <h4 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Ready to uncover shopper behavior and revenue opportunities?
                </h4>
                <p className="text-xs mt-1 max-w-md mx-auto">
                  Click any focus button above to generate AI-powered insights on peak traffic hours, search queries, and conversion tactics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleGenerateInsights('overview')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Executive Intelligence Now</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
