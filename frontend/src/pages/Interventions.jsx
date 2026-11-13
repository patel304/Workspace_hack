import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const initialForm = {
  employee_id: "",
  intervention_type: "manager_conversation",
  priority: "medium",
  explanation: "",
};

const typeLabels = {
  manager_conversation: "Manager Check-in",
  workload_review: "Workload Review",
  career_discussion: "Career Discussion",
  hr_support: "HR Support",
};

function StatusBadge({ value }) {
  const status = String(value || "pending").toLowerCase();
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    reviewed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function Interventions() {
  const [employees, setEmployees] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData(showLoader = true) {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const [employeeRes, interventionRes] = await Promise.all([
        fetch(`${API_URL}/employees?page=1&limit=100`),
        fetch(`${API_URL}/interventions`),
      ]);
      const employeeData = await employeeRes.json().catch(() => ({}));
      const interventionData = await interventionRes.json().catch(() => ({}));
      if (!employeeRes.ok) throw new Error(employeeData.error || "Unable to load employees.");
      if (!interventionRes.ok) throw new Error(interventionData.error || "Unable to load intervention history.");
      setEmployees(employeeData.employees || []);
      setInterventions(interventionData.interventions || []);
    } catch (err) {
      setError(err.message || "Unable to load intervention data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filteredInterventions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return interventions.filter((item) => {
      const employeeName = `${item.first_name || ""} ${item.last_name || ""}`.trim();
      const matchesSearch = !term ||
        String(item.employee_id || "").toLowerCase().includes(term) ||
        employeeName.toLowerCase().includes(term) ||
        String(item.explanation || "").toLowerCase().includes(term) ||
        String(typeLabels[item.intervention_type] || item.intervention_type || "").toLowerCase().includes(term);
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      const matchesStatus = statusFilter === "all" || item.review_status === statusFilter;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [interventions, search, priorityFilter, statusFilter]);

  const summary = {
    total: interventions.length,
    pending: interventions.filter((i) => i.review_status === "pending").length,
    completed: interventions.filter((i) => i.review_status === "completed").length,
  };

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_URL}/interventions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: form.employee_id,
          intervention_type: form.intervention_type,
          priority: form.priority,
          explanation: form.explanation.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || "Failed to create intervention.");
      setSuccess("Intervention created successfully!");
      setForm(initialForm);
      await loadData(false);
    } catch (err) {
      setError(err.message || "Failed to create intervention.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total Interventions", summary.total],
          ["Pending Review", summary.pending],
          ["Completed", summary.completed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-800">{value.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Create Supportive Intervention</h3>
        <p className="mt-1 text-sm text-slate-500">Record human-reviewed retention support actions.</p>

        {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Select Employee
              <select name="employee_id" value={form.employee_id} onChange={handleChange} className={`${fieldClass} mt-2`} required>
                <option value="">Choose employee</option>
                {employees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.first_name} {employee.last_name} — {employee.employee_id}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Intervention Type
              <select name="intervention_type" value={form.intervention_type} onChange={handleChange} className={`${fieldClass} mt-2`} required>
                <option value="manager_conversation">Manager Check-in</option>
                <option value="workload_review">Workload Review</option>
                <option value="career_discussion">Career Discussion</option>
                <option value="hr_support">HR Support</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Priority
              <select name="priority" value={form.priority} onChange={handleChange} className={`${fieldClass} mt-2`} required>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium">
            Description
            <textarea name="explanation" value={form.explanation} onChange={handleChange} rows={4} minLength={5} maxLength={500} required placeholder="Describe the supportive action planned..." className={`${fieldClass} mt-2`} />
            <span className="mt-1 block text-right text-xs font-normal text-slate-500">{form.explanation.length}/500</span>
          </label>

          <button type="submit" disabled={saving || loading || employees.length === 0} className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Create Intervention"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Intervention History</h3>
              <p className="mt-1 text-sm text-slate-500">{filteredInterventions.length} of {interventions.length} records displayed</p>
            </div>
            <button type="button" onClick={() => loadData()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Refresh</button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee ID, name, type or description..." className={fieldClass} />
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={fieldClass}>
              <option value="all">All priorities</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={fieldClass}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? <p className="p-8 text-center text-slate-500">Loading interventions...</p> :
          filteredInterventions.length === 0 ? <p className="p-8 text-center text-slate-500">No matching interventions found.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {["Employee", "Type", "Description", "Priority", "Review Status", "Date"].map((heading) => <th key={heading} className="whitespace-nowrap p-4">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInterventions.map((item) => (
                  <tr key={item.intervention_id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap p-4">
                      <div className="font-medium">{item.first_name} {item.last_name}</div>
                      <div className="text-xs text-slate-500">{item.employee_id}</div>
                    </td>
                    <td className="whitespace-nowrap p-4">{typeLabels[item.intervention_type] || item.intervention_type}</td>
                    <td className="max-w-sm p-4 text-slate-600">{item.explanation}</td>
                    <td className="p-4"><StatusBadge value={item.priority} /></td>
                    <td className="p-4"><StatusBadge value={item.review_status} /></td>
                    <td className="whitespace-nowrap p-4 text-slate-500">{item.created_date ? new Date(item.created_date).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  );
}