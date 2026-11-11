import {
  STORY_PARAGRAPHS,
  AVATAR_ACCESSORIES,
   type AvatarAccessory
} from '../data/pemimpinCilikData';

export interface StudentState {
  uid: string;
  displayName: string;
  className: string;
  tokens: number;
  totalXp: number;
  tpLevel: number;
  avgClarity: number;
  avgIntonation: number;
  completedParagraphs: string[];
  completedCheckpoints: string[];
  unlockedBadges: string[];
  unlockedAccessories: string[];
  equippedHat: string;
  equippedTie: string;
  equippedBack: string;
  equippedGlasses: string;
  rumusanAnswer: string;
}

export interface ReadingEvaluationResult {
  clarityScore: number;
  intonationScore: number;
  matchedWords: string[];
  totalWords: number;
  tokensEarned: number;
  xpEarned: number;
  feedbackText: string;
}

export const BLIND_BOX_COST = 50;

export function normalizeMalayWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '')
    .trim();
}

export function evaluateReadingAttempt(
  paragraphId: string,
  spokenTranscript: string,
  pitchVarianceScore = 88
): ReadingEvaluationResult {
  const paragraph = STORY_PARAGRAPHS.find((p) => p.id === paragraphId) ?? STORY_PARAGRAPHS[0];
  const targetWords = paragraph.text
    .split(/\s+/)
    .map(normalizeMalayWord)
    .filter((w) => w.length > 0);

  const spokenWords = new Set(
    spokenTranscript
      .split(/\s+/)
      .map(normalizeMalayWord)
      .filter((w) => w.length > 0)
  );

  const matchedWords: string[] = [];
  for (const tw of targetWords) {
    if (spokenWords.has(tw)) {
      matchedWords.push(tw);
    }
  }

  const rawRatio = targetWords.length > 0 ? matchedWords.length / targetWords.length : 0;
  const clarityScore = Math.max(0, Math.min(100, Math.round(rawRatio * 100)));

  // Intonation combines keyword coverage, dialogue expression, and pitch cadence
  const keywordHits = paragraph.targetKeywords.filter((kw) =>
    spokenWords.has(normalizeMalayWord(kw))
  ).length;
  const keywordRatio =
    paragraph.targetKeywords.length > 0 ? keywordHits / paragraph.targetKeywords.length : 1;

  const boundedPitch = Math.max(40, Math.min(100, pitchVarianceScore));
  const intonationScore =
    clarityScore === 0
      ? 0
      : Math.max(
          0,
          Math.min(100, Math.round(clarityScore * 0.55 + keywordRatio * 100 * 0.25 + boundedPitch * 0.2))
        );

  const combinedQuality = (clarityScore + intonationScore) / 2;
  const multiplier = combinedQuality >= 90 ? 1.2 : combinedQuality >= 75 ? 1.0 : combinedQuality >= 50 ? 0.6 : 0.3;

  const tokensEarned = clarityScore === 0 ? 0 : Math.max(5, Math.round(paragraph.tokenReward * multiplier));
  const xpEarned = clarityScore === 0 ? 0 : Math.max(10, Math.round(paragraph.xpReward * multiplier));

  let feedbackText = '';
  if (combinedQuality >= 90) {
    feedbackText = 'Sebutan sangat jelas dan intonasi amat tepat seperti Pemimpin Cilik! Tahniah!';
  } else if (combinedQuality >= 75) {
    feedbackText = 'Bacaan yang baik dan jelas! Teruskan latihan intonasi pada ayat dialog.';
  } else if (combinedQuality >= 50) {
    feedbackText = 'Usaha yang baik! Cuba sebut setiap perkataan dengan lebih terang dan jelas.';
  } else {
    feedbackText = 'Sila dengar contoh bacaan dahulu dan cuba sebut semula perenggan ini.';
  }

  return {
    clarityScore,
    intonationScore,
    matchedWords,
    totalWords: targetWords.length,
    tokensEarned,
    xpEarned,
    feedbackText
  };
}

export function calculateTpLevel(state: Pick<
  StudentState,
  'completedParagraphs' | 'completedCheckpoints' | 'avgClarity' | 'avgIntonation' | 'rumusanAnswer'
>): number {
  const pCount = state.completedParagraphs.length;
  const cCount = state.completedCheckpoints.length;
  const hasRumusan = state.rumusanAnswer.trim().length >= 25;
  const avgScore = (state.avgClarity + state.avgIntonation) / 2;

  if (pCount >= 5 && cCount >= 5 && hasRumusan && avgScore >= 85) {
    return 6; // TP6: Mithali / Suri Teladan
  }
  if (pCount >= 4 && cCount >= 3 && (hasRumusan || avgScore >= 80)) {
    return 5; // TP5: Tinggi
  }
  if (pCount >= 3 && cCount >= 2) {
    return 4; // TP4: Baik
  }
  if (pCount >= 2 || cCount >= 2) {
    return 3; // TP3: Memuaskan
  }
  if (pCount >= 1 || cCount >= 1) {
    return 2; // TP2: Asas
  }
  return 1; // TP1: Permulaan
}

export function computeUnlockedBadges(state: StudentState): string[] {
  const badges = new Set<string>(state.unlockedBadges);

  if (state.completedParagraphs.length >= 1) {
    badges.add('badge_first_read');
  }
  if ((state.avgClarity + state.avgIntonation) / 2 >= 85 && state.completedParagraphs.length >= 1) {
    badges.add('badge_intonasi_emas');
  }
  if (state.completedCheckpoints.length >= 5) {
    badges.add('badge_explorer_5');
  }
  if (state.rumusanAnswer.trim().length >= 25) {
    badges.add('badge_rumusan_master');
  }
  if (state.unlockedAccessories.length >= 5) {
    badges.add('badge_blindbox_collector');
  }
  if (calculateTpLevel(state) >= 6) {
    badges.add('badge_tp6_leader');
  }

  return Array.from(badges).slice(0, 20);
}

export interface BlindBoxRollResult {
  success: boolean;
  error?: string;
  accessory?: AvatarAccessory;
  isDuplicate: boolean;
  updatedState: StudentState;
}

export function openBlindBox(
  state: StudentState,
  deterministicSeed?: number
): BlindBoxRollResult {
  if (state.tokens < BLIND_BOX_COST) {
    return {
      success: false,
      error: `Token tidak mencukupi! Anda memerlukan ${BLIND_BOX_COST} Token (Baki: ${state.tokens} Token).`,
      isDuplicate: false,
      updatedState: state
    };
  }

  const premiumPool = AVATAR_ACCESSORIES.filter((item) => item.costTokens > 0);
  const unownedPool = premiumPool.filter((item) => !state.unlockedAccessories.includes(item.id));
  const poolToRoll = unownedPool.length > 0 ? unownedPool : premiumPool;

  const index =
    typeof deterministicSeed === 'number'
      ? Math.abs(Math.floor(deterministicSeed)) % poolToRoll.length
      : Math.floor(Math.random() * poolToRoll.length);

  const chosen = poolToRoll[index];
  const isDuplicate = state.unlockedAccessories.includes(chosen.id);

  // If duplicate, refund 20 tokens as bonus stardust
  const netTokenCost = isDuplicate ? BLIND_BOX_COST - 20 : BLIND_BOX_COST;
  const nextAccessories = isDuplicate
    ? state.unlockedAccessories
    : [...state.unlockedAccessories, chosen.id].slice(0, 30);

  const nextState: StudentState = {
    ...state,
    tokens: Math.max(0, state.tokens - netTokenCost),
    totalXp: state.totalXp + 25,
    unlockedAccessories: nextAccessories,
    // Auto-equip newly unboxed item!
    equippedHat: chosen.slot === 'hat' ? chosen.id : state.equippedHat,
    equippedTie: chosen.slot === 'tie' ? chosen.id : state.equippedTie,
    equippedBack: chosen.slot === 'back' ? chosen.id : state.equippedBack,
    equippedGlasses: chosen.slot === 'glasses' ? chosen.id : state.equippedGlasses
  };

  nextState.unlockedBadges = computeUnlockedBadges(nextState);
  nextState.tpLevel = calculateTpLevel(nextState);

  return {
    success: true,
    accessory: chosen,
    isDuplicate,
    updatedState: nextState
  };
}

export function sanitizeStudentStateForFirestore(state: StudentState): StudentState {
  const cleanId = (val: string, fallback: string) =>
    val && /^[a-zA-Z0-9_\-]+$/.test(val) ? val.slice(0, 128) : fallback;

  return {
    uid: cleanId(state.uid, 'guest_student'),
    displayName: (state.displayName || 'Murid Bestari').trim().slice(0, 60) || 'Murid Bestari',
    className: (state.className || '6 Bestari').trim().slice(0, 30) || '6 Bestari',
    tokens: Math.max(0, Math.min(100000, Math.round(state.tokens))),
    totalXp: Math.max(0, Math.min(500000, Math.round(state.totalXp))),
    tpLevel: Math.max(1, Math.min(6, Math.round(state.tpLevel))),
    avgClarity: Math.max(0, Math.min(100, Math.round(state.avgClarity))),
    avgIntonation: Math.max(0, Math.min(100, Math.round(state.avgIntonation))),
    completedParagraphs: state.completedParagraphs.slice(0, 15).map((s) => String(s).slice(0, 64)),
    completedCheckpoints: state.completedCheckpoints.slice(0, 10).map((s) => String(s).slice(0, 64)),
    unlockedBadges: state.unlockedBadges.slice(0, 20).map((s) => String(s).slice(0, 64)),
    unlockedAccessories: state.unlockedAccessories.slice(0, 30).map((s) => String(s).slice(0, 64)),
    equippedHat: (state.equippedHat || 'hat_none').slice(0, 40),
    equippedTie: (state.equippedTie || 'tie_red_default').slice(0, 40),
    equippedBack: (state.equippedBack || 'back_none').slice(0, 40),
    equippedGlasses: (state.equippedGlasses || 'glasses_none').slice(0, 40),
    rumusanAnswer: (state.rumusanAnswer || '').slice(0, 500)
  };
}
