import { useEffect, useMemo, useState } from "react";
import Interventions from "./pages/Interventions";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const PAGE_SIZE = 10;

async function getJson(path) {
  const response = await fetch(`${API_URL}${path}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }
  return data;
}

function Card({ label, value, note }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-800">{value ?? "—"}</p>
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function DataTable({ title, columns, rows, empty = "No records available." }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{rows.length} records displayed</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>{columns.map((c) => <th key={c} className="px-5 py-4 font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-5 py-8 text-center text-slate-500">{empty}</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {row.map((cell, j) => <td key={j} className="max-w-sm break-words px-5 py-4">{cell ?? "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Pager({ page, total, limit, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">
        Showing {total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
      </span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
        <span className="px-2 py-2">Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

function MetricBar({ label, value, max = 1 }) {
  const pct = Math.max(0, Math.min(100, (Number(value || 0) / max) * 100));
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><strong>{(Number(value || 0) * 100).toFixed(2)}%</strong></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function App() {
  const navigation = ["Dashboard", "Employees", "Retention Priorities", "Interventions", "Analytics", "Model Performance", "Data Quality", "System Health"];
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [priorities, setPriorities] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [prioritySearch, setPrioritySearch] = useState("");
  const [priorityPage, setPriorityPage] = useState(1);
  const [priorityTotal, setPriorityTotal] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [quality, setQuality] = useState(null);
  const [health, setHealth] = useState({ loading: true, api: false, database: false, message: "Checking services..." });
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    getJson("/dashboard")
      .then(setDashboard)
      .catch((e) => setDashboardError(e.message));
  }, []);

  useEffect(() => {
    if (activeTab !== "Employees") return;
    let cancelled = false;
    setPageLoading(true); setPageError("");
    getJson(`/employees?page=${employeePage}&limit=${PAGE_SIZE}&search=${encodeURIComponent(employeeSearch)}`)
      .then((data) => { if (!cancelled) { setEmployees(data.employees || []); setEmployeeTotal(Number(data.total || 0)); } })
      .catch((e) => { if (!cancelled) setPageError(e.message); })
      .finally(() => { if (!cancelled) setPageLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, employeePage, employeeSearch]);

  useEffect(() => {
    if (activeTab !== "Retention Priorities") return;
    let cancelled = false;
    setPageLoading(true); setPageError("");
    const filter = priorityFilter === "all" ? "" : `&priority=${priorityFilter}`;
    getJson(`/retention/priorities?page=${priorityPage}&limit=${PAGE_SIZE}${filter}`)
      .then((data) => {
        if (!cancelled) {
          const rows = data.employees || [];
          setPriorities(rows.filter((r) => String(r.employee_id || "").toLowerCase().includes(prioritySearch.toLowerCase())));
          setPriorityTotal(Number(data.total || 0));
        }
      })
      .catch((e) => { if (!cancelled) setPageError(e.message); })
      .finally(() => { if (!cancelled) setPageLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, priorityPage, priorityFilter, prioritySearch]);

  useEffect(() => {
    if (activeTab !== "Analytics") return;
    setPageLoading(true); setPageError("");
    getJson("/analytics/summary").then(setAnalytics).catch((e) => setPageError(e.message)).finally(() => setPageLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "Model Performance") return;
    setPageLoading(true); setPageError("");
    getJson("/metrics/model").then(setMetrics).catch((e) => setPageError(e.message)).finally(() => setPageLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "Data Quality" && activeTab !== "System Health") return;
    setPageLoading(true); setPageError("");
    getJson("/data-quality").then(setQuality).catch((e) => setPageError(e.message)).finally(() => setPageLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "System Health") return;
    setHealth({ loading: true, api: false, database: false, message: "Checking services..." });
    getJson("/dashboard")
      .then(() => setHealth({ loading: false, api: true, database: true, message: "Dashboard query completed successfully." }))
      .catch((e) => setHealth({ loading: false, api: false, database: false, message: e.message }));
  }, [activeTab]);

  const cards = useMemo(() => [
    ["Total Employees", dashboard?.total_employees],
    ["High Priority", dashboard?.high_priority],
    ["Medium Priority", dashboard?.medium_priority],
    ["Low Priority", dashboard?.low_priority],
  ], [dashboard]);

  const reviewed = Number(dashboard?.employees_reviewed || 0);
  const priorityDistribution = [
    ["High", Number(dashboard?.high_priority || 0), "bg-red-500"],
    ["Medium", Number(dashboard?.medium_priority || 0), "bg-amber-500"],
    ["Low", Number(dashboard?.low_priority || 0), "bg-green-500"],
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 md:flex">
      <aside className="w-full bg-slate-950 p-5 text-white md:min-h-screen md:w-64">
        <div className="mb-8"><h1 className="text-xl font-bold">WorkforceIQ</h1><p className="mt-1 text-xs text-slate-400">Retention Intelligence System</p></div>
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {navigation.map((item) => <button key={item} onClick={() => setActiveTab(item)} className={`whitespace-nowrap rounded-lg px-4 py-3 text-left text-sm transition ${activeTab === item ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>{item}</button>)}
        </nav>
        <div className="mt-10 hidden rounded-xl bg-slate-900 p-4 md:block"><p className="text-xs text-slate-400">System status</p><p className="mt-2 flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 rounded-full bg-green-400" />Operational checks available</p></div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8"><p className="text-sm text-slate-500">Workforce Analytics</p><h2 className="mt-1 text-2xl font-bold">{activeTab}</h2></header>

        {dashboardError && activeTab === "Dashboard" && <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-700">{dashboardError}</div>}
        {pageError && <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-700">{pageError}</div>}
        {pageLoading && activeTab !== "Dashboard" && activeTab !== "Interventions" && <div className="mb-4 text-sm text-slate-500">Loading {activeTab.toLowerCase()}...</div>}

        {activeTab === "Dashboard" && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <Card key={label} label={label} value={value === undefined ? "—" : Number(value).toLocaleString()} />)}</section>
            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="rounded-xl border bg-white p-6 xl:col-span-2"><h3 className="font-semibold">Retention Priority Overview</h3><p className="mt-1 text-sm text-slate-500">Rule-based employee priority distribution.</p>{priorityDistribution.map(([label, value, color]) => <div key={label} className="mt-6"><div className="mb-2 flex justify-between text-sm"><span>{label}</span><strong>{value.toLocaleString()}</strong></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${color}`} style={{ width: `${reviewed ? (value / reviewed) * 100 : 0}%` }} /></div></div>)}</div>
              <div className="rounded-xl border bg-white p-6"><h3 className="font-semibold">Data Snapshot</h3><div className="mt-5 space-y-4 text-sm"><p className="flex justify-between"><span>Employees reviewed</span><strong>{dashboard?.employees_reviewed?.toLocaleString() ?? "—"}</strong></p><p className="flex justify-between"><span>Missing surveys</span><strong>{dashboard?.missing_surveys?.toLocaleString() ?? "—"}</strong></p><p className="flex justify-between"><span>Voluntary exits</span><strong>{dashboard?.voluntary_exits?.toLocaleString() ?? "—"}</strong></p></div></div>
            </section>
          </>
        )}

        {activeTab === "Employees" && (
          <div className="space-y-4">
            <input value={employeeSearch} onChange={(e) => { setEmployeeSearch(e.target.value); setEmployeePage(1); }} placeholder="Search employee ID, first name or last name..." className="w-full rounded-lg border bg-white px-4 py-3 sm:max-w-xl" />
            <DataTable title="Employee Directory" columns={["Employee ID", "Name", "Team", "Role", "Status"]} rows={employees.map((e) => [e.employee_id, `${e.first_name} ${e.last_name}`, e.team_name, e.role_title, e.employment_status])} />
            <Pager page={employeePage} total={employeeTotal} limit={PAGE_SIZE} onPage={setEmployeePage} />
          </div>
        )}

        {activeTab === "Retention Priorities" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input value={prioritySearch} onChange={(e) => { setPrioritySearch(e.target.value); setPriorityPage(1); }} placeholder="Search current page by employee ID..." className="flex-1 rounded-lg border bg-white px-4 py-3" />
              <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPriorityPage(1); }} className="rounded-lg border bg-white px-4 py-3"><option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
            </div>
            <DataTable title="Retention Priority Assessment" columns={["Employee ID", "Priority", "Score", "Reasons"]} rows={priorities.map((p) => [p.employee_id, p.priority, p.score, p.reasons?.join(", ") || "—"])} />
            <Pager page={priorityPage} total={priorityTotal} limit={PAGE_SIZE} onPage={setPriorityPage} />
            <p className="text-xs text-slate-500">Employee ID search filters the currently loaded page. Use pagination to browse other pages.</p>
          </div>
        )}

        {activeTab === "Interventions" && <Interventions />}

        {activeTab === "Analytics" && analytics && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-3">
              <Card label="Teams analyzed" value={analytics.teams?.length ?? 0} />
              <Card label="Voluntary exits" value={analytics.attrition?.find((x) => x.attrition_type === "voluntary")?.total ?? 0} />
              <Card label="Monthly periods" value={analytics.monthly?.length ?? 0} />
            </section>
            <DataTable title="Team Attrition Analysis" columns={["Team", "Employees", "Voluntary Exits", "Exit Rate"]} rows={(analytics.teams || []).map((t) => [t.team_name, Number(t.employees).toLocaleString(), t.voluntary_exits, `${t.employees ? (100 * t.voluntary_exits / t.employees).toFixed(2) : "0.00"}%`])} />
            <DataTable title="Attrition Outcome Distribution" columns={["Outcome", "Employees"]} rows={(analytics.attrition || []).map((x) => [x.attrition_type, x.total])} />
            <DataTable title="Monthly Voluntary Exits" columns={["Month", "Exits"]} rows={(analytics.monthly || []).map((x) => [x.month, x.exits])} />
          </div>
        )}

        {activeTab === "Model Performance" && metrics && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card label="Records evaluated" value={Number(metrics.evaluated || 0).toLocaleString()} />
              <Card label="Actual exits" value={metrics.actual_exits ?? 0} />
              <Card label="Prediction horizon" value={`${metrics.horizon_months} months`} />
              <Card label="Prediction date" value={metrics.prediction_date} />
            </section>
            {[["High priority only", metrics.high_only], ["Medium + High priority", metrics.medium_high]].map(([name, m]) => m && (
              <section key={name} className="rounded-xl border bg-white p-6"><h3 className="font-semibold">{name}</h3><div className="mt-4 grid gap-4 sm:grid-cols-3"><Card label="Precision" value={`${(m.precision * 100).toFixed(2)}%`} /><Card label="Recall" value={`${(m.recall * 100).toFixed(2)}%`} /><Card label="F1-score" value={`${(m.f1_score * 100).toFixed(2)}%`} /></div><div className="mt-5 grid gap-2 text-sm sm:grid-cols-4">{[["True positives", m.tp], ["False positives", m.fp], ["True negatives", m.tn], ["False negatives", m.fn]].map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">{k}</p><strong>{v}</strong></div>)}</div></section>
            ))}
            <DataTable title="Priority Distribution" columns={["Priority", "Employees"]} rows={Object.entries(metrics.priority_distribution || {}).map(([k, v]) => [k, v])} />
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">{metrics.note || "Retrospective evaluation on synthetic data."}</p>
          </div>
        )}

        {activeTab === "Data Quality" && quality && (
          <div className="space-y-4">
            <Card label="Overall data quality" value={quality.passed ? "Passed" : "Needs attention"} />
            <DataTable title="Data Quality Checks" columns={["Check", "Result"]} rows={[["Foreign-key errors", quality.foreign_key_errors], ["Missing surveys", quality.missing_surveys], ["Invalid termination dates", quality.invalid_termination_dates]]} />
          </div>
        )}

        {activeTab === "System Health" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card label="Backend API" value={health.loading ? "Checking..." : health.api ? "Reachable" : "Unavailable"} note={health.message} />
            <Card label="MySQL database" value={health.loading ? "Checking..." : health.database ? "Query succeeded" : "Not verified"} note="Database status is inferred from a successful dashboard query." />
            <div className="sm:col-span-2 rounded-xl border bg-white p-5"><h3 className="font-semibold">Data integrity</h3><p className="mt-2 text-sm text-slate-600">{quality ? (quality.passed ? "Data quality checks passed." : "Data quality checks need attention.") : "Open Data Quality to run integrity checks."}</p></div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
