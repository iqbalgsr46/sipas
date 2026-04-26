import { redirect } from "next/navigation";

/**
 * Root Page
 * Redirect otomatis ke halaman login
 */
export default function Home() {
  redirect("/login");
}
