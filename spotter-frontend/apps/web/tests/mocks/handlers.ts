import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];

// Not registered by default — opt in with `server.use(...)` inside a test
// to exercise an error response from the same endpoint.
export const errorHandlers = {
  health: http.get('/api/health', () => {
    return HttpResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
  }),
};
