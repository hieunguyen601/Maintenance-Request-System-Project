import { useEffect, useState, useMemo } from "react";
import api from "../../../services/api";
import {
    Wrench,
    CheckCircle2,
    Clock,
    Play,
    Search,
    RefreshCw,
    Eye,
    MapPin,
    Layers,
    Check,
} from "lucide-react";
import "./AssignedRequests.css";

type MaintenanceRequest = {
    id: number;
    title: string;
    description?: string | null;
    priority: "high" | "medium" | "low" | string;
    status: "pending" | "submitted" | "assigned" | "in_progress" | "completed" | string;
    created_at: string;
    category: string | null;
    unit_number: string | null;
    building: string | null;
};

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

function AssignedRequests() {
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
    const [toast, setToast] = useState<ToastState>(null);

    // Filters and sorting
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");

    const fetchAssignedRequests = async (isManualRefresh = false) => {
        if (isManualRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await api.get<MaintenanceRequest[]>("/maintenance/assigned");
            setRequests(response.data || []);
            // Update selectedRequest if modal is open
            if (selectedRequest) {
                const updated = (response.data || []).find((r) => r.id === selectedRequest.id);
                if (updated) setSelectedRequest(updated);
            }
        } catch (error: any) {
            console.error("Failed to fetch assigned requests:", error);
            showToast("error", error?.response?.data?.message || "Failed to load assigned requests.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAssignedRequests();
    }, []);

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
        setTimeout(() => {
            setToast((current) => (current?.message === message ? null : current));
        }, 4000);
    };

    const handleUpdateStatus = async (requestId: number, nextStatus: "in_progress" | "completed") => {
        setUpdatingId(requestId);
        try {
            const response = await api.patch(`/maintenance/requests/${requestId}/status`, {
                status: nextStatus,
            });

            const updatedRequest: MaintenanceRequest = response.data?.request;

            // Optimistically update list
            setRequests((prev) =>
                prev.map((r) => (r.id === requestId ? { ...r, ...updatedRequest, status: nextStatus } : r))
            );

            // Update modal state if open
            if (selectedRequest && selectedRequest.id === requestId) {
                setSelectedRequest((prev) => (prev ? { ...prev, ...updatedRequest, status: nextStatus } : null));
            }

            const actionLabel = nextStatus === "in_progress" ? "started" : "completed";
            showToast("success", `Request #${requestId} has been marked as ${actionLabel}.`);
        } catch (error: any) {
            console.error("Failed to update status:", error);
            showToast(
                "error",
                error?.response?.data?.message || "Unable to update request status. Please try again."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    // Calculate Stats
    const stats = useMemo(() => {
        const total = requests.length;
        const toStart = requests.filter((r) =>
            ["assigned", "pending", "submitted"].includes(r.status.toLowerCase())
        ).length;
        const inProgress = requests.filter((r) => r.status.toLowerCase() === "in_progress").length;
        const completed = requests.filter((r) => r.status.toLowerCase() === "completed").length;

        return { total, toStart, inProgress, completed };
    }, [requests]);

    // Filter and Sort Requests
    const filteredRequests = useMemo(() => {
        return requests
            .filter((req) => {
                const query = searchQuery.trim().toLowerCase();
                const matchesSearch =
                    !query ||
                    req.title.toLowerCase().includes(query) ||
                    (req.description && req.description.toLowerCase().includes(query)) ||
                    (req.unit_number && req.unit_number.toLowerCase().includes(query)) ||
                    (req.building && req.building.toLowerCase().includes(query)) ||
                    (req.category && req.category.toLowerCase().includes(query));

                const reqStatus = req.status.toLowerCase();
                let matchesStatus = true;
                if (statusFilter === "to_start") {
                    matchesStatus = ["assigned", "pending", "submitted"].includes(reqStatus);
                } else if (statusFilter !== "all") {
                    matchesStatus = reqStatus === statusFilter;
                }

                const matchesPriority =
                    priorityFilter === "all" || req.priority.toLowerCase() === priorityFilter.toLowerCase();

                return matchesSearch && matchesStatus && matchesPriority;
            })
            .sort((a, b) => {
                if (sortBy === "newest") {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
                if (sortBy === "oldest") {
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                }
                if (sortBy === "priority") {
                    const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
                    const weightA = priorityWeight[a.priority.toLowerCase()] || 0;
                    const weightB = priorityWeight[b.priority.toLowerCase()] || 0;
                    return weightB - weightA;
                }
                return 0;
            });
    }, [requests, searchQuery, statusFilter, priorityFilter, sortBy]);

    const formatStatusBadge = (status: string) => {
        const normalized = status.toLowerCase();
        if (normalized === "in_progress") {
            return (
                <span className="status-pill status-in_progress">
                    <span className="status-dot pulse" />
                    In Progress
                </span>
            );
        }
        if (normalized === "completed") {
            return (
                <span className="status-pill status-completed">
                    <Check size={12} strokeWidth={3} />
                    Completed
                </span>
            );
        }
        return (
            <span className="status-pill status-assigned">
                <span className="status-dot" />
                To Start
            </span>
        );
    };

    return (
        <div className="assigned-requests-page">
            {/* Header */}
            <div className="assigned-header">
                <div>
                    <h1>Assigned Maintenance Requests</h1>
                    <p>View work orders dispatched to you, start jobs, and update progress</p>
                </div>
                <div className="header-actions">
                    <button
                        type="button"
                        className={`refresh-btn ${refreshing ? "spinning" : ""}`}
                        onClick={() => fetchAssignedRequests(true)}
                        disabled={refreshing || loading}
                    >
                        <RefreshCw size={16} />
                        <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {toast && (
                <div className={`toast-banner toast-${toast.type}`}>
                    <span>{toast.message}</span>
                    <button type="button" className="toast-close" onClick={() => setToast(null)}>
                        ✕
                    </button>
                </div>
            )}

            {/* KPI Stat Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <Layers size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Total Assigned</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon amber">
                        <Clock size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">To Start</span>
                        <span className="stat-value">{stats.toStart}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon indigo">
                        <Wrench size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">In Progress</span>
                        <span className="stat-value">{stats.inProgress}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon emerald">
                        <CheckCircle2 size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Completed</span>
                        <span className="stat-value">{stats.completed}</span>
                    </div>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="assigned-toolbar">
                <div className="search-box">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        className="search-input-field"
                        placeholder="Search by title, unit, building, or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="to_start">To Start</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>

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

                    <select
                        className="filter-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="priority">Priority (High to Low)</option>
                    </select>
                </div>
            </div>

            {/* Main Table Content */}
            <div className="assigned-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <span>Loading your assigned requests...</span>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Wrench size={42} strokeWidth={1.5} />
                        </div>
                        <h3>No assigned requests found</h3>
                        <p>
                            {requests.length === 0
                                ? "You currently don't have any maintenance tasks assigned."
                                : "No requests match the selected search criteria or filters."}
                        </p>
                    </div>
                ) : (
                    <table className="assigned-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title & Details</th>
                                <th>Location</th>
                                <th>Category</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.map((req) => {
                                const isUpdating = updatingId === req.id;
                                const isPending = ["assigned", "pending", "submitted"].includes(
                                    req.status.toLowerCase()
                                );
                                const isInProgress = req.status.toLowerCase() === "in_progress";
                                const isCompleted = req.status.toLowerCase() === "completed";

                                return (
                                    <tr key={req.id}>
                                        <td>
                                            <strong>#{req.id}</strong>
                                        </td>
                                        <td>
                                            <div className="request-title-cell">
                                                <span className="request-title">{req.title}</span>
                                                {req.description && (
                                                    <span className="request-description-preview">
                                                        {req.description}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="unit-badge">
                                                <MapPin size={13} />
                                                {req.unit_number ? `Unit ${req.unit_number}` : "Unit —"}
                                                {req.building ? ` (${req.building})` : ""}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="category-tag">
                                                {req.category || "General"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`priority-pill priority-${req.priority.toLowerCase()}`}>
                                                {req.priority}
                                            </span>
                                        </td>
                                        <td>{formatStatusBadge(req.status)}</td>
                                        <td style={{ color: "#64748b", fontSize: "13px" }}>
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div className="actions-cell" style={{ justifyContent: "flex-end" }}>
                                                {isPending && (
                                                    <button
                                                        type="button"
                                                        className="btn-action btn-start-work"
                                                        onClick={() => handleUpdateStatus(req.id, "in_progress")}
                                                        disabled={isUpdating}
                                                    >
                                                        <Play size={13} fill="currentColor" />
                                                        <span>{isUpdating ? "Starting..." : "Start Work"}</span>
                                                    </button>
                                                )}

                                                {isInProgress && (
                                                    <button
                                                        type="button"
                                                        className="btn-action btn-complete-work"
                                                        onClick={() => handleUpdateStatus(req.id, "completed")}
                                                        disabled={isUpdating}
                                                    >
                                                        <Check size={14} strokeWidth={3} />
                                                        <span>{isUpdating ? "Completing..." : "Complete"}</span>
                                                    </button>
                                                )}

                                                {isCompleted && (
                                                    <span className="badge-completed">
                                                        <CheckCircle2 size={14} />
                                                        Done
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    className="btn-action btn-view-details"
                                                    onClick={() => setSelectedRequest(req)}
                                                    title="View Full Details"
                                                >
                                                    <Eye size={13} />
                                                    <span>Details</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Details Modal */}
            {selectedRequest && (
                <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
                    <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-title">
                                <Wrench size={20} color="#2563eb" />
                                <h2>Request #{selectedRequest.id} Details</h2>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setSelectedRequest(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-info-grid">
                                <div className="modal-info-item">
                                    <span className="info-label">Title</span>
                                    <span className="info-value">{selectedRequest.title}</span>
                                </div>

                                <div className="modal-info-item">
                                    <span className="info-label">Location</span>
                                    <span className="info-value">
                                        {selectedRequest.unit_number ? `Unit ${selectedRequest.unit_number}` : "N/A"}
                                        {selectedRequest.building ? ` • ${selectedRequest.building}` : ""}
                                    </span>
                                </div>

                                <div className="modal-info-item">
                                    <span className="info-label">Category</span>
                                    <span className="info-value">{selectedRequest.category || "General"}</span>
                                </div>

                                <div className="modal-info-item">
                                    <span className="info-label">Priority</span>
                                    <span className="info-value">
                                        <span className={`priority-pill priority-${selectedRequest.priority.toLowerCase()}`}>
                                            {selectedRequest.priority}
                                        </span>
                                    </span>
                                </div>

                                <div className="modal-info-item">
                                    <span className="info-label">Current Status</span>
                                    <span className="info-value">
                                        {formatStatusBadge(selectedRequest.status)}
                                    </span>
                                </div>

                                <div className="modal-info-item">
                                    <span className="info-label">Date Submitted</span>
                                    <span className="info-value">
                                        {new Date(selectedRequest.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="modal-description-box">
                                <span className="info-label">Description</span>
                                <div className="modal-description-text">
                                    {selectedRequest.description || "No description provided."}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setSelectedRequest(null)}
                            >
                                Close
                            </button>

                            <div className="modal-footer-actions">
                                {["assigned", "pending", "submitted"].includes(
                                    selectedRequest.status.toLowerCase()
                                ) && (
                                    <button
                                        type="button"
                                        className="btn-action btn-start-work"
                                        onClick={() => handleUpdateStatus(selectedRequest.id, "in_progress")}
                                        disabled={updatingId === selectedRequest.id}
                                    >
                                        <Play size={14} fill="currentColor" />
                                        <span>
                                            {updatingId === selectedRequest.id ? "Updating..." : "Start Work"}
                                        </span>
                                    </button>
                                )}

                                {selectedRequest.status.toLowerCase() === "in_progress" && (
                                    <button
                                        type="button"
                                        className="btn-action btn-complete-work"
                                        onClick={() => handleUpdateStatus(selectedRequest.id, "completed")}
                                        disabled={updatingId === selectedRequest.id}
                                    >
                                        <Check size={15} strokeWidth={3} />
                                        <span>
                                            {updatingId === selectedRequest.id ? "Updating..." : "Mark as Completed"}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AssignedRequests;