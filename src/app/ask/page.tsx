'use client';

import { useEffect, useRef, useState } from 'react';
import { useDbState } from '@/components/DbProvider';
import { Answer, answerQuestion } from '@/core/askEngine';

// The question engine from the phone app, answering from the real database in the browser.
export default function Ask() {
  const { db, error } = useDbState();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [working, setWorking] = useState(false);
  const started = useRef(false);

  async function run(text: string) {
    if (!db || !text.trim()) return;
    setWorking(true);
    try {
      setAnswer(await answerQuestion(db as never, text.trim()));
    } catch (e) {
      setAnswer({ understood: false, text: `Something went wrong: ${(e as Error).message}` } as Answer);
    }
    setWorking(false);
  }

  // a question can arrive in the address (?q=â€¦) from the search box or the examples on Home
  useEffect(() => {
    if (!db || started.current) return;
    const q = new URLSearchParams(window.location.search).get('q');
    started.current = true;
    if (q) {
      setQuestion(q);
      run(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  return (
    <div style={{ maxWidth: 760 }}>
      <p className="crumb">Ask</p>
      <h1 style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800, marginBottom: 6 }}>Ask a question</h1>
      <p className="muted">Answers come from the checked data, with the reading of your question shown beneath.</p>
      <form
        className="search"
        style={{ margin: '20px 0', maxWidth: 'none', height: 52 }}
        onSubmit={(e) => {
          e.preventDefault();
          run(question);
        }}
      >
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Which car won the 1988 championship?" aria-label="Your question" style={{ fontSize: 16 }} />
        <button className="btn pri" style={{ height: 38 }} disabled={!db || working}>Ask</button>
      </form>
      {error ? <p className="empty">The data could not be loaded: {error}</p> : null}
      {!db && !error ? <p className="muted">Opening the databaseâ€¦</p> : null}
      {answer ? (
        <section className="panel" style={{ padding: 24 }}>
          <p style={{ fontSize: 20, fontWeight: 600 }}>{answer.text}</p>
          {answer.note ? <p style={{ color: 'var(--accent)', fontSize: 14, marginTop: 8 }}>{answer.note}</p> : null}
          {answer.rows && answer.rows.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              {answer.rows.slice(0, 12).map((r, i) => (
                <div key={i} className="between" style={{ borderTop: '1px solid rgba(255,255,255,.14)', padding: '9px 0' }}>
                  <span>{r.title}{r.sub ? <span className="sub"> Â· {r.sub}</span> : null}</span>
                  <strong>{r.right}</strong>
                </div>
              ))}
            </div>
          ) : null}
          {answer.read ? <p className="sub" style={{ marginTop: 14, fontSize: 12 }}>Read as: {answer.read}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
