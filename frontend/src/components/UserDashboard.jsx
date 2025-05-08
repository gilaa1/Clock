import React, { useEffect, useState, useMemo } from "react";
import {
  stamp,
  fetchLatestRecordByUsername,
  fetchRecordsByMonthAndUser,
} from "../api";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import de from "date-fns/locale/de";
import ClockComponent from "./ClockComponent";

// register German locale for all DatePickers
registerLocale("de", de);

// format ISO date to readable string in German/Berlin
function formatDate(isoString) {
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  return d.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function UserDashboard({ user, onLogout }) {
  const [records, setRecords] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [month, setMonth] = useState(new Date());

  // load records on mount
  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      const last = await fetchLatestRecordByUsername(user.username, token);

      if (last && last.type === "in") {
        setCurrentEntry(last);
      } else {
        setCurrentEntry(null);
      }

      const records = await fetchRecordsByMonthAndUser(
        user.username,
        month.getMonth() + 1,
        month.getFullYear(),
        token
      );
      setRecords(records);
    }

    load();
  }, [user.username, month]);

  const shifts = useMemo(() => {
    const events = [...records].sort(
      (a, b) => new Date(a.dateTime) - new Date(b.dateTime)
    );

    const queues = {};
    const pairs = [];

    for (const ev of events) {
      const { username, type } = ev;
      if (!queues[username]) queues[username] = [];

      if (type === "in") {
        queues[username].push(ev);
      } else if (type === "out") {
        if (queues[username].length > 0) {
          const entry = queues[username].shift();
          pairs.push({
            entry,
            exit: ev,
            duration: new Date(ev.dateTime) - new Date(entry.dateTime),
          });
        }
      }
    }

    return pairs;
  }, [records]);

  const handleStamp = async (type) => {
    try {
      const token = localStorage.getItem("token");
      const response = await stamp(user.username, type, token);
      setRecords([
        ...records,
        {
          id: response.id,
          username: response.username,
          type: response.type,
          dateTime: response.dateTime,
        },
      ]);
      if (type === "in") {
        setCurrentEntry({
          id: response.id,
          username: response.username,
          type: response.type,
          dateTime: response.dateTime,
        });
      } else {
        setCurrentEntry(null);
      }
    } catch (err) {
      console.error("Error stamping:", err);
      alert("Error reporting in/out");
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
      <div className="flex justify-between items-center mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            Welcome Back, {user.username}
          </h2>
          <img
            src="../../assets/hello.png"
            alt="waving hand"
            className="w-5 h-5"
          />
        </div>
        <button
          onClick={onLogout}
          className="cursor-pointer bg-[#FF6600] hover:bg-[#cc3600] text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-lg"
        >
          Logout
        </button>
      </div>

      <ClockComponent />

      <div className="mt-6 shadow-lg">
        {currentEntry ? (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center ">
            <div className="flex items-center space-x-4 ">
              <img
                src="../../assets/working.png"
                alt="Working"
                className="w-12 h-12"
              />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Working since:
                </p>
                <p className="text-lg font-mono text-gray-800 dark:text-gray-100">
                  {formatDate(currentEntry.dateTime)}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleStamp("out")}
              className="cursor-pointer mt-4 sm:mt-0 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Clock Out
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex items-center space-x-4">
              <img
                src="../../assets/sleeping.png"
                alt="Off Duty"
                className="w-12 h-12"
              />
              <p className="text-gray-600 dark:text-gray-400 mb-3 sm:mb-0">
                You are off duty
              </p>
            </div>
            <button
              onClick={() => handleStamp("in")}
              className="cursor-pointer bg-[#0066CC] hover:bg-[#0030cc] text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Clock In
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center items-center space-x-3">
        <label
          htmlFor="month"
          className="text-sm text-gray-600 dark:text-gray-400 mr-2 "
        >
          Select Month:
        </label>
        <DatePicker
          id="month"
          selected={month}
          onChange={(date) => setMonth(date)}
          dateFormat="MM/yyyy"
          showMonthYearPicker
          locale="de"
          className="cursor-pointer bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
        />
      </div>
      <div className="mt-6 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex justify-center items-center">
          Your Completed Shifts
        </h3>
        <ul className="space-y-4 ">
          {shifts.map(({ entry, exit, duration }) => (
            <li
              key={entry.id}
              className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center shadow-lg"
            >
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Entry:</span>{" "}
                  {formatDate(entry.dateTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Exit:</span>{" "}
                  {formatDate(exit.dateTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Duration:</span>{" "}
                  {formatDuration(duration)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <a
        href="https://www.flaticon.com/free-icons/work-in-progress"
        title="work in progress icons"
        className="text-sm"
      >
        Work in progress icons created by Aranagraphics - Flaticon
      </a>
      <br/>
      <a
        href="https://www.flaticon.com/free-icons/sleeping"
        title="sleeping icons"
        className="text-sm"
      >
        Sleeping icons created by Freepik - Flaticon
      </a>
      <br/>
      <a href="https://www.flaticon.com/free-icons/hello" title="hello icons" className="text-sm"> 
        Hello icons created by Vitaly Gorbachev - Flaticon
      </a>
    </div>
  );
}
