import { createBrowserRouter } from "react-router-dom";
import { Login } from './components/Login';
import { SignUp } from './components/SignUp';
import { Dashboard } from './components/Dashboard';

function RouteError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-3">Page Error</h1>
        <p className="text-gray-500 text-sm mb-6">Something went wrong loading this page. This is usually caused by a missing API call or network issue.</p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#2B5EA6]/90"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <RouteError />,
  },
  {
    path: "/signup",
    element: <SignUp />,
    errorElement: <RouteError />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
    errorElement: <RouteError />,
  },
]);
