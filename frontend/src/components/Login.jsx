import { useState } from "react";
import { login } from "../api";
import ClockComponent from "./ClockComponent";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const handle = async () => {
    try {
      const user = await login({ username, password });
      console.log(user);
      onLogin(user);
    } catch {
      setErr("wrong username or password");
    }
  };
  return (
    <div className="max-w-md mx-auto mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mr-2">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 text-center mb-6">
        Login to Your Account
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
          className="cursor-pointer w-full py-2 bg-[#FF6600] hover:bg-[#cc3600] text-white font-medium rounded-lg transition"
        >
          Login Now
        </button>
      </div>
    </div>
  );
}
