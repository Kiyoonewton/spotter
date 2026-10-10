import { renderToString } from 'react-dom/server';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { getRouter } from '../../src/router';

describe('App', () => {
  it('renders the dispatch workspace', async () => {
    const router = getRouter();
    router.update({ history: createMemoryHistory({ initialEntries: ['/'] }) });
    await router.load();

    const html = renderToString(<RouterProvider router={router} />);
    expect(html).toContain('Weather-aware routing');
    expect(html).toContain('Deterministic demo analysis');
    expect(html).not.toContain('Route B recommended');
  });
});
