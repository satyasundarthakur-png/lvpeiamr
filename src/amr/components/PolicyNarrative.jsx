import React, { useState } from "react";
import { Sparkles, Loader2, Settings } from "lucide-react";
import { generatePolicyNarrative, PROVIDERS } from "../lib/aiClient.js";

export default function PolicyNarrative({ antibiogram, flags, remedies, meta, provider, setProvider, apiKey, setApiKey, onNarrativeChange }) {
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(!apiKey);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generatePolicyNarrative({ provider, apiKey, antibiogram, flags, remedies, meta });
      setNarrative(result);
      onNarrativeChange?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const providerInfo = PROVIDERS[provider];

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand" />
          <h3 className="font-semibold text-ink">AI policy summary</h3>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="text-ink/45 hover:text-ink/70"
          title="AI settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {showSettings && (
        <div className="mb-4 p-3 rounded-xl border border-brand/20 bg-brand/6">
          <label className="block text-xs font-semibold text-ink/70 mb-1">AI provider</label>
          <div className="flex items-center gap-2 mb-3">
            {Object.entries(PROVIDERS).map(([id, info]) => (
              <button
                key={id}
                onClick={() => setProvider(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  provider === id ? "bg-brand/15 text-brand" : "text-ink/50 hover:text-ink/70 hover:bg-ink/5"
                }`}
              >
                {info.label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-ink/70 mb-1">{providerInfo.label} API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={providerInfo.keyPlaceholder}
            className="w-full text-sm rounded-lg border border-ink/15 bg-background px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand/45"
          />
          <p className="text-xs text-ink/45 mt-1">
            {providerInfo.keyHint}. Stored only in this browser session, separately per provider — switching providers
            doesn't lose the other key. For production, move this call server-side (e.g. a Supabase Edge Function) so
            the key isn't exposed in the client bundle.
          </p>
        </div>
      )}

      <p className="text-sm text-ink/60 mb-3">
        Generates a plain-language surveillance summary and empiric policy recommendation from the antibiogram and
        flagged patterns above, grounded strictly in your uploaded data.
      </p>

      <button
        onClick={handleGenerate}
        disabled={loading || !apiKey || antibiogram.length === 0}
        className="flex items-center gap-2 px-4 py-2 btn-brand text-sm rounded-xl font-medium disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? "Analyzing…" : `Generate summary (${providerInfo.label})`}
      </button>
      {!apiKey && antibiogram.length > 0 && (
        <p className="text-xs text-ink/45 mt-2">Add an API key above to enable this.</p>
      )}
      {apiKey && antibiogram.length === 0 && (
        <p className="text-xs text-warn mt-2">
          No antibiogram data available — this isn't an API key or provider issue. Your uploaded file has no
          recognized organism/antimicrobial/susceptibility-result data (see the warning above if one appeared
          after upload).
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-danger bg-danger/8 rounded-md p-3">{error}</p>
      )}

      {narrative && (
        <div className="mt-4 p-4 border border-brand/25 bg-brand/8 rounded-md text-sm text-ink whitespace-pre-wrap leading-relaxed">
          {narrative}
        </div>
      )}
    </div>
  );
}
