import assert from "node:assert/strict";
import test from "node:test";
import {
  completedInterviewGroupKeys,
  mergeInterviewValues,
  sanitizeInterviewFields,
} from "../src/config/block2Form.ts";
import { normalizeStep2Value } from "../src/config/block1Frizione.ts";

test("una risposta ricca completa piu' argomenti nello stesso turno", () => {
  const values = sanitizeInterviewFields({
    problema: "Due addetti copiano ogni giorno 300 fatture PDF da Outlook a SAP, impiegando quattro ore e introducendo errori.",
    soluzione: "Un assistente estrae i dati dal PDF e prepara la registrazione SAP per la verifica umana.",
    obiettivi: ["riduzioneTempi", "diminuzioneErrori"],
    datiNecessari: "PDF delle fatture, anagrafica fornitori e storico delle registrazioni.",
    datiDove: "Casella Outlook condivisa e SAP.",
    datiVolume: "Circa 300 fatture al giorno.",
    beneficioPrimario: "tempo",
    stimaBeneficio: "Quattro ore al giorno recuperate.",
    utentiImpattati: "Due addetti amministrativi.",
  });

  assert.deepEqual(completedInterviewGroupKeys(values), [
    "processo",
    "soluzione",
    "obiettivi",
    "dati",
    "beneficio",
  ]);
});

test("una risposta vaga non fa avanzare gli argomenti", () => {
  const values = sanitizeInterviewFields({ problema: "" });
  assert.deepEqual(completedInterviewGroupKeys(values), []);
});

test("i dettagli precedenti non vengono persi nei turni successivi", () => {
  const original = "Il processo usa SAP, Outlook e tre file Excel; coinvolge due addetti ogni mattina.";
  const merged = mergeInterviewValues(
    { problema: original, obiettivi: ["riduzioneTempi"] },
    { problema: "Genera spesso errori di ricopiatura.", obiettivi: ["diminuzioneErrori"] }
  );

  assert.match(String(merged.problema), /SAP, Outlook e tre file Excel/);
  assert.match(String(merged.problema), /errori di ricopiatura/);
  assert.deepEqual(merged.obiettivi, ["riduzioneTempi", "diminuzioneErrori"]);
});

test("il normalizzatore dello Step 2 produce solo interi ammessi", () => {
  for (let run = 0; run < 100; run += 1) {
    const generated = normalizeStep2Value(1 + Math.random() * 9);
    assert.equal(Number.isInteger(generated), true);
    assert.ok(generated >= 1 && generated <= 10);
  }
});
