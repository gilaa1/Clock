import { useState } from "react";

import { signup } from "../api";
import ClockComponent from "./ClockComponent";

export default function Signup({ onSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [err, setErr] = useState("");

  const handle = async () => {
    try {
      const user = await signup({ username, password, role });
      onSignup(user);
    } catch {
      setErr("Username already exists");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 ml-2">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 text-center mb-6">
        Create Your Account
      </h2>

      {err && <p className="text-red-500 text-sm text-center mb-4">{err}</p>}

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
          className="cursor-pointer w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          className="cursor-pointer w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
        />

        <button
          onClick={handle}
          className="cursor-pointer w-full py-2 bg-[#0066CC] hover:bg-[#0030cc] text-white font-medium rounded-lg transition"
        >
          Sign Up Now
        </button>
      </div>
    </div>
  );
}
