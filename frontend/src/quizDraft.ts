import type { QuestionWithIds } from './adapters';
export interface QuestionAnswerState { dapAnId?: number | null; textAnswer?: string; tokenIds?: number[] }
const seconds = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(20, Math.floor(n))) : 20;
export function restoreDraft(raw: string | null, loaded: QuestionWithIds[], now: number) {
  const state = { questions: loaded, answers: {} as Record<number, QuestionAnswerState>, flagged: {} as Record<number, boolean>, remaining: Object.fromEntries(loaded.map(q => [q.backendId,20])) as Record<number,number>, current: 0, startedAt: now };
  if (!raw) return state;
  try {
    const saved = JSON.parse(raw);
    if (!saved || typeof saved.savedAt !== 'number' || now < saved.savedAt || now - saved.savedAt >= 3*3600*1000) return state;
    const questionById = new Map(loaded.map(q => [q.backendId,q]));
    const order: QuestionWithIds[] = [];
    if (Array.isArray(saved.questionIds)) for (const id of saved.questionIds) { const q = questionById.get(id); if (q) { order.push(q); questionById.delete(id); } }
    state.questions = [...order,...questionById.values()].map((q,index) => ({...q,id:index}));
    for (const q of loaded) {
      const source = saved.answers?.[q.backendId];
      const answer = typeof source === 'number' ? {dapAnId:source} : source;
      if (answer && typeof answer === 'object') {
        if (q.loaiCauHoi === 'DIEN_TU' && typeof answer.textAnswer === 'string') state.answers[q.backendId] = {textAnswer:answer.textAnswer};
        else if (q.loaiCauHoi === 'SAP_XEP' && Array.isArray(answer.tokenIds)) state.answers[q.backendId] = {tokenIds:[...new Set<number>(answer.tokenIds.filter((id: unknown) => typeof id === 'number' && q.answerIds.includes(id)))]};
        else if ((!q.loaiCauHoi || q.loaiCauHoi === 'TRAC_NGHIEM') && q.answerIds.includes(answer.dapAnId)) state.answers[q.backendId] = {dapAnId:answer.dapAnId};
      }
      if (saved.flagged?.[q.backendId] === true) state.flagged[q.backendId] = true;
      state.remaining[q.backendId] = seconds(saved.remaining?.[q.backendId]);
    }
    const index = state.questions.findIndex(q => q.backendId === saved.currentId);
    state.current = index < 0 ? 0 : index;
    if (typeof saved.startedAt === 'number' && saved.startedAt <= saved.savedAt && now - saved.startedAt < 3*3600*1000) state.startedAt = saved.startedAt;
    const active = state.questions[state.current];
    if (saved.version === 2 && active && !(active.loaiCauHoi === 'TRAC_NGHIEM' && state.answers[active.backendId]?.dapAnId != null)) state.remaining[active.backendId] = Math.max(0, state.remaining[active.backendId] - Math.floor((now-saved.savedAt)/1000));
    return state;
  } catch { return state; }
}
