import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import Home from '../pages/Home';
import NotFound from '../pages/NotFound';
import Subscriptions from '../pages/Subscriptions';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'subscriptions', element: <Subscriptions /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
