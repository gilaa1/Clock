import { useState } from "react";
import { login } from "../api";

export default function Logout({ onLogout }) {
  const [err, setErr] = useState("");
  const handle = async () => {
    try {
      await login({});
      onLogout();
    } catch {
      setErr("error logging out");
    }
  };
  return (
    <div>
      <button onClick={handle}>Logout</button>
    </div>
  );
}
