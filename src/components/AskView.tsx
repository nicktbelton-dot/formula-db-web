'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/AppLink';
import { useDbState } from '@/components/DbProvider';
import { Answer, answerQuestion, EXAMPLES } from '@/core/askEngine';
import { hrefForOpen } from '@/lib/openLinks';

type Entry = { id: number; question: string; answer: Answer };

// The question engine from the phone app, answering from the checked data in the browser. Nothing is sent anywhere:
// the questions stay on this page until it is closed.
const mailto = (e: Entry) =>
  `mailto:info@formuladb.co.uk?subject=${encodeURIComponent(e.answer.understood ? 'Formula DB: an answer that looks wrong' : 'Formula DB: a question it could not answer')}&body=${encodeURIComponent(
    `Question: ${e.question}\nAnswer: ${e.answer.text.split('\n')[0]}\nRead as: ${e.answer.read ?? '(nothing)'}\n\nWhat I expected:`
  )}`;

export default function AskView() {
  const { db, error } = useDbState();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Entry[]>([]);
  const [working, setWorking] = useState(false);
  const counter = useRef(0);
  const started = useRef(false);

  async function run(text: string) {
    const q = text.trim();
    if (!db || !q) return;
    setWorking(true);
    let answer: Answer;
    try {
      answer = await answerQuestion(db as never, q);
    } catch (e) {
      answer = { understood: false, text: `Something went wrong: ${(e as Error).message}` };
    }
    counter.current += 1;
    setHistory((h) => [{ id: counter.current, question: q, answer }, ...h]);
    setQuestion('');
    setWorking(false);
    window.history.replaceState(null, '', `?q=${encodeURIComponent(q)}`);
  }

  // a question can arrive in the address (?q=…) from the search box or the examples on Home
  useEffect(() => {
    if (!db || started.current) return;
    started.current = true;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) run(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  return (
    <div style={{ maxWidth: 820 }}>
      <p className="crumb">Ask</p>
      <h1 style={{ fontSize: 'clamp(34px, 5vw, 46px)', fontWeight: 800, marginBottom: 6 }}>Ask a question</h1>
      <p className="muted">Answers come from the checked data, with the reading of your question shown beneath each one.</p>

      <form
        className="search"
        style={{ margin: '20px 0 14px', maxWidth: 'none', height: 54 }}
        onSubmit={(e) => {
          e.preventDefault();
          run(question);
        }}
      >
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Which car won the 1988 championship?" aria-label="Your question" style={{ fontSize: 16 }} />
        <button className="btn pri" style={{ height: 40 }} disabled={!db || working || !question.trim()}>Ask</button>
      </form>

      {error ? <p className="empty">The data could not be loaded: {error}</p> : null}
      {!db && !error ? <p className="muted">Opening the database…</p> : null}

      <div style={{ marginBottom: 22 }}>
        <span className="legend">{history.length === 0 ? 'Try one of these' : 'More to try'}</span>
        <div className="chips" style={{ marginTop: 8 }}>
          {EXAMPLES.map((q) => (
            <button key={q} className="chip" onClick={() => run(q)} disabled={!db || working}>{q}</button>
          ))}
        </div>
      </div>

      {history.length > 1 ? (
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="muted" style={{ fontSize: 13 }}>{history.length} questions this visit, newest first</span>
          <button className="link-btn" onClick={() => setHistory([])}>Clear</button>
        </div>
      ) : null}

      <div className="col" style={{ gap: 18 }}>
        {history.map((e) => {
          const a = e.answer;
          const openHref = hrefForOpen(a.open?.target);
          return (
            <section key={e.id} className="panel" style={{ padding: 22 }}>
              <span className="lbl">{e.question}</span>
              <p style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>{a.text}</p>
              {a.note ? <p style={{ color: 'var(--accent)', fontSize: 14, marginTop: 8 }}>{a.note}</p> : null}
              {a.rows && a.rows.length > 0 ? (
                <div style={{ marginTop: 14 }}>
                  {a.rows.slice(0, 12).map((r, i) => {
                    const href = hrefForOpen(r.open);
                    const inner = (
                      <>
                        <span>{r.title}{r.sub ? <span className="sub"> · {r.sub}</span> : null}</span>
                        <span className="row" style={{ gap: 10 }}>{r.right ? <strong>{r.right}</strong> : null}{href ? <span className="go" style={{ color: 'var(--accent)' }}>›</span> : null}</span>
                      </>
                    );
                    return href ? (
                      <Link key={i} href={href} className="between ask-row">{inner}</Link>
                    ) : (
                      <div key={i} className="between ask-row">{inner}</div>
                    );
                  })}
                </div>
              ) : null}
              {a.open && openHref ? <Link href={openHref} className="toggle-link">{a.open.label} ›</Link> : null}
              <div className="between" style={{ marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
                {a.read ? <span className="sub" style={{ fontSize: 12 }}>Read as: {a.read}</span> : <span />}
                <a className="sub" style={{ fontSize: 12, textDecoration: 'underline' }} href={mailto(e)}>{a.understood ? 'Report a wrong answer' : 'Send us this question'}</a>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
