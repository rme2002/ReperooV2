import type { ReactNode } from "react";
import classes from "./auth-layout.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className={classes.wrapper}>{children}</main>;
}
