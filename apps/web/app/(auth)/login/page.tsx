import type { Metadata } from "next";
import { SignIn } from "../../../components/SignIn";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Access your account with your credentials.",
};

export default function LoginRoute() {
  return <SignIn />;
}
