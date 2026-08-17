import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    const token = typeof window !== "undefined" && localStorage.getItem("dsms_token");
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);
  return null;
}
