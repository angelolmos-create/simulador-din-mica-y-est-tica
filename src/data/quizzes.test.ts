import test from 'node:test';
import assert from 'node:assert/strict';
import { QUIZZES_BY_TOPIC, TOPIC_LIST } from './quizzes';

test('each of the 3 topics has exactly 10 well-formed questions', () => {
  assert.equal(TOPIC_LIST.length, 3);
  for (const topic of TOPIC_LIST) {
    const questions = QUIZZES_BY_TOPIC[topic.id];
    assert.equal(questions.length, 10, `Expected 10 questions for ${topic.id}`);
    const ids = new Set<string>();
    for (const q of questions) {
      assert.ok(q.q.trim().length > 10);
      assert.ok(q.ok.trim().length > 0);
      assert.equal(q.bad.length, 3);
      assert.ok(q.why.trim().length > 10);
      assert.ok(!ids.has(q.id), `Duplicate id ${q.id}`);
      ids.add(q.id);
    }
  }
});
