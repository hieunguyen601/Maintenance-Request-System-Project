import "./RequestTable.css";

const mockRequests = [
  {
    id: 1,
    title: "AC not cooling",
    category: "HVAC",
    priority: "high",
    status: "in_progress",
    created_at: "2026-10-10",
  },
  {
    id: 2,
    title: "Kitchen sink leaking",
    category: "Plumbing",
    priority: "medium",
    status: "submitted",
    created_at: "2026-10-11",
  },
  {
    id: 3,
    title: "Broken door lock",
    category: "Doors & Locks",
    priority: "high",
    status: "completed",
    created_at: "2026-10-12",
  },
];

function RequestTable() {
  return (
    <div className="request-table-container">
      <div className="request-table-header">
        <h3 className="request-table-title">Recent Requests</h3>
        <span className="request-table-badge">{mockRequests.length} requests</span>
      </div>

      <div className="table-wrapper">
        <table className="request-table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {mockRequests.map((request) => (
              <tr key={request.id}>
                <td className="request-title">{request.title}</td>
                <td>
                  <span className="category-badge">{request.category}</span>
                </td>
                <td>
                  <span className={`priority-badge priority-${request.priority}`}>
                    {request.priority}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${request.status}`}>
                    {request.status.replace("_", " ")}
                  </span>
                </td>
                <td className="request-date">{request.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RequestTable;