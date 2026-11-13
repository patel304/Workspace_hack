import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [dashboardRes, employeesRes, prioritiesRes] = await Promise.all([
          fetch(`${API_URL}/dashboard`),
          fetch(`${API_URL}/employees?page=1&limit=10`),
          fetch(`${API_URL}/retention/priorities`),
        ]);

        if (!dashboardRes.ok || !employeesRes.ok || !prioritiesRes.ok) {
          throw new Error("Unable to load dashboard data.");
        }

        const [dashboardData, employeeData, priorityData] = await Promise.all([
          dashboardRes.json(),
          employeesRes.json(),
          prioritiesRes.json(),
        ]);

        setDashboard(dashboardData);
        setEmployees(
          Array.isArray(employeeData)
            ? employeeData
            : employeeData.employees || []
        );
        setPriorities(
          Array.isArray(priorityData)
            ? priorityData
            : priorityData.priorities || []
        );
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const navigation = [
    "Dashboard",
    "Employees",
    "Retention Priorities",
    "Interventions",
    "Data Quality",
  ];

  const highPriority = priorities.filter(
    (item) => item.priority === "high"
  ).length;

  const mediumPriority = priorities.filter(
    (item) => item.priority === "medium"
  ).length;

  const lowPriority = priorities.filter(
    (item) => item.priority === "low"
  ).length;

  const cards = [
    {
      label: "Total Employees",
      value: dashboard?.totalEmployees ?? "—",
      color: "text-blue-600",
      icon: "👥",
    },
    {
      label: "High Priority",
      value: dashboard?.highPriority ?? highPriority,
      color: "text-red-600",
      icon: "⚠️",
    },
    {
      label: "Medium Priority",
      value: dashboard?.mediumPriority ?? mediumPriority,
      color: "text-amber-600",
      icon: "📊",
    },
    {
      label: "Low Priority",
      value: dashboard?.lowPriority ?? lowPriority,
      color: "text-green-600",
      icon: "✓",
    },
  ];

  const filteredPriorities = priorities.filter((item) => {
    const matchesSearch = item.employee_id
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesPriority =
      priorityFilter === "all" || item.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 md:flex">
      <aside className="w-full bg-slate-950 p-5 text-white md:min-h-screen md:w-64">
        <div className="mb-8">
          <h1 className="text-xl font-bold">WorkforceIQ</h1>
          <p className="mt-1 text-xs text-slate-400">
            Retention Intelligence System
          </p>
        </div>

        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {navigation.map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              className={`whitespace-nowrap rounded-lg px-4 py-3 text-left text-sm transition ${
                activeTab === item
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-10 hidden rounded-xl bg-slate-900 p-4 md:block">
          <p className="text-xs text-slate-400">System status</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Dashboard connected
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Workforce Analytics</p>
            <h2 className="mt-1 text-2xl font-bold">{activeTab}</h2>
          </div>
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            ● Demo Environment
          </span>
        </header>

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading workforce data...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            {error}
            <button
              onClick={() => window.location.reload()}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === "Dashboard" && (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {cards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">{card.label}</p>
                        <span className="text-xl">{card.icon}</span>
                      </div>
                      <p className={`mt-4 text-3xl font-bold ${card.color}`}>
                        {card.value}
                      </p>
                    </div>
                  ))}
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-2">
                    <h3 className="font-semibold">
                      Retention Priority Overview
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Employees grouped by rule-based priority.
                    </p>

                    {[
                      ["High", highPriority, "bg-red-500"],
                      ["Medium", mediumPriority, "bg-amber-500"],
                      ["Low", lowPriority, "bg-green-500"],
                    ].map(([label, value, color]) => {
                      const total = Math.max(priorities.length, 1);
                      const percentage = (value / total) * 100;

                      return (
                        <div key={label} className="mt-6">
                          <div className="mb-2 flex justify-between text-sm">
                            <span className="font-medium">{label}</span>
                            <span className="text-slate-500">{value}</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${color}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <h3 className="font-semibold">Data Snapshot</h3>
                    <div className="mt-5 space-y-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Employees loaded</span>
                        <strong>{employees.length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Priorities loaded
                        </span>
                        <strong>{priorities.length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Missing surveys</span>
                        <strong>{dashboard?.missingSurveys ?? "—"}</strong>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeTab === "Employees" && (
              <DataTable
                title="Employee Directory"
                columns={["Employee ID", "Name", "Team", "Role", "Status"]}
                rows={employees.map((employee) => [
                  employee.employee_id,
                  employee.employee_name || employee.name || "—",
                  employee.team_name || employee.team || "—",
                  employee.role_name || employee.role || "—",
                  employee.employment_status || employee.status || "—",
                ])}
              />
            )}

            {activeTab === "Retention Priorities" && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    placeholder="Search employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="all">All priorities</option>
                    <option value="high">High priority</option>
                    <option value="medium">Medium priority</option>
                    <option value="low">Low priority</option>
                  </select>
                </div>

                <DataTable
                  title="Retention Priority Assessment"
                  columns={["Employee ID", "Priority", "Score", "Explanation"]}
                  rows={filteredPriorities.map((item) => [
                    item.employee_id,
                    item.priority,
                    item.score ?? item.priority_score ?? "—",
                    item.explanation || item.reasons?.join(", ") || "—",
                  ])}
                />
              </div>
            )}

            {activeTab === "Interventions" && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold">Supportive Interventions</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Record supportive, human-reviewed conversations and actions.
                  This system does not make employment decisions.
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  Use the backend POST /api/interventions endpoint to record an
                  intervention.
                </p>
              </div>
            )}

            {activeTab === "Data Quality" && <DataQuality />}
          </>
        )}
      </main>
    </div>
  );
}

function DataTable({ title, columns, rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length} records displayed
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-8 text-center text-slate-500"
                >
                  No records available.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="max-w-xs px-5 py-4">
                      {cellIndex === 1 && columns[1] === "Priority" ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            cell === "high"
                              ? "bg-red-100 text-red-700"
                              : cell === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {cell}
                        </span>
                      ) : (
                        <span className="break-words">{cell}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DataQuality() {
  const [quality, setQuality] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/data-quality`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to fetch data quality.");
        return response.json();
      })
      .then(setQuality)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!quality)
    return <p className="text-slate-500">Checking data quality...</p>;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="font-semibold">Data Quality Checks</h3>
      <p className="mt-3 text-sm text-slate-600">
        Overall status:{" "}
        <strong className={quality.valid ? "text-green-600" : "text-red-600"}>
          {quality.valid ? "Passed" : "Needs attention"}
        </strong>
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-green-300">
        {JSON.stringify(quality, null, 2)}
      </pre>
    </div>
  );
}

export default App;
