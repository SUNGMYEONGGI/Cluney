"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export type Choice = {
  id: string;   // e.g. "1", "2", "3", "4"
  text: string;
};

export type MathProblemData = {
  number: number;         // 문제 번호
  requiredCount?: number; // 필수 선택 개수 (기본 1)
  question: string;       // 문제 본문 (마크다운/KaTeX 지원)
  choices: Choice[];
  score?: number;         // 배점
};

type MathProblemProps = {
  problems: MathProblemData[];
};

export function MathProblem({ problems }: MathProblemProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // selected answers per problem: { [problemIndex]: choiceId }
  const [selected, setSelected] = useState<Record<number, string>>({});

  const problem = problems[currentIndex];
  if (!problem) return null;

  const requiredCount = problem.requiredCount ?? 1;
  const selectedAnswer = selected[currentIndex];

  const handleSelect = (choiceId: string) => {
    setSelected((prev) => ({ ...prev, [currentIndex]: choiceId }));
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (currentIndex < problems.length - 1) setCurrentIndex((i) => i + 1);
  };

  return (
    <div className="math-problem-panel border-b border-border bg-background/95 backdrop-blur">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-primary text-primary-foreground shadow-sm">
          문제 {problem.number}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-muted-foreground border border-border bg-muted/40">
          {requiredCount}개 필수 선택
        </span>
        {problem.score != null && (
          <span className="text-xs text-muted-foreground ml-1">({problem.score}점)</span>
        )}

        {/* Prev / Next navigation */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            이전
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === problems.length - 1}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            다음
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Question body */}
      <div className="px-5 pb-3 text-sm text-foreground leading-relaxed">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {problem.question}
          </ReactMarkdown>
        </div>
      </div>

      {/* Answer choices */}
      <div className="px-5 pb-5 flex flex-col gap-1.5">
        {problem.choices.map((choice, idx) => {
          const circleLabels = ["①", "②", "③", "④", "⑤"];
          const label = circleLabels[idx] ?? `(${idx + 1})`;
          const isSelected = selectedAnswer === choice.id;
          return (
            <button
              key={choice.id}
              onClick={() => handleSelect(choice.id)}
              className={`flex items-start gap-2.5 text-left text-sm px-3 py-2 rounded-lg border transition-all duration-150
                ${isSelected
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-transparent hover:border-border hover:bg-muted/50 text-foreground"
                }`}
            >
              <span className={`flex-shrink-0 text-base ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
              <span className="pt-px leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {choice.text}
                </ReactMarkdown>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
