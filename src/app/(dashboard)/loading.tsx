import { PageLoader } from "@/components/ui/loading";

export default function DashboardLoading() {
  return <PageLoader message="Loading your dashboard..." fullScreen={false} />;
}
