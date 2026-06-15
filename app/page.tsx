import { Dashboard } from "@/components/Dashboard";
import disasters from "@/data/disasters.json";
import type { DisasterRecord } from "@/lib/types";

export default function Home() {
  const records = disasters as DisasterRecord[];

  return (
    <main className="min-h-full bg-slate-50">
      <Dashboard records={records} />
    </main>
  );
}
