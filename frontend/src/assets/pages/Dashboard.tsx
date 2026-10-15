import { ClipboardList, Clock, Wrench, CircleCheck } from "lucide-react";
import StatCard from "../components/StatCard";
import RequestTable from "../components/RequestTable";
import "./Dashboard.css";
function Dashboard() {
    return (
        <>
            <div className="stats-grid">
                <StatCard
                    title="Total Requests"
                    value={12}
                    icon={ClipboardList}
                />
                <StatCard title="Pending" value={3} icon={Clock} />
                <StatCard title="In Progress" value={4} icon={Wrench} />
                <StatCard title="Completed" value={5} icon={CircleCheck} />
            </div>

            <RequestTable />
        </>
    );
}

export default Dashboard;
