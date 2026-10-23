import { useEffect, useState, useMemo } from "react";
import api from "../../../services/api";
import "./AllRequests.css";
import {
    Search,
    RotateCw,
    Clock,
    Wrench,
    CheckCircle2,
    AlertCircle,
    ClipboardList,
    X,
    Building2,
    Calendar,
    Eye,
} from "lucide-react";

export type MaintenanceRequest = {
    id: number;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | string;
    status: "submitted" | "pending" | "in_progress" | "completed" | "cancelled" | string;
    assigned_to: number | string | null;
    created_at: string;
    category: string | null;
    unit_number: string | null;
};

function AllRequests() {
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // Filter & search states
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // Modal state for viewing request details
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            setError("");
            // api baseURL is http://localhost:3000/api, so calling /manager/requests targets /api/manager/requests
            const response = await api.get<MaintenanceRequest[]>("/manager/requests");
            setRequests(response.data);
        } catch (err: any) {
            console.error("Error fetching manager requests:", err);
            const message =
                err.response?.data?.message ||
                "Failed to fetch maintenance requests. Please check your connection or permissions.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Unique categories for the filter dropdown
    const availableCategories = useMemo(() => {
        const catSet = new Set<string>();
        requests.forEach((req) => {
            if (req.category) {
                catSet.add(req.category);
            }
        });
        return Array.from(catSet);
    }, [requests]);

    // Statistics overview
    const stats = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter(
            (r) => r.status === "pending" || r.status === "submitted"
        ).length;
        const inProgress = requests.filter(
            (r) => r.status === "in_progress" || r.status === "in-progress"
        ).length;
        const completed = requests.filter((r) => r.status === "completed").length;

        return { total, pending, inProgress, completed };
    }, [requests]);

    // Filtered requests based on search and selected filters
    const filteredRequests = useMemo(() => {
        return requests.filter((req) => {
            // Status match
            if (statusFilter !== "all") {
                if (statusFilter === "pending") {
                    if (req.status !== "pending" && req.status !== "submitted") return false;
                } else if (statusFilter === "in_progress") {
                    if (req.status !== "in_progress" && req.status !== "in-progress") return false;
                } else if (req.status !== statusFilter) {
                    return false;
                }
            }

            // Priority match
            if (priorityFilter !== "all" && req.priority !== priorityFilter) {
                return false;
            }

            // Category match
            if (categoryFilter !== "all" && req.category !== categoryFilter) {
                return false;
            }

            // Search term match
            if (searchTerm.trim() !== "") {
                const term = searchTerm.toLowerCase();
                const titleMatch = req.title?.toLowerCase().includes(term);
                const descMatch = req.description?.toLowerCase().includes(term);
                const unitMatch = req.unit_number?.toLowerCase().includes(term);
                const catMatch = req.category?.toLowerCase().includes(term);

                if (!titleMatch && !descMatch && !unitMatch && !catMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [requests, statusFilter, priorityFilter, categoryFilter, searchTerm]);

    const hasActiveFilters =
        searchTerm !== "" ||
        statusFilter !== "all" ||
        priorityFilter !== "all" ||
        categoryFilter !== "all";

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setPriorityFilter("all");
        setCategoryFilter("all");
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="all-requests-page">
            {/* Header */}
            <div className="all-requests-header">
                <div>
                    <h1>All Maintenance Requests</h1>
                    <p>Track, filter, and oversee all resident service requests across apartments.</p>
                </div>
                <button
                    type="button"
                    className="refresh-btn"
                    onClick={fetchRequests}
                    disabled={loading}
                    title="Reload requests"
                >
                    <RotateCw size={15} className={loading ? "spin-animation" : ""} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="error-banner">
                    <span>{error}</span>
                    <button type="button" className="retry-btn" onClick={fetchRequests}>
                        Retry
                    </button>
                </div>
            )}

            {/* Top Stat Cards */}
            <div className="manager-stats-grid">
                <div className="manager-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Requests</span>
                        <span className="stat-number">{stats.total}</span>
                    </div>
                    <div className="stat-icon-wrapper stat-icon-blue">
                        <ClipboardList size={22} />
                    </div>
                </div>

                <div className="manager-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Pending Review</span>
                        <span className="stat-number">{stats.pending}</span>
                    </div>
                    <div className="stat-icon-wrapper stat-icon-amber">
                        <Clock size={22} />
                    </div>
                </div>

                <div className="manager-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">In Progress</span>
                        <span className="stat-number">{stats.inProgress}</span>
                    </div>
                    <div className="stat-icon-wrapper stat-icon-indigo">
                        <Wrench size={22} />
                    </div>
                </div>

                <div className="manager-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Completed</span>
                        <span className="stat-number">{stats.completed}</span>
                    </div>
                    <div className="stat-icon-wrapper stat-icon-emerald">
                        <CheckCircle2 size={22} />
                    </div>
                </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="all-requests-toolbar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by title, description, unit, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    {/* Status filter */}
                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>

                    {/* Priority filter */}
                    <select
                        className="filter-select"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                        <option value="all">All Priorities</option>
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                    </select>

                    {/* Category filter */}
                    {availableCategories.length > 0 && (
                        <select
                            className="filter-select"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {availableCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Clear filters button */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            className="clear-filter-btn"
                            onClick={clearFilters}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className="all-requests-card">
                <div className="card-header-bar">
                    <div className="card-title">
                        <span>Requests List</span>
                        <span className="results-count-badge">
                            {filteredRequests.length} {filteredRequests.length === 1 ? "record" : "records"}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="state-container">
                        <RotateCw size={28} className="spin-animation" style={{ color: "#2563eb" }} />
                        <p className="state-desc">Loading maintenance requests...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="state-container">
                        <AlertCircle size={36} style={{ color: "#94a3b8" }} />
                        <h3 className="state-title">No maintenance requests found</h3>
                        <p className="state-desc">
                            {hasActiveFilters
                                ? "No requests match your current filters. Try resetting or adjusting your search criteria."
                                : "There are currently no maintenance requests recorded in the system."}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                className="view-details-btn"
                                onClick={clearFilters}
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="table-scroll-container">
                        <table className="manager-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Request</th>
                                    <th>Unit</th>
                                    <th>Category</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Assigned</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((req) => (
                                    <tr key={req.id}>
                                        <td className="request-id-cell">#{req.id}</td>
                                        <td className="title-cell">
                                            <div className="request-main-title">{req.title}</div>
                                            {req.description && (
                                                <div className="request-sub-desc" title={req.description}>
                                                    {req.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="unit-badge">
                                                {req.unit_number ? `Unit ${req.unit_number}` : "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="category-tag">
                                                {req.category || "General"}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`priority-pill priority-${req.priority?.toLowerCase()}`}
                                            >
                                                {req.priority || "Medium"}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`status-pill status-${req.status?.toLowerCase()}`}
                                            >
                                                {req.status?.replace("_", " ") || "Pending"}
                                            </span>
                                        </td>
                                        <td className="date-cell">
                                            {formatDate(req.created_at)}
                                        </td>
                                        <td className="assigned-cell">
                                            {req.assigned_to ? (
                                                <span className="assigned-badge">
                                                    Tech #{req.assigned_to}
                                                </span>
                                            ) : (
                                                <span className="unassigned-text">Unassigned</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="view-details-btn"
                                                onClick={() => setSelectedRequest(req)}
                                                title="View request details"
                                            >
                                                <Eye size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Request Detail Modal */}
            {selectedRequest && (
                <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
                    <div
                        className="modal-content-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>Request #{selectedRequest.id} Details</h2>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setSelectedRequest(null)}
                                title="Close modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-badges-row">
                                <span
                                    className={`status-pill status-${selectedRequest.status?.toLowerCase()}`}
                                >
                                    {selectedRequest.status?.replace("_", " ")}
                                </span>
                                <span
                                    className={`priority-pill priority-${selectedRequest.priority?.toLowerCase()}`}
                                >
                                    {selectedRequest.priority} Priority
                                </span>
                                <span className="category-tag">
                                    {selectedRequest.category || "General"}
                                </span>
                            </div>

                            <div className="modal-detail-group">
                                <span className="modal-detail-label">Title</span>
                                <div className="modal-detail-value" style={{ fontWeight: 600, fontSize: "16px" }}>
                                    {selectedRequest.title}
                                </div>
                            </div>

                            <div className="modal-grid-2">
                                <div className="modal-detail-group">
                                    <span className="modal-detail-label">Apartment Unit</span>
                                    <div className="modal-detail-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <Building2 size={16} color="#64748b" />
                                        <span>{selectedRequest.unit_number ? `Unit ${selectedRequest.unit_number}` : "Not Assigned"}</span>
                                    </div>
                                </div>

                                <div className="modal-detail-group">
                                    <span className="modal-detail-label">Date Submitted</span>
                                    <div className="modal-detail-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <Calendar size={16} color="#64748b" />
                                        <span>{formatDate(selectedRequest.created_at)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-detail-group">
                                <span className="modal-detail-label">Assigned Technician</span>
                                <div className="modal-detail-value">
                                    {selectedRequest.assigned_to ? (
                                        <span className="assigned-badge">Technician #{selectedRequest.assigned_to}</span>
                                    ) : (
                                        <span className="unassigned-text">Currently Unassigned</span>
                                    )}
                                </div>
                            </div>

                            <div className="modal-detail-group">
                                <span className="modal-detail-label">Description</span>
                                <div className="modal-detail-description">
                                    {selectedRequest.description || "No description provided."}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="modal-btn-secondary"
                                onClick={() => setSelectedRequest(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AllRequests;
