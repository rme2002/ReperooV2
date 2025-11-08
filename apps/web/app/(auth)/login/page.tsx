import type { Metadata } from "next";
import { AuthenticationTitle } from "../../../components/AuthenticationTitle";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Access your account with your credentials.",
};

export default function LoginRoute() {
  return <AuthenticationTitle />;
}
