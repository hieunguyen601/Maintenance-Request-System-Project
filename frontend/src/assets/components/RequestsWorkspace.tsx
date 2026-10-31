import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  ArrowUpRight,
} from "lucide-react";
import api from "../../services/api";
import type { Role, User, WorkRequest } from "../../services/types";
import { errorMessage, label, dateTime } from "../../services/errors";
import RequestDetails from "./RequestDetails";

export default function RequestsWorkspace({
  role,
  overview = false,
}: {
  role: Role;
  overview?: boolean;
}) {
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<WorkRequest[]>("/requests");
      setRequests(response.data);
      if (role === "manager")
        setWorkers((await api.get<User[]>("/manager/workers")).data);
    } catch (err) {
      setError(
        errorMessage(
          err,
          "Could not load requests. Check the backend connection.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [role]);
  useEffect(() => {
    void load();
  }, [load]);
  const update = async (requestId: number, url: string, data: object) => {
    setUpdating(requestId);
    setError("");
    try {
      await api.patch(url, data);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUpdating(null);
    }
  };
  const filtered = requests
    .filter(
      (request) =>
        (status === "all" || request.status === status) &&
        (priority === "all" || request.priority === priority) &&
        `${request.title} ${request.category} ${request.unit_number} ${request.building} ${request.tenant_first_name} ${request.tenant_last_name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? Date.parse(a.created_at) - Date.parse(b.created_at)
        : sort === "priority"
          ? ["high", "medium", "low"].indexOf(a.priority) -
            ["high", "medium", "low"].indexOf(b.priority)
          : Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  const shown = overview ? filtered.slice(0, 6) : filtered;
  const stats = [
    {
      label: "Total requests",
      count: requests.length,
    },
    {
      label: "Awaiting service",
      count: requests.filter((r) =>
        ["pending", "assigned", "submitted"].includes(r.status),
      ).length,
    },
    {
      label: "In progress",
      count: requests.filter((r) => r.status === "in_progress").length,
    },
    {
      label: "Completed",
      count: requests.filter((r) => r.status === "completed").length,
    },
  ];
  const title = overview
    ? role === "tenant"
      ? "Overview"
      : role === "manager"
        ? "Property overview"
        : "Work overview"
    : role === "tenant"
      ? "My requests"
      : role === "manager"
        ? "All maintenance requests"
        : "Assigned requests";
  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            {role === "tenant"
              ? "Maintenance Services"
              : role === "manager"
                ? "Property management"
                : "Maintenance Services"}
          </span>
          <h1>{title}</h1>
          <p className="muted">
            {role === "tenant"
              ? "View your maintenance requests and updates."
              : role === "manager"
                ? "Review open requests and manage staff assignments."
                : "View assigned requests and update your progress."}
          </p>
        </div>
        <div className="button-row">
          <button
            className="secondary-button"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          {role === "tenant" && (
            <Link className="primary-button" to="/tenant/requests/new">
              <Plus size={17} /> New request
            </Link>
          )}
        </div>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button onClick={() => void load()}>Retry</button>
        </div>
      )}
      <div className="metrics-grid">
        {stats.map(({ label: title, count }) => (
          <div className="metric" key={title}>
            <span className="metric-label">{title}</span>
            <strong>{loading ? "—" : count}</strong>
          </div>
        ))}
      </div>
      <section className="workspace-card">
        <div className="card-heading">
          <div>
            <h2>{overview ? "Recent requests" : "Maintenance requests"}</h2>
            <p className="muted">
              {loading
                ? "Loading…"
                : `${filtered.length} ${filtered.length === 1 ? "request" : "requests"}`}
            </p>
          </div>
          {overview && (
            <Link className="text-link" to={`/${role}/requests`}>
              View all <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
        {!overview && (
          <div className="workspace-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input
                aria-label="Search requests"
                placeholder="Search requests, category, or unit…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              {["pending", "assigned", "in_progress", "completed"].map(
                (value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ),
              )}
            </select>
            <select
              aria-label="Filter priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="all">All priorities</option>
              {["high", "medium", "low"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort requests"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Highest priority</option>
            </select>
          </div>
        )}
        {loading ? (
          <div className="empty-state" role="status">
            Loading requests…
          </div>
        ) : !shown.length ? (
          <div className="empty-state">
            <ClipboardList size={36} />
            <h3>
              {requests.length ? "No matching requests" : "No requests yet"}
            </h3>
            <p>
              {requests.length
                ? "Try another search or filter."
                : role === "tenant"
                  ? "Submit your first request when something needs attention."
                  : "New work orders will appear here."}
            </p>
          </div>
        ) : (
          <div className="workspace-table-wrap">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>{role === "manager" ? "Assignment" : "Assigned to"}</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <button
                        className="request-link"
                        onClick={() => setSelected(request.id)}
                      >
                        {request.title}
                      </button>
                      <span className="cell-note">
                        #{request.id} · {request.category} ·{" "}
                        {dateTime(request.created_at)}
                      </span>
                    </td>
                    <td>
                      {request.building}
                      <span className="cell-note">
                        Unit {request.unit_number}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`work-badge priority-${request.priority}`}
                      >
                        {request.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`work-badge status-${request.status}`}>
                        {label(request.status)}
                      </span>
                    </td>
                    <td>
                      {role === "manager" ? (
                        <select
                          aria-label={`Assign request ${request.id}`}
                          disabled={
                            updating !== null || request.status === "completed"
                          }
                          value={request.assigned_to || ""}
                          onChange={(e) =>
                            void update(
                              request.id,
                              `/manager/requests/${request.id}/assign`,
                              {
                                assigned_to: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              },
                            )
                          }
                        >
                          <option value="">Unassigned</option>
                          {workers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.first_name} {worker.last_name}
                            </option>
                          ))}
                        </select>
                      ) : request.worker_first_name ? (
                        `${request.worker_first_name} ${request.worker_last_name}`
                      ) : (
                        "Awaiting assignment"
                      )}
                    </td>
                    <td>
                      <div className="button-row">
                        {role === "maintenance" &&
                          request.status !== "completed" && (
                            <button
                              className="primary-button small"
                              disabled={updating !== null}
                              onClick={() =>
                                void update(
                                  request.id,
                                  `/maintenance/requests/${request.id}/status`,
                                  {
                                    status:
                                      request.status === "in_progress"
                                        ? "completed"
                                        : "in_progress",
                                  },
                                )
                              }
                            >
                              {updating === request.id
                                ? "Saving…"
                                : request.status === "in_progress"
                                  ? "Complete"
                                  : "Start work"}
                            </button>
                          )}
                        <button
                          className="secondary-button small"
                          onClick={() => setSelected(request.id)}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selected !== null && (
        <RequestDetails
          key={selected}
          requestId={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
