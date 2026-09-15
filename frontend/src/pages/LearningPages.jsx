import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { recommendationApi, resourceApi, learningApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ResourceCard } from '../components/UIComponents';
import { 
  Compass, 
  Sparkles, 
  BookOpen, 
  Layers, 
  ArrowRight, 
  Building2, 
  Search, 
  CheckCircle2, 
  Circle, 
  Clock, 
  RefreshCw,
  Award,
  BrainCircuit,
  TrendingUp,
  FileCheck
} from 'lucide-react';

/* ==========================================================================
   1. RecommendationsPage Component
   ========================================================================== */
export const RecommendationsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await recommendationApi.getForYou();
        setData(res.data);
      } catch (err) {
        console.error("Error loading recommendations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-[#78716C] text-xs font-mono">
        Matching NSSTA and MoSPI resources to your competency gaps...
      </div>
    );
  }

  const recommendations = data?.recommendations || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg p-5 border border-[#E7E5E4] shadow-2xs border-t-4 border-t-[#991B1B] space-y-1">
        <h1 className="text-xl font-bold text-[#1C1917]">
          Personalized Training Recommendations
        </h1>
        <p className="text-xs text-[#78716C]">
          Targeting focus gap in <strong className="text-[#991B1B]">{data?.primary_focus_gap}</strong> ({data?.gap_percentage}% gap).
        </p>
      </div>

      {data?.ai_curation_note && (
        <div className="bg-white rounded-lg border border-[#E7E5E4] p-4 shadow-2xs text-xs space-y-1">
          <h2 className="font-bold text-[#1C1917] uppercase text-[11px] font-mono">
            Recommendation Guidance
          </h2>
          <p className="text-[#1C1917] leading-relaxed bg-[#FAFAF9] p-3 rounded border border-[#E7E5E4]">
            {data.ai_curation_note}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#1C1917]">
          Recommended Training Modules ({recommendations.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((item, idx) => (
            <ResourceCard
              key={idx}
              resource={item.resource}
              relevanceReason={item.relevance_reason}
              matchScore={item.match_score}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   2. LearningPathPage Component
   ========================================================================== */
export const LearningPathPage = () => {
  const [loading, setLoading] = useState(true);
  const [learningPathData, setLearningPathData] = useState(null);
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    fetchLearningPath();
  }, []);

  const fetchLearningPath = async () => {
    setLoading(true);
    try {
      const res = await recommendationApi.getLearningPath();
      setLearningPathData(res.data);
      if (res.data && res.data.milestones) {
        setMilestones(res.data.milestones);
      }
    } catch (err) {
      console.error("Failed to load dynamic learning path:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (idx) => {
    const target = milestones[idx];
    const newCompleted = !target.completed;
    setMilestones((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, completed: newCompleted } : m))
    );
    if (newCompleted && (target.resource_id || target.id)) {
      try {
        const resId = target.resource_id || target.id;
        await learningApi.completeResource(resId);
      } catch (err) {
        console.error("Failed to persist resource completion:", err);
      }
    }
  };

  const completedCount = milestones.filter((m) => m.completed).length;
  const progressPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] border-t-4 border-t-[#991B1B] p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-[#1C1917]">
            Statistical Learning Path
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="/final-interview"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#991B1B] text-white text-xs font-bold hover:bg-[#7F1D1D] shadow-2xs"
            >
              <span>Final Interview</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FEF3C7]" />
            </Link>
            <button
              onClick={fetchLearningPath}
              className="inline-flex items-center gap-1 text-xs text-[#78716C] bg-stone-100 px-2.5 py-1 rounded hover:bg-stone-200"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <span className="text-xs font-bold bg-[#FEF3C7] text-[#1C1917] px-2.5 py-1 rounded border border-[#D97706] font-mono">
              {progressPct}% Completed
            </span>
          </div>
        </div>

        {learningPathData && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-[#FEF3C7] text-[#1C1917] px-2 py-0.5 rounded border border-[#D97706] font-mono">
              {learningPathData.division}
            </span>
            <span className="bg-[#FEF3C7] text-[#1C1917] px-2 py-0.5 rounded border border-[#D97706] font-mono">
              {learningPathData.designation}
            </span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-[#E7E5E4]">
          <div
            className="bg-[#991B1B] h-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Milestones List */}
      <div className="space-y-3">
        {milestones.map((m, idx) => {
          const isInterview = m.action_type === 'interview' || (m.action_link && m.action_link.includes('final-interview'));

          return (
            <div
              key={idx}
              className={`rounded-lg border p-4 transition flex flex-col sm:flex-row items-start justify-between gap-3 text-xs ${
                m.completed
                  ? 'bg-[#FEF3C7]/40 border-[#D97706] border-l-4 border-l-[#D97706]'
                  : 'bg-white border-[#E7E5E4] border-l-4 border-l-[#991B1B] shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleComplete(idx)}
                  className="mt-0.5 flex-shrink-0 text-[#78716C] hover:text-[#991B1B] transition"
                >
                  {m.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[#991B1B]" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#1C1917] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#D97706] font-mono">
                    {m.domain}
                  </span>
                  <h3 className={`font-bold ${m.completed ? 'text-[#78716C] line-through' : 'text-[#1C1917]'}`}>
                    {m.title}
                  </h3>
                  <p className="text-[#78716C] leading-relaxed">
                    {m.description || m.desc}
                  </p>
                </div>
              </div>

              <Link
                to={m.action_link || m.link || '/hub'}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#991B1B] text-white text-xs font-bold hover:bg-[#7F1D1D] transition shadow-2xs"
              >
                <span>{isInterview ? 'Final Interview' : (m.completed ? 'Review' : 'Start')}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FEF3C7]" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ==========================================================================
   3. GovernmentHubPage Component
   ========================================================================== */
export const GovernmentHubPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        let sourceFilter = undefined;
        if (activeTab === 'nssta') sourceFilter = 'NSSTA';
        if (activeTab === 'mospi') sourceFilter = 'MoSPI';
        if (activeTab === 'igot') sourceFilter = 'iGOT_Karmayogi';

        const res = await resourceApi.getAll({ source: sourceFilter });
        setResources(res.data);
      } catch (err) {
        console.error("Error loading resources:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [activeTab]);

  const filtered = (resources || []).filter((r) => {
    const titleMatch = r.title ? r.title.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const descMatch = r.description ? r.description.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    return titleMatch || descMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg p-5 border border-[#E7E5E4] shadow-2xs border-t-4 border-t-[#991B1B] space-y-1">
        <h1 className="text-xl font-bold text-[#1C1917]">
          Government Learning Hub: iGOT, NSSTA & MoSPI
        </h1>
        <p className="text-xs text-[#78716C]">
          Access verified academy modules, survey manuals, eSankhyiki data assets, and iGOT Karmayogi courses.
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="flex gap-1 bg-[#FAFAF9] p-1 rounded border border-[#E7E5E4] overflow-x-auto font-mono">
          {[
            { key: 'all', label: 'All Resources' },
            { key: 'nssta', label: 'NSSTA Academy' },
            { key: 'mospi', label: 'MoSPI Manuals' },
            { key: 'igot', label: 'iGOT Karmayogi' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                setSearchParams(t.key === 'all' ? {} : { tab: t.key });
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition ${
                activeTab === t.key
                  ? 'bg-[#991B1B] text-white font-semibold'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#78716C] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E7E5E4] rounded focus:border-[#991B1B] outline-none text-[#1C1917]"
          />
        </div>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="py-16 text-center text-[#78716C] text-xs font-mono">
          Loading verified resources...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((res) => (
            <ResourceCard key={res.id} resource={res} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E7E5E4] p-10 text-center text-[#78716C] text-xs">
          No resources found matching search query.
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   4. OnboardingPage Component (Option 3 Academic Theme)
   ========================================================================== */
export const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 text-xs">
      
      {/* 1. WELCOME SECTION */}
      <div className="bg-white rounded-lg p-6 border border-[#E7E5E4] border-t-4 border-t-[#991B1B] shadow-2xs space-y-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-3xl font-extrabold text-[#1C1917] tracking-tight">
            Welcome, {user?.full_name || 'Officer'}!
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="bg-[#FEF3C7] text-[#1C1917] border border-[#D97706] font-bold px-2.5 py-0.5 rounded text-[11px] font-mono">
              {user?.designation || 'Statistical Cadre'}
            </span>
            <span className="text-[#78716C] text-xs">•</span>
            <span className="bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] font-bold px-2.5 py-0.5 rounded text-[11px] font-mono">
              {user?.department || 'MoSPI Division'}
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed border-t border-[#E7E5E4] pt-3">
          Let's begin by understanding your current competency level and identifying areas for development.
        </p>
      </div>

      {/* 2. CAPACITY BUILDING JOURNEY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#1C1917]">
            YOUR CAPACITY BUILDING JOURNEY
          </h2>
          <span className="text-[11px] text-[#78716C] font-mono">3 Structured Stages</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          
          {/* STAGE 1 */}
          <div className="bg-white rounded-lg border border-[#E7E5E4] border-t-4 border-t-[#D97706] p-5 shadow-2xs space-y-2 flex flex-col justify-between relative">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded bg-[#FEF3C7] text-[#1C1917] font-bold text-xs flex items-center justify-center border border-[#D97706] font-mono">
                  ①
                </span>
                <span className="text-[10px] font-bold uppercase text-[#1C1917] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#D97706] font-mono">
                  Step 1
                </span>
              </div>
              <h3 className="font-bold text-[#1C1917] text-sm">Baseline Assessment</h3>
              <p className="text-[#78716C] leading-relaxed text-xs">
                Understand your current competency level through a structured assessment.
              </p>
            </div>
            
            <div className="hidden md:flex justify-end pt-2">
              <ArrowRight className="w-4 h-4 text-[#D97706]" />
            </div>
          </div>

          {/* STAGE 2 */}
          <div className="bg-white rounded-lg border border-[#E7E5E4] border-t-4 border-t-[#991B1B] p-5 shadow-2xs space-y-2 flex flex-col justify-between relative">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded bg-[#FEE2E2] text-[#991B1B] font-bold text-xs flex items-center justify-center border border-[#FCA5A5] font-mono">
                  ②
                </span>
                <span className="text-[10px] font-bold uppercase text-[#991B1B] bg-[#FEE2E2] px-2 py-0.5 rounded border border-[#FCA5A5] font-mono">
                  Step 2
                </span>
              </div>
              <h3 className="font-bold text-[#1C1917] text-sm">Gap Analysis</h3>
              <p className="text-[#78716C] leading-relaxed text-xs">
                Identify competency gaps and areas that require development.
              </p>
            </div>

            <div className="hidden md:flex justify-end pt-2">
              <ArrowRight className="w-4 h-4 text-[#991B1B]" />
            </div>
          </div>

          {/* STAGE 3 */}
          <div className="bg-white rounded-lg border border-[#E7E5E4] border-t-4 border-t-stone-500 p-5 shadow-2xs space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded bg-stone-100 text-[#1C1917] font-bold text-xs flex items-center justify-center border border-[#E7E5E4] font-mono">
                  ③
                </span>
                <span className="text-[10px] font-bold uppercase text-[#1C1917] bg-stone-100 px-2 py-0.5 rounded border border-[#E7E5E4] font-mono">
                  Step 3
                </span>
              </div>
              <h3 className="font-bold text-[#1C1917] text-sm">Training & Quizzes</h3>
              <p className="text-[#78716C] leading-relaxed text-xs">
                Follow recommended learning modules and validate your progress.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. BASELINE ASSESSMENT CTA SECTION */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <h3 className="text-sm sm:text-base font-bold text-[#1C1917]">
            Ready to begin your Baseline Assessment?
          </h3>
          <p className="text-[#78716C] leading-relaxed text-xs">
            Complete a short assessment to establish your current competency baseline. This usually takes around 8–10 minutes.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/assessment')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold rounded shadow-2xs transition"
          >
            <span>Start Baseline Assessment</span>
            <ArrowRight className="w-4 h-4 text-[#FEF3C7]" />
          </button>
        </div>
      </div>

      {/* 4. WHAT HAPPENS NEXT? SECTION */}
      <div className="bg-white rounded-lg border border-[#E7E5E4] p-6 shadow-2xs space-y-4">
        <div className="border-b border-[#E7E5E4] pb-2">
          <h3 className="text-sm font-bold text-[#1C1917]">What happens next?</h3>
          <p className="text-xs text-[#78716C]">How your baseline responses shape your personalized capacity building.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] space-y-1">
            <div className="w-6 h-6 rounded bg-[#FEF3C7] text-[#1C1917] font-bold text-[11px] flex items-center justify-center mb-1 border border-[#D97706] font-mono">
              A
            </div>
            <h4 className="font-bold text-xs text-[#1C1917]">Assessment</h4>
            <p className="text-[11px] text-[#78716C] leading-relaxed">
              Complete questions based on your cadre and role across 9 core statistical domains.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] space-y-1">
            <div className="w-6 h-6 rounded bg-[#FEE2E2] text-[#991B1B] font-bold text-[11px] flex items-center justify-center mb-1 border border-[#FCA5A5] font-mono">
              B
            </div>
            <h4 className="font-bold text-xs text-[#1C1917]">Analysis</h4>
            <p className="text-[11px] text-[#78716C] leading-relaxed">
              Your responses are used to identify competency gaps against required target benchmarks.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] space-y-1">
            <div className="w-6 h-6 rounded bg-stone-100 text-[#1C1917] font-bold text-[11px] flex items-center justify-center mb-1 border border-[#E7E5E4] font-mono">
              C
            </div>
            <h4 className="font-bold text-xs text-[#1C1917]">Recommendations</h4>
            <p className="text-[11px] text-[#78716C] leading-relaxed">
              Receive relevant learning and training recommendations matched directly to your gaps.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
