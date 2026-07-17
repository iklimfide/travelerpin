import type { Metadata } from "next";
import { AuthModalRoute } from "@/components/auth/AuthModalRoute";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  return <AuthModalRoute mode="register" />;
}
