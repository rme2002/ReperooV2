import type { Metadata } from "next";
import { Register } from "@/components/Register/Register";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a new account to access the app.",
};

export default function RegisterRoute() {
  return <Register />;
}
