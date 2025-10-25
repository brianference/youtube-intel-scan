import { StatsCard } from "../StatsCard";
import { Video, CheckCircle2, Clock } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatsCard title="Total Videos" value={156} icon={Video} description="Across 5 channels" />
      <StatsCard title="Analyzed" value={89} icon={CheckCircle2} description="57%" />
      <StatsCard title="Pending" value={67} icon={Clock} description="43%" />
    </div>
  );
}
