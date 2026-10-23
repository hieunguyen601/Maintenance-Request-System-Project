import { useEffect, useState } from "react";
import api from "../../../services/api";
import "./AllRequests.css";

type Worker = {
    id: number;
    first_name: string;
    last_name: string;
};

type MaintenanceRequest = {
    id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    assigned_to: number | null;
    created_at: string;
    category: string | null;
    unit_number: string | null;
    worker_first_name?: string | null;
    worker_last_name?: string | null;
};

function AllRequests() {
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

    // 1. Fetch requests and workers on component mount
    const fetchData = async () => {
        try {
            const [requestsRes, workersRes] = await Promise.all([
                api.get("/manager/requests"),
                api.get("/manager/workers"),
            ]);
            setRequests(requestsRes.data);
            setWorkers(workersRes.data);
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Assign worker to a maintenance request
    const handleAssign = async (requestId: number, workerId: string) => {
        try {
            await api.patch(`/manager/requests/${requestId}/assign`, {
                assigned_to: workerId ? Number(workerId) : null,
            });
            // Refresh list to show updated worker and status
            fetchData();
        } catch (error) {
            console.error("Failed to assign worker:", error);
            alert("Failed to update assigned worker");
        }
    };

    // 3. Filter requests by search text and status dropdown
    const filteredRequests = requests.filter((req) => {
        const titleMatch = req.title.toLowerCase().includes(search.toLowerCase());
        const unitMatch = req.unit_number?.toLowerCase().includes(search.toLowerCase());
        const matchesSearch = titleMatch || unitMatch;

        const matchesStatus =
            statusFilter === "all" || req.status.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="all-requests-page">
            {/* Page Header */}
            <div className="all-requests-header">
                <div>
                    <h1>All Maintenance Requests</h1>
                    <p>Manage and assign requests to maintenance workers</p>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="all-requests-toolbar">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search by title or unit number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

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
            </div>

            {/* Requests Table */}
            <div className="all-requests-card">
                <table className="manager-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Unit</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Assign To</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: "center", padding: "30px" }}>
                                    No requests found.
                                </td>
                            </tr>
                        ) : (
                            filteredRequests.map((req) => (
                                <tr key={req.id}>
                                    <td>#{req.id}</td>
                                    <td>
                                        <strong>{req.title}</strong>
                                    </td>
                                    <td>
                                        <span className="unit-badge">
                                            {req.unit_number ? `Unit ${req.unit_number}` : "—"}
                                        </span>
                                    </td>
                                    <td>{req.category || "General"}</td>
                                    <td>
                                        <span className={`priority-pill priority-${req.priority.toLowerCase()}`}>
                                            {req.priority}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-pill status-${req.status.toLowerCase()}`}>
                                            {req.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td>
                                        {/* Simple inline worker selector */}
                                        <select
                                            className="assign-select"
                                            value={req.assigned_to || ""}
                                            onChange={(e) => handleAssign(req.id, e.target.value)}
                                        >
                                            <option value="">-- Unassigned --</option>
                                            {workers.map((worker) => (
                                                <option key={worker.id} value={worker.id}>
                                                    {worker.first_name} {worker.last_name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="view-details-btn"
                                            onClick={() => setSelectedRequest(req)}
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Simple Details Modal */}
            {selectedRequest && (
                <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
                    <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Request #{selectedRequest.id} Details</h2>
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={() => setSelectedRequest(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            <p><strong>Title:</strong> {selectedRequest.title}</p>
                            <p><strong>Unit:</strong> {selectedRequest.unit_number ? `Unit ${selectedRequest.unit_number}` : "N/A"}</p>
                            <p><strong>Category:</strong> {selectedRequest.category || "General"}</p>
                            <p><strong>Priority:</strong> {selectedRequest.priority}</p>
                            <p><strong>Status:</strong> {selectedRequest.status.replace("_", " ")}</p>
                            <p>
                                <strong>Assigned Worker:</strong>{" "}
                                {selectedRequest.worker_first_name
                                    ? `${selectedRequest.worker_first_name} ${selectedRequest.worker_last_name}`
                                    : "Unassigned"}
                            </p>
                            <p><strong>Date:</strong> {new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                            <div>
                                <strong>Description:</strong>
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
