import client from './client';

export const learningApi = {
  startResource: (resourceId) => client.post(`/learning/resources/${resourceId}/start`),
  updateProgress: (resourceId, progressPercentage, timeSpentMins = 0) =>
    client.post(`/learning/resources/${resourceId}/progress`, {
      progress_percentage: progressPercentage,
      time_spent_mins: timeSpentMins,
    }),
  completeResource: (resourceId) => client.post(`/learning/resources/${resourceId}/complete`),
  getMyPath: () => client.get('/learning/my-path'),
  getProgressSummary: () => client.get('/assessments/progress/summary'),
  getProgressHistory: () => client.get('/learning/history'),
};

export default learningApi;
