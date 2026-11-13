import type { ReactNode } from 'react';
import Link from '@/components/AppLink';
import { urlId } from '@/lib/ids';
import { clinchedLine, leadLine, Side, TitleInfo } from '@/lib/titleRace';

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// One championship: clinched this season, or the race for it, or (before round 1) the start of the season.
function Panel({ kind, info, side }: { kind: 'drivers' | 'constructors'; info: TitleInfo; side: Side }) {
  const path = kind === 'drivers' ? 'drivers' : 'teams';
  const title = kind === 'drivers' ? 'Drivers\u2019 championship' : 'Constructors\u2019 championship';
  const link = (id: string, name: string) => <Link href={`/${path}/${urlId(id)}`}>{name}</Link>;

  let heading: ReactNode;
  let body: ReactNode = null;
  if (side.champion) {
    heading = link(side.champion.id, side.champion.name);
    body = clinchedLine(info.year, kind, side.left);
  } else if (info.done === 0) {
    heading = `${info.year} season`;
    body = info.first ? `Starts with the ${info.first.name} on ${longDate(info.first.date)}.` : 'The calendar is not out yet.';
  } else if (side.top.length > 0) {
    heading = link(side.top[0].id, side.top[0].name);
    body = (
      <>
        {leadLine(side.top)} After round {info.done} of {info.total}.
      </>
    );
  } else {
    heading = `${info.year} title race`;
    body = `After round ${info.done} of ${info.total}.`;
  }
  const reigning = !side.champion && side.reigning ? side.reigning : null;

  return (
    <div className="panel">
      <span className="lbl">{side.champion ? `${info.year} ${title}` : info.done > 0 ? `${info.year} ${title}: the title race` : title}</span>
      <h2 style={{ fontSize: 28, marginTop: 8 }}>{heading}</h2>
      <p className="sub" style={{ marginTop: 6 }}>{body}</p>
      {reigning ? (
        <p className="sub" style={{ marginTop: 10, fontSize: 13 }}>
          Reigning {kind === 'drivers' ? 'champion' : 'constructors\u2019 champion'}: {link(reigning.id, reigning.name)} ({reigning.year}).
        </p>
      ) : null}
    </div>
  );
}

export default function TitleRace({ info }: { info: TitleInfo }) {
  return (
    <section className="g2" style={{ marginTop: 20, gap: 20 }}>
      <Panel kind="drivers" info={info} side={info.drivers} />
      {info.year >= 1958 ? <Panel kind="constructors" info={info} side={info.teams} /> : null}
    </section>
  );
}
