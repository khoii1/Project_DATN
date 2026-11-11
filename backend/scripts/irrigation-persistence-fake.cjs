// Test fake, NEVER a production persistence adapter. Global serialization is a
// stronger simplification than row locks and does not prove PostgreSQL atomicity.
const clone = value => structuredClone(value);
function createStore(data) { return { data: clone(data), tail: Promise.resolve(), failAt: null }; }
function createFakeRepository(store) {
  return { mode: 'SHADOW', environment: 'FAKE', async transaction(actuatorId, work) {
    const prior = store.tail; let release;
    store.tail = new Promise(resolve => { release = resolve; });
    await prior;
    const draft = clone(store.data);
    const fail = operation => { if (store.failAt === operation) throw Error('Injected failure: ' + operation); };
    const save = (map, id, row, expected) => {
      fail('save' + map);
      if (!draft[map].has(id) || draft[map].get(id).version !== expected || row.version !== expected + 1) throw Error('VERSION_CONFLICT');
      draft[map].set(id, clone(row));
    };
    const tx = {
      async lockActuator(id) { if (id !== actuatorId) throw Error('Wrong lock'); return clone(draft.safety.get(id) ?? null); },
      async getCycle(id) { return clone(draft.cycles.get(id) ?? null); },
      async getIntentByKey(key) { return clone([...draft.intents.values()].find(row => row.key === key) ?? null); },
      async getIntent(id) { return clone(draft.intents.get(id) ?? null); },
      async openIntents(id) { return clone([...draft.intents.values()].filter(row => row.actuatorId === id && ['RESERVED', 'DISPATCH_CLAIMED', 'PUBLISHED', 'ACKED', 'UNCERTAIN'].includes(row.status))); },
      async getBudget(id) { return clone([...draft.budgets.values()].find(row => row.id === id && row.actuatorId === actuatorId) ?? null); },
      async getOrCreateBudget(id, day, limits) {
        const key = id + '|SHADOW|' + day;
        if (!draft.budgets.has(key)) draft.budgets.set(key, { id: key, actuatorId: id, version: 0, maxRuns: limits.maxRuns, maxSeconds: limits.maxSeconds,
          state: { actuatorCode: limits.actuatorCode, day, trusted: true, reservedRuns: 0, reservedSeconds: 0 } });
        return clone(draft.budgets.get(key));
      },
      async saveSafety(row, version) { save('safety', row.actuatorId, row, version); },
      async saveCycle(row, version) { save('cycles', row.state.id, row, version); },
      async saveBudget(row, version) {
        if (row.state.reservedRuns < 0 || row.state.reservedSeconds < 0 || row.state.reservedRuns > row.maxRuns || row.state.reservedSeconds > row.maxSeconds) throw Error('BUDGET_BOUNDS');
        save('budgets', row.id, row, version);
      },
      async insertIntent(row) {
        fail('insertIntent');
        if (draft.intents.has(row.id) || [...draft.intents.values()].some(item => item.key === row.key ||
          (item.cycleId === row.cycleId && item.pulseIndex === row.pulseIndex) ||
          (item.actuatorId === row.actuatorId && ['RESERVED', 'DISPATCH_CLAIMED', 'PUBLISHED', 'ACKED', 'UNCERTAIN'].includes(item.status)))) throw Error('UNIQUE_INTENT');
        draft.intents.set(row.id, clone(row));
      },
      async saveIntent(row, version) { save('intents', row.id, row, version); },
      async insertReservation(row) { fail('insertReservation'); if ([...draft.reservations.values()].some(item => item.intentId === row.intentId)) throw Error('UNIQUE_RESERVATION'); draft.reservations.set(row.id, clone(row)); },
      async reservationForIntent(id) { return clone([...draft.reservations.values()].find(row => row.intentId === id) ?? null); },
      async saveReservation(row, version) { save('reservations', row.id, row, version); },
      async getDecisionByKey(key) { return clone(draft.audits.get(key) ?? null); },
      async appendDecision(row) {
        fail('appendDecision');
        const prior = draft.audits.get(row.evaluationKey);
        if (prior && !require('node:util').isDeepStrictEqual(prior, row)) throw Error('AUDIT_IDEMPOTENCY_CONFLICT');
        if (!prior) draft.audits.set(row.evaluationKey, clone(row));
      },
    };
    try { const result = await work(tx); store.data = draft; return clone(result); }
    finally { release(); }
  } };
}
module.exports = { createStore, createFakeRepository };
