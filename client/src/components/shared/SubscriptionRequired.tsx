import { Navigate, Outlet } from 'react-router-dom';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export default function SubscriptionRequired() {
  const hasActiveSub = useSubscriptionStore((s) => s.hasActiveSub);

  if (hasActiveSub === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin rogym-sx-87386abd"
          
        />
      </div>
    );
  }

  if (hasActiveSub === false) {
    return <Navigate to="/member/subscription/setup" replace />;
  }

  return <Outlet />;
}
