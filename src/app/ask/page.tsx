'use client';

import { useState } from 'react';
import { openDb } from '@/lib/sqljs';
import { Answer, answerQuestion } from '@/core/askEngine';

// Phase 1 proof: the phone app's question engine answering from the real database, in a browser.
export default function AskTest() {
  const [question, setQuestion] = useState('Who won the 2009 championship?');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [status, setStatus] = useState('');

  async function ask() {
    setStatus('Opening the databaseâ€¦');
    setAnswer(null);
    try {
      const db = await openDb();
      setStatus('Working it outâ€¦');
      setAnswer(await answerQuestion(db as never, question));
      setStatus('');
    } catch (e) {
      setStatus(`Something went wrong: ${(e as Error).message}`);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
      <h1>Formula DB: question engine on the web</h1>
      <p style={{ color: '#675F73' }}>A test page for the foundations phase. The answers come from the real database, in your browser.</p>
      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          style={{ flex: 1, padding: '10px 12px', fontSize: 16, border: '1px solid #D5CEDC', borderRadius: 8 }}
          aria-label="Your question"
        />
        <button onClick={ask} style={{ padding: '10px 18px', fontSize: 16, borderRadius: 8, border: 0, background: '#C2253F', color: '#fff' }}>
          Ask
        </button>
      </div>
      {status ? <p>{status}</p> : null}
      {answer ? (
        <section style={{ background: '#1E1230', color: '#fff', borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{answer.text}</p>
          {answer.note ? <p style={{ color: '#FF8FA3', fontSize: 14 }}>{answer.note}</p> : null}
          {answer.rows?.slice(0, 8).map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #3A2E4F', padding: '8px 0' }}>
              <span>
                {r.title}
                {r.sub ? <span style={{ color: '#C9B8E0', fontSize: 13 }}> Â· {r.sub}</span> : null}
              </span>
              <strong>{r.right}</strong>
            </div>
          ))}
          {answer.read ? <p style={{ color: '#C9B8E0', fontSize: 12 }}>Read as: {answer.read}</p> : null}
        </section>
      ) : null}
    </main>
  );
}
