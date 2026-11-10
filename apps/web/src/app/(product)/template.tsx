'use client';

import { useLayoutEffect, useRef } from 'react';

let seen = false;

/**
 * Each planner or tool page fades in when you move to it (opacity only, so sticky and fixed bars keep their place).
 * The first page of a visit shows at once, so the fade never delays the first paint.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (seen) ref.current?.classList.add('page-in');
    seen = true;
  }, []);
  return <div ref={ref}>{children}</div>;
}
