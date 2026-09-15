import client from '../api/client';
import { authApi } from '../api/auth';
import { competencyApi } from '../api/competencies';
import { recommendationApi } from '../api/recommendations';
import { learningApi } from '../api/learning';
import { contentApi } from '../api/content';
import { quizApi } from '../api/quizzes';
import { assessmentApi } from '../api/assessments';
import { chatApi } from '../api/chat';
import { analyticsApi } from '../api/analytics';
import { learningSourcesApi } from '../api/learningSources';
import { voiceApi } from '../api/voice';

export {
  client,
  authApi,
  competencyApi,
  recommendationApi,
  learningApi,
  contentApi,
  quizApi,
  assessmentApi,
  chatApi,
  analyticsApi,
  learningSourcesApi,
  voiceApi
};


export const documentApi = contentApi;
export const resourceApi = {
  getAll: (filters) => client.get('/resources', { params: filters }),
};

export const progressApi = {
  getSummary: () => client.get('/assessments/progress/summary'),
  getHistory: () => client.get('/learning/history'),
};

export const finalInterviewApi = {
  getReadiness: () => client.get('/assessments/final-interview/readiness'),
  generateQuestions: () => client.post('/assessments/final-interview/questions', {}),
  evaluateAnswer: (data) => client.post('/assessments/final-interview/evaluate-answer', data),
  generateReport: (data) => client.post('/assessments/final-interview/generate-report', data),
};

export const adminApi = {
  getStats: () => analyticsApi.getOverview(),
  getOverview: analyticsApi.getOverview,
  getCompetencies: analyticsApi.getCompetencies,
  getDepartments: analyticsApi.getDepartments,
  getTrainingEffectiveness: analyticsApi.getTrainingEffectiveness,
  getSkillGaps: analyticsApi.getSkillGaps,
  getEmergingSkills: analyticsApi.getEmergingSkills,
  getCapacityForecast: analyticsApi.getCapacityForecast,
  refreshSource: learningSourcesApi.refreshSource,
  getSourceStatus: learningSourcesApi.getSourceStatus,
};

export default client;
