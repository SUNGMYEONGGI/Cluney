"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Problem = {
  id: string;
  fileName: string;
  imageUrl: string;
};

type ProblemGridProps = {
  /** Mode to navigate to when clicking a problem card (default: "active") */
  defaultMode?: "active" | "passive";
};

export function ProblemGrid({ defaultMode = "active" }: ProblemGridProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/problems");
        if (res.ok) {
          const data = await res.json();
          setProblems(data.problems || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleClick = (problem: Problem) => {
    router.push(`/${defaultMode}?problem=${problem.id}`);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-y-auto">
      {/* Hero / Welcome */}
      <div className="flex flex-col items-start pt-12 pb-8 px-8 text-left max-w-2xl">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-border shadow-sm mb-5 flex-shrink-0 bg-muted">
          <img
            src="/Clueny CI.png"
            alt="Cluney Math Tutor"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo_hai.png';
            }}
          />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mb-1.5 font-medium tracking-wide">궁금할 땐,</p>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-3 tracking-tight">
          '만능 개념 선생님'
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
          공부하다 모르는 게 생겼니? '개념 선생님'에게 물어봐. 바로바로 해결해 주고 관련 문제도 만들어 줄게!
        </p>
      </div>

      {/* Problem grid */}
      <div className="px-6 pb-10">
        {loading ? (
          // Skeleton grid
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl border border-border bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : problems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            문제 이미지를 찾을 수 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {problems.map((problem, idx) => (
              <button
                key={problem.id}
                onClick={() => handleClick(problem)}
                className="group aspect-square rounded-xl border-2 border-border bg-card overflow-hidden shadow-sm hover:border-primary hover:shadow-md transition-all duration-200 relative"
                title={`문제 ${idx + 1}`}
              >
                {/* Problem number badge */}
                <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                  문제 {idx + 1}
                </div>

                {/* Problem image */}
                <div className="w-full h-full flex items-center justify-center bg-white p-2">
                  <img
                    src={problem.imageUrl}
                    alt={`문제 ${idx + 1}`}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3">
                  <span className="text-xs font-medium text-primary bg-background/90 px-3 py-1 rounded-full shadow-sm">
                    풀러 가기 →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
