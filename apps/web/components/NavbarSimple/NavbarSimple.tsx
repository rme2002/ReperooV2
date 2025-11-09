'use client';

import Link from 'next/link';
import {
  IconBellRinging,
  IconLayoutDashboard,
  IconLogout,
  IconSettings,
  IconSwitchHorizontal,
} from '@tabler/icons-react';
import classes from './NavbarSimple.module.css';

const navItems = [
  { href: '/', label: 'Home', icon: IconLayoutDashboard },
  { href: '/notifications', label: 'Notifications', icon: IconBellRinging },
  { href: '/settings', label: 'Other Settings', icon: IconSettings },
];

type NavbarSimpleProps = {
  activePath: string;
  onNavigate?: () => void;
};

export function NavbarSimple({ activePath, onNavigate }: NavbarSimpleProps) {
  const links = navItems.map((item) => {
    const isActive = activePath === item.href || activePath.startsWith(`${item.href}/`);

    return (
      <Link
        href={item.href}
        className={classes.link}
        data-active={isActive || undefined}
        key={item.href}
        onClick={() => onNavigate?.()}
      >
        <item.icon className={classes.linkIcon} stroke={1.5} />
        <span>{item.label}</span>
      </Link>
    );
  });

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>{links}</div>

      <div className={classes.footer}>
        <a href="#" className={classes.link} onClick={(event) => event.preventDefault()}>
          <IconSwitchHorizontal className={classes.linkIcon} stroke={1.5} />
          <span>Change account</span>
        </a>

        <Link href="/login" className={classes.link} onClick={() => onNavigate?.()}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>Logout</span>
        </Link>
      </div>
    </nav>
  );
}
