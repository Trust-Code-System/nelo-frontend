'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RollText } from './motion/RollText';

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Header link whose roll animation can finish, and whose destination stays selected. */
export function NavRollLink({
  href,
  label,
  index,
  className,
}: {
  href: string;
  label: string;
  index?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const current = isCurrentPath(pathname, href);

  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      data-index={index}
    >
      <RollText text={label} />
    </Link>
  );
}
