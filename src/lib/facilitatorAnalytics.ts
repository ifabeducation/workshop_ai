import { BLOCCHI, DOMANDE, DOMANDA_CRITERI_TACITI } from "@/config/block1Frizione";
import { BLOCK2_FIELDS } from "@/config/block2Form";
import { calcolaEsiti } from "@/lib/frizioneScoring";
import type { FrizioneBlocco, Participant, Submission } from "@/lib/types";

export type FacilitatorRow = {
  participant: Participant;
  submission: Submission;
};

export type BestScoreDatum = {
  participant: string;
  candidate: string;
  score: number;
  impact: number;
  readiness: number;
};

export type ScoreBucketDatum = {
  range: string;
  count: number;
  percentage: number;
  displayValue: string;
};

export type QuestionSelectionDatum = {
  id: number;
  shortLabel: string;
  question: string;
  yesCount: number;
  responseCount: number;
  percentage: number;
};

export type QuestionImpactDatum = {
  id: number;
  shortLabel: string;
  question: string;
  averageImpact: number;
  ratingCount: number;
};

export type ActivityDatum = {
  activity: string;
  count: number;
  percentage: number;
};

export type AreaDatum = {
  key: FrizioneBlocco;
  label: string;
  color: string;
  yesCount: number;
  averageImpact: number;
  ratingCount: number;
};

export type ScatterDatum = {
  participant: string;
  candidate: string;
  area: string;
  areaKey: FrizioneBlocco;
  color: string;
  impact: number;
  readiness: number;
  score: number;
};

export type UseCaseOptionDatum = {
  value: string;
  label: string;
  chartLabel: string;
  count: number;
  percentage: number;
  displayValue: string;
};

export type UseCaseFieldDatum = {
  id: string;
  label: string;
  type: "radio" | "checkbox";
  responseCount: number;
  options: UseCaseOptionDatum[];
};

export type FacilitatorAnalytics = {
  bestScores: BestScoreDatum[];
  participantsWithoutScore: number;
  scoreDistribution: ScoreBucketDatum[];
  evaluatedCandidates: number;
  questionSelections: QuestionSelectionDatum[];
  questionImpacts: QuestionImpactDatum[];
  activities: ActivityDatum[];
  participantsWithAnswers: number;
  areas: AreaDatum[];
  scatterPoints: ScatterDatum[];
  useCaseFields: UseCaseFieldDatum[];
};

const roundOne = (value: number): number => Math.round(value * 10) / 10;

const percentage = (count: number, total: number): number =>
  total > 0 ? roundOne((count / total) * 100) : 0;

const displayCountAndPercentage = (count: number, value: number): string =>
  `${count} · ${String(value).replace(".", ",")}%`;

function shortLabel(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

function shortQuestion(id: number, text: string): string {
  const limit = 43;
  const abbreviated = shortLabel(text, limit);
  return `D${id} · ${abbreviated}`;
}

export function buildFacilitatorAnalytics(rows: FacilitatorRow[]): FacilitatorAnalytics {
  const bestScores: BestScoreDatum[] = [];
  const allScores: number[] = [];
  const scatterPoints: ScatterDatum[] = [];
  const activityCounts = new Map<string, number>();
  let participantsWithAnswers = 0;

  const questionStats = new Map(
    DOMANDE.filter((question) => question.id !== DOMANDA_CRITERI_TACITI).map((question) => [
      question.id,
      { yesCount: 0, responseCount: 0, impactSum: 0, ratingCount: 0 },
    ])
  );

  const areaStats: Record<FrizioneBlocco, { yesCount: number; impactSum: number; ratingCount: number }> = {
    sposti: { yesCount: 0, impactSum: 0, ratingCount: 0 },
    controlli: { yesCount: 0, impactSum: 0, ratingCount: 0 },
    scrivi: { yesCount: 0, impactSum: 0, ratingCount: 0 },
    decidi: { yesCount: 0, impactSum: 0, ratingCount: 0 },
  };

  for (const { participant, submission } of rows) {
    const results = calcolaEsiti(submission.step1, submission.step2);
    const best = results[0];
    if (best) {
      bestScores.push({
        participant: participant.name,
        candidate: best.nome,
        score: roundOne(best.punteggio),
        impact: roundOne(best.impatto),
        readiness: roundOne(best.prontezza),
      });
    }

    for (const result of results) {
      allScores.push(result.punteggio);
      scatterPoints.push({
        participant: participant.name,
        candidate: result.nome,
        area: BLOCCHI[result.blocco].label,
        areaKey: result.blocco,
        color: BLOCCHI[result.blocco].colore,
        impact: roundOne(result.impatto),
        readiness: roundOne(result.prontezza),
        score: roundOne(result.punteggio),
      });
    }

    const answers = submission.step1?.risposte ?? {};
    if (Object.values(answers).some((answer) => answer?.risposta === "si" || answer?.risposta === "no")) {
      participantsWithAnswers += 1;
    }

    const participantActivities = new Set<string>();
    for (const question of DOMANDE) {
      if (question.id === DOMANDA_CRITERI_TACITI) continue;
      const answer = answers[String(question.id)];
      if (!answer || (answer.risposta !== "si" && answer.risposta !== "no")) continue;

      const questionStat = questionStats.get(question.id);
      if (!questionStat) continue;
      questionStat.responseCount += 1;

      if (answer.risposta === "si") {
        questionStat.yesCount += 1;
        areaStats[question.blocco].yesCount += 1;
        question.attivita.forEach((activity) => participantActivities.add(activity));

        if (typeof answer.impatto === "number" && Number.isFinite(answer.impatto)) {
          questionStat.impactSum += answer.impatto;
          questionStat.ratingCount += 1;
          areaStats[question.blocco].impactSum += answer.impatto;
          areaStats[question.blocco].ratingCount += 1;
        }
      }
    }

    participantActivities.forEach((activity) => {
      activityCounts.set(activity, (activityCounts.get(activity) ?? 0) + 1);
    });
  }

  bestScores.sort((a, b) => b.score - a.score || a.participant.localeCompare(b.participant, "it"));

  const bucketDefinitions = [
    { range: "0–20", upper: 20 },
    { range: "21–40", upper: 40 },
    { range: "41–60", upper: 60 },
    { range: "61–80", upper: 80 },
    { range: "81–100", upper: 100 },
  ];
  const bucketCounts = bucketDefinitions.map(() => 0);
  for (const score of allScores) {
    const index = bucketDefinitions.findIndex((bucket) => score <= bucket.upper);
    bucketCounts[index >= 0 ? index : bucketCounts.length - 1] += 1;
  }
  const scoreDistribution = bucketDefinitions.map((bucket, index) => {
    const count = bucketCounts[index];
    const bucketPercentage = percentage(count, allScores.length);
    return {
      range: bucket.range,
      count,
      percentage: bucketPercentage,
      displayValue: displayCountAndPercentage(count, bucketPercentage),
    };
  });

  const questionSelections = DOMANDE.filter((question) => question.id !== DOMANDA_CRITERI_TACITI)
    .map((question) => {
      const stats = questionStats.get(question.id)!;
      return {
        id: question.id,
        shortLabel: shortQuestion(question.id, question.testo),
        question: question.testo,
        yesCount: stats.yesCount,
        responseCount: stats.responseCount,
        percentage: percentage(stats.yesCount, stats.responseCount),
      };
    })
    .filter((question) => question.responseCount > 0)
    .sort((a, b) => b.yesCount - a.yesCount || b.percentage - a.percentage || a.id - b.id)
    .slice(0, 10);

  const questionImpacts = DOMANDE.filter((question) => question.id !== DOMANDA_CRITERI_TACITI)
    .map((question) => {
      const stats = questionStats.get(question.id)!;
      return {
        id: question.id,
        shortLabel: shortQuestion(question.id, question.testo),
        question: question.testo,
        averageImpact: stats.ratingCount > 0 ? roundOne(stats.impactSum / stats.ratingCount) : 0,
        ratingCount: stats.ratingCount,
      };
    })
    .filter((question) => question.ratingCount > 0)
    .sort((a, b) => b.averageImpact - a.averageImpact || b.ratingCount - a.ratingCount || a.id - b.id)
    .slice(0, 10);

  const activities = Array.from(activityCounts, ([activity, count]) => ({
    activity,
    count,
    percentage: percentage(count, participantsWithAnswers),
  })).sort((a, b) => b.count - a.count || a.activity.localeCompare(b.activity, "it"));

  const areas = Object.values(BLOCCHI).map((area) => {
    const stats = areaStats[area.key];
    return {
      key: area.key,
      label: area.label,
      color: area.colore,
      yesCount: stats.yesCount,
      averageImpact: stats.ratingCount > 0 ? roundOne(stats.impactSum / stats.ratingCount) : 0,
      ratingCount: stats.ratingCount,
    };
  });

  const useCaseFields: UseCaseFieldDatum[] = [];
  for (const field of BLOCK2_FIELDS) {
    if ((field.type !== "radio" && field.type !== "checkbox") || !field.options?.length) continue;

    const counts = new Map(field.options.map((option) => [option.value, 0]));
    let responseCount = 0;

    for (const { submission } of rows) {
      const value = submission.block2?.values?.[field.id];
      if (field.type === "checkbox") {
        if (!Array.isArray(value) || value.length === 0) continue;
        const selected = new Set(value.filter((item) => counts.has(item)));
        if (selected.size === 0) continue;
        responseCount += 1;
        selected.forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
      } else {
        if (typeof value !== "string" || !counts.has(value)) continue;
        responseCount += 1;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }

    if (responseCount === 0) continue;
    useCaseFields.push({
      id: field.id,
      label: field.label,
      type: field.type,
      responseCount,
      options: field.options.map((option) => {
        const count = counts.get(option.value) ?? 0;
        const optionPercentage = percentage(count, responseCount);
        return {
          value: option.value,
          label: option.label,
          chartLabel: shortLabel(option.label, 32),
          count,
          percentage: optionPercentage,
          displayValue: displayCountAndPercentage(count, optionPercentage),
        };
      }),
    });
  }

  return {
    bestScores,
    participantsWithoutScore: Math.max(0, rows.length - bestScores.length),
    scoreDistribution,
    evaluatedCandidates: allScores.length,
    questionSelections,
    questionImpacts,
    activities,
    participantsWithAnswers,
    areas,
    scatterPoints,
    useCaseFields,
  };
}
