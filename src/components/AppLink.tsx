import NextLink from 'next/link';
import type { ComponentProps } from 'react';

// Every link on the site goes through this wrapper. It switches off Next.js's background pre-loading of linked pages,
// which asks for data files by a name that plain static hosts cannot find (a harmless 404 each time). The page still opens
// normally when a link is clicked.
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
