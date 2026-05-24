import React from "react";
import { DAILY_LOOP, IRON_RULES } from "../data/dailyLoop";
import { joinClassNames } from "../lib/ui";

export function DailyLoopSection({ variant = "grid" }) {
  return (
    <section className={joinClassNames("panel", "panel--stack", variant === "strip" && "daily-loop-panel")}>
      <div className="section-head">
        <div>
          <div className="section-kicker">DAILY LOOP</div>
          <h2>5-step chart routine</h2>
        </div>
        <p className="section-note">Every rep is about seeing the market clearly, then writing it down.</p>
      </div>
      <div className={variant === "strip" ? "loop-strip" : "loop-grid"}>
        {DAILY_LOOP.map((step) => (
          <article key={step.title} className={joinClassNames("loop-card", variant === "strip" && "loop-card--strip")}>
            <div className="loop-card__title">{step.title}</div>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function IronRulesSection() {
  return (
    <section className="panel panel--stack">
      <div className="section-head">
        <div>
          <div className="section-kicker">IRON RULES</div>
          <h2>Non-negotiables</h2>
        </div>
        <p className="section-note">These rules are the guardrails that keep the learning honest.</p>
      </div>
      <ol className="rules-list">
        {IRON_RULES.map((rule, index) => (
          <li key={rule} className="rule-row">
            <span className="rule-row__index">{String(index + 1).padStart(2, "0")}</span>
            <span className="rule-row__text">{rule}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
