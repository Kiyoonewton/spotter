import { RouterProvider } from '@tanstack/react-router';
import { getRouter } from './router';

const router = getRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return <RouterProvider router={router} />;
}

export default App;
