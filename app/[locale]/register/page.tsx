import type { Metadata } from "next";
import { AuthModalRoute } from "@/components/auth/AuthModalRoute";
import { GuestHomeMain } from "@/components/home/GuestHomeMain";
import "@/app/styles/profile.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  return (
    <>
      <AuthModalRoute mode="register" />
      <GuestHomeMain />
    </>
  );
}
