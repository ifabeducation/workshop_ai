import { NextResponse } from "next/server";
import { getFacilitatorFromCookies } from "@/lib/auth";
import { getParticipants, getSubmission, saveBlock2 } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const facilitator = await getFacilitatorFromCookies();
  if (!facilitator) {
    return NextResponse.json({ error: "Non autenticato come facilitatore" }, { status: 401 });
  }

  const { code } = await params;
  const body: unknown = await req.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const { participantId, authorized } = body as { participantId?: unknown; authorized?: unknown };
  if (typeof participantId !== "string" || typeof authorized !== "boolean") {
    return NextResponse.json({ error: "Partecipante o autorizzazione non validi" }, { status: 400 });
  }

  const participants = await getParticipants(code);
  if (!participants.some((participant) => participant.participantId === participantId)) {
    return NextResponse.json({ error: "Partecipante non registrato in questa sessione" }, { status: 404 });
  }

  const current = await getSubmission(code, participantId);
  if (!authorized && current.block2?.completedAt) {
    return NextResponse.json(
      { error: "Non è possibile revocare l'autorizzazione dopo la conferma dello Use Case" },
      { status: 409 }
    );
  }

  const now = Date.now();
  const submission = await saveBlock2(code, participantId, {
    facilitatorUseCaseAuthorized: authorized,
    facilitatorAuthorizedAt: authorized ? now : current.block2?.facilitatorAuthorizedAt,
    facilitatorAuthorizedBy: authorized ? facilitator.name : current.block2?.facilitatorAuthorizedBy,
    facilitatorAuthorizationRevokedAt: authorized ? undefined : now,
  });

  return NextResponse.json({ submission });
}
