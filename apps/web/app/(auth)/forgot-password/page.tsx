import type { Metadata } from "next";
import { ForgotPassword } from "@/components/ForgotPassword/ForgotPassword";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a secure reset link.",
};

export default function ForgotPasswordRoute() {
  return <ForgotPassword />;
}
