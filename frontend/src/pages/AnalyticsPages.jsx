import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { competencyApi, progressApi } from '../services/api';
import { GapCard, RadarChartComp } from '../components/UIComponents';
import { 
  BarChart3, 
  BrainCircuit, 
  TrendingUp, 
  Award, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/* ==========================================================================
   1. CompetenciesPage / CompetencyMatrixPage Component
   ========================================================================== */
export const CompetenciesPage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('All');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await competencyApi.getProfile();
        setProfile(res.data);
      } catch (err) {
        console.error("Competency Matrix error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-[#78716C] text-xs font-mono">
        Loading MoSPI Competency Framework Matrix...
      </div>
    );
  }

  const competencies = profile?.competencies || [];

  const domains = ['All', ...new Set(competencies.map((c) => c.domain))];

  const filtered = competencies.filter((c) => {
    const matchesDomain = domainFilter === 'All' || c.domain === domainFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg p-5 border border-[#E7E5E4] shadow-2xs border-t-4 border-t-[#991B1B] space-y-1">
        <h1 className="text-xl font-bold text-[#1C1917]">
          MoSPI Competency Framework Matrix
        </h1>
        <p className="text-xs text-[#78716C]">
          Mapped against official Indian Statistical Service (ISS) and Subordinate Statistical Service (SSS) benchmarks.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="flex gap-1 overflow-x-auto bg-[#FAFAF9] p-1 rounded border border-[#E7E5E4]">
          {domains.map((d) => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition ${
                domainFilter === d
                  ? 'bg-[#991B1B] text-white font-semibold'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#78716C] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search competencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E7E5E4] rounded focus:border-[#991B1B] outline-none text-[#1C1917]"
          />
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white rounded-lg border border-[#E7E5E4] shadow-2xs overflow-hidden text-xs">
          <div className="px-4 py-3 border-b border-[#E7E5E4] bg-[#FAFAF9] font-bold text-[#1C1917] flex justify-between font-mono">
            <span>Competency Name & Domain</span>
            <span>Current / Target Benchmark</span>
          </div>

          <div className="divide-y divide-[#E7E5E4]">
            {filtered.map((comp) => {
              const gap = comp.required_level - comp.current_level;
              const isMet = gap <= 0;

              return (
                <div key={comp.code} className="p-4 space-y-2 hover:bg-[#FAFAF9] transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#1C1917] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#D97706] font-mono">
                        {comp.domain}
                      </span>
                      <h3 className="font-bold text-[#1C1917] text-sm mt-1">{comp.name}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-right sm:text-right font-mono">
                      <div>
                        <span className="text-[10px] text-[#78716C]">CURRENT</span>
                        <p className="font-bold text-[#1C1917]">{comp.current_level}%</p>
                      </div>
                      <div className="text-[#E7E5E4]">/</div>
                      <div>
                        <span className="text-[10px] text-[#78716C]">TARGET</span>
                        <p className="font-bold text-[#991B1B]">{comp.required_level}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden border border-[#E7E5E4]">
                      <div
                        className={`h-full ${isMet ? 'bg-emerald-600' : 'bg-[#991B1B]'}`}
                        style={{ width: `${Math.min(100, comp.current_level)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#78716C]">{comp.description}</span>
                      {isMet ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Met
                        </span>
                      ) : (
                        <span className="text-[#991B1B] font-bold">Gap: {gap}%</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-lg border border-[#E7E5E4] p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#1C1917]">Radar Distribution</h2>
          <RadarChartComp competencies={competencies} />
        </div>
      </div>
    </div>
  );
};

export const CompetencyMatrixPage = CompetenciesPage;

/* ==========================================================================
   2. GapAnalysisPage Component
   ========================================================================== */
export const GapAnalysisPage = () => {
  const [gapData, setGapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGapAnalysis = async () => {
      try {
        const res = await competencyApi.getGapAnalysis();
        setGapData(res.data);
      } catch (err) {
        console.error("Gap Analysis error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGapAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-[#78716C] text-xs font-mono">
        Calculating competency gaps and recommended focus areas...
      </div>
    );
  }

  const gaps = gapData?.gaps || [];
  const focusDomain = gapData?.primary_focus_domain || 'Official Statistics';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg p-5 border border-[#E7E5E4] shadow-2xs border-t-4 border-t-[#991B1B] space-y-1">
        <h1 className="text-xl font-bold text-[#1C1917]">
          Competency Gap Diagnosis & AI Action Plan
        </h1>
        <p className="text-xs text-[#78716C]">
          Identified {gapData?.total_gaps_count} focus areas needing development. Primary focus: <strong className="text-[#991B1B]">{focusDomain}</strong>.
        </p>
      </div>

      {gapData?.ai_analysis_summary && (
        <div className="bg-white rounded-lg border border-[#E7E5E4] p-5 shadow-2xs space-y-2 text-xs">
          <h2 className="font-bold text-[#1C1917] uppercase text-[11px] font-mono">
            AI Executive Gap Summary
          </h2>
          <p className="text-[#1C1917] leading-relaxed bg-[#FAFAF9] p-3 rounded border border-[#E7E5E4]">
            {gapData.ai_analysis_summary}
          </p>
        </div>
      )}

      {/* Grid of Gaps */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#1C1917]">
          Detailed Competency Gaps ({gaps.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gaps.map((g) => (
            <GapCard key={g.competency_id} gapItem={g} />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   3. ProgressPage Component
   ========================================================================== */
export const ProgressPage = () => {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        const [sumRes, histRes] = await Promise.all([
          progressApi.getSummary(),
          progressApi.getHistory()
        ]);
        const sumData = sumRes.data;
        const histList = Array.isArray(histRes.data) && histRes.data.length > 0 
          ? histRes.data 
          : (sumData?.recent_events || sumData?.progress_events || []);
        setSummary(sumData);
        setHistory(histList);
      } catch (err) {
        console.error("Progress fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgressData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-[#78716C] text-xs font-mono">
        Loading verified progress telemetry...
      </div>
    );
  }

  const competencyList = summary?.competency_breakdown || summary?.competency_progress || [];
  const chartData = competencyList.map((c) => {
    const nameStr = c.name || c.competency_name || '';
    return {
      name: nameStr.length > 15 ? nameStr.substring(0, 13) + '...' : nameStr,
      Initial: c.initial_score ?? c.baseline_score ?? 0,
      Current: c.current_score ?? 0,
      Target: c.required_benchmark ?? c.target_score ?? 100,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg p-5 border border-[#E7E5E4] shadow-2xs border-t-4 border-t-[#991B1B] space-y-1">
        <h1 className="text-xl font-bold text-[#1C1917]">
          Learning Progress & Verification Log
        </h1>
        <p className="text-xs text-[#78716C]">
          Quantified capacity growth across verified assessments and quizzes.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-[#E7E5E4] border-t-4 border-t-[#991B1B] p-4 shadow-2xs space-y-1">
          <span className="text-xs text-[#78716C] font-medium font-mono">Verified Learning Gain</span>
          <p className="text-2xl font-bold text-[#991B1B]">+{summary?.total_learning_gain || 0}%</p>
          <span className="text-[10px] text-[#78716C]">Total Score Improvement</span>
        </div>

        <div className="bg-white rounded-lg border border-[#E7E5E4] border-t-4 border-t-[#D97706] p-4 shadow-2xs space-y-1">
          <span className="text-xs text-[#78716C] font-medium font-mono">Quizzes Completed</span>
          <p className="text-2xl font-bold text-[#1C1917]">{summary?.quizzes_completed ?? summary?.quizzes_taken ?? 0}</p>
          <span className="text-[10px] text-[#78716C]">Evaluated Assessments</span>
        </div>

        <div className="bg-white rounded-lg border border-[#E7E5E4] border-t-4 border-t-[#FCA5A5] p-4 shadow-2xs space-y-1">
          <span className="text-xs text-[#78716C] font-medium font-mono">Average Quiz Score</span>
          <p className="text-2xl font-bold text-[#1C1917]">{summary?.average_quiz_score || 0}%</p>
          <span className="text-[10px] text-[#78716C]">Evaluation Accuracy</span>
        </div>

        <div className="bg-white rounded-lg border border-[#E7E5E4] border-t-4 border-t-[#991B1B] p-4 shadow-2xs space-y-1">
          <span className="text-xs text-[#78716C] font-medium font-mono">Framework Readiness</span>
          <p className="text-2xl font-bold text-[#1C1917]">{summary?.overall_readiness_score || 0}%</p>
          <span className="text-[10px] text-[#78716C]">Current Readiness Index</span>
        </div>
      </div>

      {/* Chart: Baseline vs Current Progress */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] p-5 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-[#1C1917]">
          Pre vs. Post Learning Progression
        </h2>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716C' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#78716C' }} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E7E5E4', fontSize: '11px', color: '#1C1917' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Initial" fill="#E7E5E4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Current" fill="#991B1B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Target" fill="#D97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] shadow-2xs overflow-hidden text-xs">
        <div className="px-5 py-3 border-b border-[#E7E5E4] bg-[#FAFAF9] font-bold text-[#1C1917] font-mono">
          Evaluation History Log ({history.length})
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-[#E7E5E4]">
            {history.map((h, idx) => {
              const compTitle = h.competency_name || h.quiz_title || 'Competency Progress';
              const eventType = h.event_type || h.competency_code || 'EVALUATION';
              const displayScore = h.new_score !== undefined ? h.new_score : (h.score !== undefined ? h.score : 0);
              const gainAmount = h.delta !== undefined ? h.delta : (h.score_increase !== undefined ? h.score_increase : 0);

              return (
                <div key={idx} className="p-4 flex items-center justify-between gap-3 hover:bg-[#FAFAF9]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1C1917]">{compTitle}</span>
                      <span className="bg-[#FEF3C7] text-[#1C1917] px-2 py-0.5 rounded text-[10px] border border-[#D97706] font-mono font-bold uppercase">
                        {eventType}
                      </span>
                    </div>
                    <p className="text-[#78716C] text-[11px]">
                      {h.created_at ? `Recorded on ${new Date(h.created_at).toLocaleDateString()}` : 'Recorded session'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-[#991B1B]">{displayScore}%</span>
                    {gainAmount > 0 && (
                      <p className="text-[10px] text-[#991B1B] font-bold">+{gainAmount}% Gain</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-[#78716C]">
            No quiz evaluations completed yet. Take a quiz from AI Studio to log progress!
          </div>
        )}
      </div>
    </div>
  );
};
