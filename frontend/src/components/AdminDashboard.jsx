import React, { useEffect, useState, useMemo, useRef } from "react";
import moment from "moment-timezone";
import {
  fetchRecords,
  updateRecord,
  deleteRecord,
  fetchRecordsByMonth,
} from "../api";
import ClockComponent from "./ClockComponent";
import DatePicker, { registerLocale } from "react-datepicker";
import de from "date-fns/locale/de";

import "react-datepicker/dist/react-datepicker.css";

registerLocale("de", de);

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

function countActiveEmployees(records) {
  const latestByUser = {};
  for (const ev of records) {
    const { username, dateTime } = ev;
    if (
      !latestByUser[username] ||
      new Date(dateTime) > new Date(latestByUser[username].dateTime)
    ) {
      latestByUser[username] = ev;
    }
  }
  return Object.values(latestByUser).filter((ev) => ev.type === "in").length;
}

function getActiveEmployees(records) {
  const latestByUser = {};
  for (const ev of records) {
    const { username, dateTime } = ev;
    if (
      !latestByUser[username] ||
      new Date(dateTime) > new Date(latestByUser[username].dateTime)
    ) {
      latestByUser[username] = ev;
    }
  }
  return Object.values(latestByUser).filter((ev) => ev.type === "in");
}

export default function AdminDashboard({ onLogout }) {
  const role = localStorage.getItem("role");
  const [records, setRecords] = useState([]);
  const [editModeById, setEditModeById] = useState({});
  const [selectedById, setSelectedById] = useState({});
  const [month, setMonth] = useState(new Date());
  const [showCurrentlyWorking, setShowCurrentlyWorking] = useState(false);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      const records = await fetchRecordsByMonth(
        month.getMonth() + 1,
        month.getFullYear(),
        token
      );
      setRecords(records);
    }

    load();
  }, [month]);

  const shifts = useMemo(() => {
    const events = [...records].sort((a, b) => {
      const da = new Date(a.dateTime),
        db = new Date(b.dateTime);
      if (da < db) return -1;
      if (da > db) return 1;
      if (a.type === b.type) return 0;
      return a.type === "in" ? -1 : 1;
    });

    const queues = {};
    const pairs = [];
    for (const ev of events) {
      const { username, type } = ev;
      if (!queues[username]) queues[username] = [];
      if (type === "in") {
        queues[username].push(ev);
      } else if (queues[username].length) {
        const entry = queues[username].shift();
        pairs.push({
          entry,
          exit: ev,
          duration: new Date(ev.dateTime) - new Date(entry.dateTime),
        });
      }
    }
    return pairs;
  }, [records]);

  const handleEdit = (id) => {
    const shift = shifts.find((sh) => sh.entry.id === id);
    const entryM = moment.tz(shift.entry.dateTime, "Europe/Berlin");
    const exitM = moment.tz(shift.exit.dateTime, "Europe/Berlin");

    setEditModeById((m) => ({ ...m, [id]: true }));
    setSelectedById((s) => ({
      ...s,
      [id]: {
        datePart: entryM.format("YYYY-MM-DD"),
        timePart: entryM.format("HH:mm:ss"),
        exitDatePart: exitM.format("YYYY-MM-DD"),
        exitTimePart: exitM.format("HH:mm:ss"),
      },
    }));
  };

  const handleCancel = (id) => {
    setEditModeById((m) => ({ ...m, [id]: false }));
  };

  const handleSave = async (id) => {
    const sel = selectedById[id] || {};
    if (
      !sel.datePart ||
      !sel.timePart ||
      !sel.exitDatePart ||
      !sel.exitTimePart
    ) {
      alert("All fields are required");
      return;
    }

    const entryM = moment.tz(
      `${sel.datePart}T${sel.timePart}`,
      "YYYY-MM-DDTHH:mm:ss",
      "Europe/Berlin"
    );
    const exitM = moment.tz(
      `${sel.exitDatePart}T${sel.exitTimePart}`,
      "YYYY-MM-DDTHH:mm:ss",
      "Europe/Berlin"
    );

    if (exitM.isBefore(entryM)) {
      alert("Exit time must be after entry time");
      return;
    }

    const otherShifts = shifts.filter((sh) => sh.entry.id !== id);
    for (const { entry: e2, exit: x2 } of otherShifts) {
      const start2 = moment.tz(e2.dateTime, "Europe/Berlin");
      const end2 = moment.tz(x2.dateTime, "Europe/Berlin");
      if (entryM.isBefore(end2) && exitM.isAfter(start2)) {
        alert(
          `This shift overlaps another: ${start2.format(
            "DD.MM.YYYY HH:mm:ss"
          )} - ${end2.format("DD.MM.YYYY HH:mm:ss")}`
        );
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      const shift = shifts.find((sh) => sh.entry.id === id);
      await updateRecord(
        shift.entry.id,
        { dateTime: entryM.toISOString() },
        token
      );
      await updateRecord(
        shift.exit.id,
        { dateTime: exitM.toISOString() },
        token
      );
      setRecords(await fetchRecords(token));
      setEditModeById((m) => ({ ...m, [id]: false }));
    } catch (err) {
      console.error(err);
      alert("error saving the changes");
    }
  };

  const handleDelete = async (id) => {
    const shift = shifts.find((sh) => sh.entry.id === id);
    if (!window.confirm("Delete this shift?")) return;
    try {
      const token = localStorage.getItem("token");
      await deleteRecord(shift.entry.id, token);
      await deleteRecord(shift.exit.id, token);
      setRecords(await fetchRecords(token));
    } catch (err) {
      console.error(err);
      alert("error deleting the shift");
    }
  };

  const handleShowCurrentlyWorking = async (id) => {
    setShowCurrentlyWorking(!showCurrentlyWorking);
  };

  const activeCount = useMemo(() => countActiveEmployees(records), [records]);
  const activeUsers = useMemo(() => getActiveEmployees(records), [records]);

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
          Admin Panel
        </h2>
        <button
          onClick={onLogout}
          className="cursor-pointer bg-[#FF6600] hover:bg-[#cc3600] text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Logout
        </button>
      </div>

      <ClockComponent />
      <div className="mb-6 flex items-center justify-center  bg-white border-gray-200 dark:border-gray-700  rounded-xl shadow-lg  max-w-xs mx-auto">
        <span className="text-base font-medium text-gray-700 dark:text-gray-300">
          Currently working
        </span>
        <span className="flex items-center justify-center w-10 h-10 bg-indigo-50 dark:bg-indigo-900  text-indigo-600 dark:text-indigo-300 font-bold text-xl rounded-full">
          {activeCount}
        </span>
      </div>

      {showCurrentlyWorking ? (
        <div>
          <button
            onClick={() => handleShowCurrentlyWorking()}
            className="cursor-pointer bg-[#FF6600] hover:bg-[#cc3600] text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            hide currently working
          </button>
          <span>
            <ul className="space-y-4">
              {activeUsers.map(({ dateTime, username, id }) => (
                <li
                  key={id}
                  className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center shadow-lg"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>{username}</strong> <span>is working since</span>{" "}
                    <span>{formatDate(dateTime)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </span>
        </div>
      ) : (
        <button
          onClick={() => handleShowCurrentlyWorking()}
          className="cursor-pointer bg-[#FF6600] hover:bg-[#cc3600] text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          show currently working
        </button>
      )}

      <div className="mt-6 items-center space-x-3">
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
          Shifts
        </h3>
        <ul className="space-y-4">
          {shifts.map(({ entry, exit, duration }) => (
            <li
              key={entry.id}
              className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center shadow-lg"
            >
              {!editModeById[entry.id] ? (
                <>
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
                  {role === "admin" && (
                    <div className="flex flex-col items-center w-24 space-y-2">
                      <button
                        onClick={() => handleEdit(entry.id)}
                        className="cursor-pointer bg-[#0066CC] hover:bg-[#0030cc] text-white text-sm font-medium px-3 py-1 rounded w-full"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="cursor-pointer bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1 rounded w-full"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="date"
                    value={selectedById[entry.id]?.datePart || ""}
                    onChange={(e) =>
                      setSelectedById((s) => ({
                        ...s,
                        [entry.id]: {
                          ...s[entry.id],
                          datePart: e.target.value,
                        },
                      }))
                    }
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    step="2"
                    value={selectedById[entry.id]?.timePart || ""}
                    onChange={(e) =>
                      setSelectedById((s) => ({
                        ...s,
                        [entry.id]: {
                          ...s[entry.id],
                          timePart: e.target.value,
                        },
                      }))
                    }
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <span>–</span>
                  <input
                    type="date"
                    value={selectedById[entry.id]?.exitDatePart || ""}
                    onChange={(e) =>
                      setSelectedById((s) => ({
                        ...s,
                        [entry.id]: {
                          ...s[entry.id],
                          exitDatePart: e.target.value,
                        },
                      }))
                    }
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    step="2"
                    value={selectedById[entry.id]?.exitTimePart || ""}
                    onChange={(e) =>
                      setSelectedById((s) => ({
                        ...s,
                        [entry.id]: {
                          ...s[entry.id],
                          exitTimePart: e.target.value,
                        },
                      }))
                    }
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-col items-center w-24 space-y-2">
                    <button
                      onClick={() => handleSave(entry.id)}
                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-1 rounded w-full"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleCancel(entry.id)}
                      className="bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium px-3 py-1 rounded w-full"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
