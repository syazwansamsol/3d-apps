import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateReadingAttempt,
  calculateTpLevel,
  openBlindBox,
  sanitizeStudentStateForFirestore,
  BLIND_BOX_COST,
  type StudentState
} from './rules';
import { STORY_PARAGRAPHS } from '../data/pemimpinCilikData';

const createMockState = (): StudentState => ({
  uid: 'student_123',
  displayName: 'Afifi Haris',
  className: '6 Bestari',
  tokens: 80,
  totalXp: 100,
  tpLevel: 1,
  avgClarity: 0,
  avgIntonation: 0,
  completedParagraphs: [],
  completedCheckpoints: [],
  unlockedBadges: [],
  unlockedAccessories: ['hat_none', 'tie_red_default', 'back_none', 'glasses_none'],
  equippedHat: 'hat_none',
  equippedTie: 'tie_red_default',
  equippedBack: 'back_none',
  equippedGlasses: 'glasses_none',
  rumusanAnswer: ''
});

test('evaluateReadingAttempt awards high clarity, intonation, and bonus tokens for full paragraph match', () => {
  const p1 = STORY_PARAGRAPHS[0];
  const result = evaluateReadingAttempt(p1.id, p1.text, 95);
  assert.equal(result.clarityScore, 100);
  assert.ok(result.intonationScore >= 90);
  assert.ok(result.tokensEarned >= p1.tokenReward);
  assert.ok(result.xpEarned >= p1.xpReward);
});

test('calculateTpLevel progresses accurately from TP1 to TP6', () => {
  const base = createMockState();
  assert.equal(calculateTpLevel(base), 1);

  const tp3 = {
    ...base,
    completedParagraphs: ['p1', 'p2'],
    completedCheckpoints: ['st_1']
  };
  assert.equal(calculateTpLevel(tp3), 3);

  const tp6 = {
    ...base,
    completedParagraphs: ['p1', 'p2', 'p3', 'p4', 'p5'],
    completedCheckpoints: ['st_1', 'st_2', 'st_3', 'st_4', 'st_5'],
    avgClarity: 92,
    avgIntonation: 90,
    rumusanAnswer:
      'Seorang pemimpin yang baik perlulah menjaga sikap kerana dia akan menjadi suri teladan kepada semua orang. Dia juga perlu menepati masa dan rasional.'
  };
  assert.equal(calculateTpLevel(tp6), 6);
});

test('openBlindBox deducts tokens, unlocks a new accessory, and auto-equips it', () => {
  const initial = createMockState();
  const res = openBlindBox(initial, 0);
  assert.equal(res.success, true);
  assert.ok(res.accessory);
  assert.equal(res.updatedState.tokens, initial.tokens - BLIND_BOX_COST);
  assert.ok(res.updatedState.unlockedAccessories.includes(res.accessory.id));
});

test('openBlindBox rejects roll when tokens are below BLIND_BOX_COST', () => {
  const lowTokens = { ...createMockState(), tokens: 20 };
  const res = openBlindBox(lowTokens, 0);
  assert.equal(res.success, false);
  assert.equal(res.updatedState.tokens, 20);
});

test('sanitizeStudentStateForFirestore enforces firebase-blueprint boundaries', () => {
  const dirty: StudentState = {
    ...createMockState(),
    displayName: 'A'.repeat(200),
    tokens: -50,
    tpLevel: 99
  };
  const clean = sanitizeStudentStateForFirestore(dirty);
  assert.equal(clean.displayName.length, 60);
  assert.equal(clean.tokens, 0);
  assert.equal(clean.tpLevel, 6);
});
