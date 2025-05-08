import Clock from "react-live-clock";

export default function ClockComponent() {
  return (
    <div className="max-w-xs mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center mb-3">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Current time in Germany
      </p>
      <Clock
        format="DD-MM-YYYY HH:mm:ss"
        ticking={true}
        timezone="Europe/Berlin"
        className="text-2xl font-mono text-gray-800 dark:text-gray-100"
      />
    </div>
  );
}
