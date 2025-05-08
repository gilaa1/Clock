import { useState } from "react";
import Login from "./components/Login";
import Signup from "./components/Signup";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import ClockComponent from "./components/ClockComponent";

export default function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.reload();
  };

  const handleLogin = (user) => {
    setUser(user);
    localStorage.setItem("token", user.token);
    localStorage.setItem("role", user.role);
  };

  if (!user) {
    return (
      <div className="flex justify-between items-center flex-col h-screen ">
        <img src="../assets/logo2.png" alt="Logo" className="w-70" />
        <ClockComponent />
        <div className="flex justify-between items-center flex-row mr-8 ml-8">
          <Login onLogin={handleLogin} />
          <Signup onSignup={setUser} />
        </div>
      </div>
    );
  }

  return (
    <>
      <header
        style={{ padding: "1em", borderBottom: "1px solid #ccc" }}
      ></header>
      {user.role === "admin" ? (
        <AdminDashboard onLogout={handleLogout} user={user} />
      ) : (
        <UserDashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}
