"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type {
  ActivityDatum,
  AreaDatum,
  BestScoreDatum,
  FacilitatorAnalytics,
  QuestionImpactDatum,
  QuestionSelectionDatum,
  ScatterDatum,
  ScoreBucketDatum,
  UseCaseOptionDatum,
} from "@/lib/facilitatorAnalytics";

const EMPTY_MESSAGE = "Non ci sono ancora dati sufficienti per questo grafico.";
const BLUE = "#1b98e0";
const NAVY = "#17233f";

type TooltipEntry<T> = { payload?: T };
type ChartTooltipProps<T> = { active?: boolean; payload?: TooltipEntry<T>[] };

function formatNumber(value: number): string {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value);
}

function formatPercentage(value: number): string {
  return `${formatNumber(value)}%`;
}

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-sm rounded-lg border border-ifab-border bg-white px-3 py-2 text-xs text-ifab-text shadow-lg">
      {children}
    </div>
  );
}

function ChartCard({
  title,
  hasData,
  children,
  className = "",
}: {
  title: string;
  hasData: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`rounded-xl border border-ifab-border bg-white p-4 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold text-ifab-navy">{title}</h3>
      {hasData ? children : <p className="py-12 text-center text-sm text-ifab-text-muted">{EMPTY_MESSAGE}</p>}
    </article>
  );
}

function BestScoreTooltip({ active, payload }: ChartTooltipProps<BestScoreDatum>) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <TooltipBox>
      <p className="font-semibold text-ifab-navy">{item.participant}</p>
      <p>{item.candidate}</p>
      <p>Punteggio: {formatNumber(item.score)}</p>
      <p>Impatto: {formatNumber(item.impact)}</p>
      <p>Prontezza: {formatNumber(item.readiness)}</p>
    </TooltipBox>
  );
}

function ScoreBucketTooltip({ active, payload }: ChartTooltipProps<ScoreBucketDatum>) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <TooltipBox>
      <p className="font-semibold text-ifab-navy">Fascia {item.range}</p>
      <p>{item.count} candidate</p>
      <p>{formatPercentage(item.percentage)} del totale</p>
    </TooltipBox>
  );
}

function QuestionSelectionTooltip({ active, payload }: ChartTooltipProps<QuestionSelectionDatum>) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <TooltipBox>
      <p className="mb-1 font-semibold text-ifab-navy">{item.question}</p>
      <p>
        {item.yesCount} risposte Sì su {item.responseCount} risposte ricevute — {formatPercentage(item.percentage)}
      </p>
    </TooltipBox>
  );
}

function QuestionImpactTooltip({ active, payload }: ChartTooltipProps<QuestionImpactDatum>) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <TooltipBox>
      <p className="mb-1 font-semibold text-ifab-navy">{item.question}</p>
      <p>Impatto medio: {formatNumber(item.averageImpact)}</p>
      <p>{item.ratingCount} partecipanti hanno attribuito un impatto</p>
    </TooltipBox>
  );
}

function ActivityTooltip({ active, payload }: ChartTooltipProps<ActivityDatum>) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <TooltipBox>
      <p className="font-semibold text-ifab-navy">{item.activity}</p>
      <p>{item.count} partecipanti — {formatPercentage(item.percentage)}</p>
    </TooltipBox>
  );
}

function AreaImpactTooltip({ active, payload }: ChartTooltipProps<AreaDatum>) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <TooltipBox>
      <p className="font-semibold text-ifab-navy">{item.label}</p>
      <p>Impatto medio: {formatNumber(item.averageImpact)}</p>
      <p>{item.ratingCount} valutazioni utilizzate</p>
    </TooltipBox>
  );
}

function AreaCountTooltip({ active, payload }: ChartTooltipProps<AreaDatum>) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <TooltipBox>
      <p className="font-semibold text-ifab-navy">{item.label}</p>
      <p>{item.yesCount} risposte Sì</p>
    </TooltipBox>
  );
}

function ScatterTooltip({ active, payload }: ChartTooltipProps<ScatterDatum>) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <TooltipBox>
      <p className="font-semibold text-ifab-navy">{item.participant}</p>
      <p>{item.candidate}</p>
      <p>Area: {item.area}</p>
      <p>Impatto: {formatNumber(item.impact)}</p>
      <p>Prontezza: {formatNumber(item.readiness)}</p>
      <p>Punteggio: {formatNumber(item.score)}</p>
    </TooltipBox>
  );
}

function UseCaseTooltip({ active, payload }: ChartTooltipProps<UseCaseOptionDatum>) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <TooltipBox>
      <p className="font-semibold text-ifab-navy">{item.label}</p>
      <p>{item.count} partecipanti — {formatPercentage(item.percentage)}</p>
    </TooltipBox>
  );
}

export default function FacilitatorAnalyticsDashboard({ analytics }: { analytics: FacilitatorAnalytics }) {
  const areaImpactData = analytics.areas.filter((area) => area.ratingCount > 0);
  const hasAreaCounts = analytics.areas.some((area) => area.yesCount > 0);

  return (
    <section className="mt-8 border-t border-ifab-border pt-7">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-ifab-navy">Analisi delle risposte dei partecipanti</h2>
        <p className="mt-1 text-xs text-ifab-text-muted">
          I grafici si aggiornano automaticamente con le risposte raccolte nella sessione.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ChartCard title="Punteggio migliore per partecipante" hasData className="md:col-span-2">
          {analytics.bestScores.length > 0 ? (
            <div style={{ height: Math.max(280, analytics.bestScores.length * 38) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.bestScores} layout="vertical" margin={{ top: 4, right: 42, bottom: 4, left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="participant" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip content={<BestScoreTooltip />} />
                  <Bar dataKey="score" fill={BLUE} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    <LabelList dataKey="score" position="right" fill={NAVY} fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-ifab-text-muted">{EMPTY_MESSAGE}</p>
          )}
          <p className="mt-2 text-xs text-ifab-text-muted">
            {analytics.participantsWithoutScore} partecipanti non hanno ancora un punteggio.
          </p>
        </ChartCard>

        <ChartCard title="Distribuzione dei punteggi" hasData={analytics.evaluatedCandidates > 0}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.scoreDistribution} margin={{ top: 18, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip content={<ScoreBucketTooltip />} />
                <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="displayValue" position="top" fill={NAVY} fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Segnalazioni per area" hasData={hasAreaCounts}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.areas} margin={{ top: 18, right: 12, bottom: 34, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" angle={-18} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip content={<AreaCountTooltip />} />
                <Bar dataKey="yesCount" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {analytics.areas.map((area) => <Cell key={area.key} fill={area.color} />)}
                  <LabelList dataKey="yesCount" position="top" fill={NAVY} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Domande più selezionate dai partecipanti" hasData={analytics.questionSelections.length > 0} className="md:col-span-2">
          <div style={{ height: Math.max(360, analytics.questionSelections.length * 42) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.questionSelections} layout="vertical" margin={{ top: 4, right: 42, bottom: 4, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="shortLabel" width={280} tick={{ fontSize: 10 }} />
                <Tooltip content={<QuestionSelectionTooltip />} />
                <Bar dataKey="yesCount" fill={BLUE} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  <LabelList dataKey="yesCount" position="right" fill={NAVY} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Domande con maggiore impatto medio" hasData={analytics.questionImpacts.length > 0} className="md:col-span-2">
          <div style={{ height: Math.max(360, analytics.questionImpacts.length * 42) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.questionImpacts} layout="vertical" margin={{ top: 4, right: 42, bottom: 4, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="shortLabel" width={280} tick={{ fontSize: 10 }} />
                <Tooltip content={<QuestionImpactTooltip />} />
                <Bar dataKey="averageImpact" fill="#059669" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  <LabelList dataKey="averageImpact" position="right" fill={NAVY} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Attrito segnalato per attività di riferimento" hasData={analytics.activities.length > 0} className="md:col-span-2">
          <div style={{ height: Math.max(320, analytics.activities.length * 36) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.activities} layout="vertical" margin={{ top: 4, right: 42, bottom: 4, left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="activity" width={190} tick={{ fontSize: 10 }} />
                <Tooltip content={<ActivityTooltip />} />
                <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  <LabelList dataKey="count" position="right" fill={NAVY} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-ifab-text-muted">
            Percentuali calcolate sui {analytics.participantsWithAnswers} partecipanti con almeno una risposta.
          </p>
        </ChartCard>

        <ChartCard title="Impatto medio per area" hasData={areaImpactData.length > 0}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaImpactData} margin={{ top: 18, right: 12, bottom: 34, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" angle={-18} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip content={<AreaImpactTooltip />} />
                <Bar dataKey="averageImpact" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {areaImpactData.map((area) => <Cell key={area.key} fill={area.color} />)}
                  <LabelList dataKey="averageImpact" position="top" fill={NAVY} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Posizionamento delle candidate: Impatto × Prontezza" hasData={analytics.scatterPoints.length > 0} className="md:col-span-2">
          <div className="h-[440px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 28, bottom: 28, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="impact" name="Impatto" domain={[0, 10]} tick={{ fontSize: 11 }} label={{ value: "Impatto", position: "insideBottom", offset: -16 }} />
                <YAxis type="number" dataKey="readiness" name="Prontezza" domain={[0, 10]} tick={{ fontSize: 11 }} label={{ value: "Prontezza", angle: -90, position: "insideLeft" }} />
                <ZAxis range={[70, 70]} />
                <ReferenceLine x={5} stroke="#64748b" strokeDasharray="5 5" />
                <ReferenceLine y={5} stroke="#64748b" strokeDasharray="5 5" />
                <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={analytics.scatterPoints} isAnimationActive={false}>
                  {analytics.scatterPoints.map((point, index) => (
                    <Cell key={`${point.participant}-${point.candidate}-${index}`} fill={point.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mb-4 mt-8">
        <h2 className="text-lg font-semibold text-ifab-navy">Scelte aggregate dei Use Case</h2>
        <p className="mt-1 text-xs text-ifab-text-muted">Sono inclusi soltanto i campi a scelta singola o multipla.</p>
      </div>

      {analytics.useCaseFields.length === 0 ? (
        <div className="rounded-xl border border-ifab-border bg-white p-4">
          <p className="py-12 text-center text-sm text-ifab-text-muted">{EMPTY_MESSAGE}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {analytics.useCaseFields.map((field) => (
            <ChartCard key={field.id} title={field.label} hasData>
              <p className="mb-2 text-[11px] text-ifab-text-muted">
                {field.responseCount} rispondenti · {field.type === "checkbox" ? "scelta multipla" : "scelta singola"}
              </p>
              <div style={{ height: Math.max(220, field.options.length * 40) }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={field.options} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="chartLabel" width={190} tick={{ fontSize: 10 }} />
                    <Tooltip content={<UseCaseTooltip />} />
                    <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      <LabelList dataKey="displayValue" position="right" fill={NAVY} fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          ))}
        </div>
      )}
    </section>
  );
}
