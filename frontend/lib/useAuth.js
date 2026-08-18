import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import jwtDecodePayload from "./jwt";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("dsms_token");
    if (!token) {
      setLoading(false);
      return;
    }
    const payload = jwtDecodePayload(token);
    if (payload) {
      setUser({ email: payload.sub, role: payload.role });
    } else {
      localStorage.removeItem("dsms_token"); // stale/expired token
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("dsms_token");
    router.push("/login");
  };

  return { user, loading, logout };
}
