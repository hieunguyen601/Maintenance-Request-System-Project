import type { LucideIcon } from "lucide-react";

type StatCardProps = {
    title: string;
    value: number;
    icon: LucideIcon;
};

function StatCard({ title, value, icon: Icon }: StatCardProps) {
    return (
        <div className="stat-card">
            <Icon size={20} />
            <h2>{title}</h2>
            <p>{value}</p>
        </div>
    );
}

export default StatCard;
