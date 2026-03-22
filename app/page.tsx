import { HomeSidebar } from "@/components/layout/HomeSidebar";
import { ProblemGrid } from "@/components/layout/ProblemGrid";

export default function HomePage() {
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <HomeSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <ProblemGrid />
      </main>
    </div>
  );
}
