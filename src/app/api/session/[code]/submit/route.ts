import { NextResponse } from "next/server";
import {
  getParticipants,
  getSubmission,
  saveBlock2,
  saveProgress,
  saveStep1,
  saveStep2,
} from "@/lib/session";
import { remainingInterviewGroups } from "@/config/block2Form";
import {
  Block2Submission,
  ParticipantProgress,
  Step1Submission,
  Step2Submission,
  Submission,
} from "@/lib/types";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json();
  const { participantId, part, data } = body;

  if (!participantId || !part || !data) {
    return NextResponse.json({ error: "Richiesta incompleta" }, { status: 400 });
  }

  const participants = await getParticipants(code);
  if (!participants.some((p) => p.participantId === participantId)) {
    return NextResponse.json({ error: "Partecipante non registrato in questa sessione" }, { status: 403 });
  }

  let submission: Submission;
  switch (part) {
    case "step1":
      submission = await saveStep1(code, participantId, data as Step1Submission);
      break;
    case "step2":
      submission = await saveStep2(code, participantId, data as Step2Submission);
      break;
    case "block2": {
      const block2 = data as Block2Submission;
      const current = await getSubmission(code, participantId);
      const remaining = remainingInterviewGroups(
        block2.closedGroups ?? current.block2?.closedGroups
      );
      if (
        block2.completedAt &&
        remaining.length > 0 &&
        !current.block2?.facilitatorUseCaseAuthorized
      ) {
        return NextResponse.json(
          { error: "Lo Use Case è ancora incompleto e non è stato autorizzato dal facilitatore" },
          { status: 403 }
        );
      }
      // I campi di autorizzazione sono riservati alla route autenticata del
      // facilitatore: il partecipante può salvare soltanto il proprio lavoro.
      submission = await saveBlock2(code, participantId, {
        values: block2.values,
        chatLog: block2.chatLog,
        closedGroups: block2.closedGroups,
        interviewDone: block2.interviewDone,
        facilitatorAuthorizationUsedAt: block2.facilitatorAuthorizationUsedAt,
        updatedAt: block2.updatedAt,
        completedAt: block2.completedAt,
      });
      break;
    }
    case "progress":
      submission = await saveProgress(code, participantId, data as ParticipantProgress);
      break;
    default:
      return NextResponse.json({ error: "part non valido" }, { status: 400 });
  }

  return NextResponse.json({ submission });
}
