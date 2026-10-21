import "./NewRequest.css";
import api from "../../../services/api";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

type CreateRequest = {
    title: string;
    description: string;
    category_id: number;
    priority: string;
};

type Category = {
    id: number;
    name: string;
};

function NewRequest() {
    const [request, setRequest] = useState<CreateRequest>({
        title: "",
        description: "",
        category_id: 0,
        priority: "medium",
    });

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Fetch categories from PostgreSQL

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get<Category[]>("/category");
                setCategories(response.data);
            } catch (err) {
                console.error("Error fetching categories", err);
                setError("Failed to load categories.");
            }
        };

        fetchCategories();
    }, []);

    // update form state when user types/selects

    const handleChange = (
        event: ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = event.target;
        setRequest((prev) => ({
            ...prev,
            [name]: name === "category_id" ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!request.category_id) {
            setError("Please select a category");
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/request", request);
            console.log("Created request:", response.data);
            setSuccess("Maintenance request submitted successfully!");

            // Reset form
            setRequest({
                title: "",
                description: "",
                category_id: 0,
                priority: "medium",
            });
        } catch (err: any) {
            console.error("Error submitting request:", err);
            const serverMsg = err.response?.data?.message;
            setError(serverMsg || "Failed to submit maintenance request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="new-request-page">
            <form className="new-request-form" onSubmit={handleSubmit}>
                <div className="form-header">
                    <h1 className="form-title">New Maintenance Request</h1>
                    <p className="form-subtitle">
                        Report an issue in your apartment.
                    </p>
                </div>

                {error && (
                    <p role="alert" className="error-message">
                        {error}
                    </p>
                )}

                {success && (
                    <p role="status" className="success-message">
                        {success}
                    </p>
                )}

                {loading && (
                    <p role="status" className="loading-message">
                        Loading...
                    </p>
                )}

                <div className="form-group">
                    <label htmlFor="request-title" className="form-label">
                        Request title
                    </label>
                    <input
                        type="text"
                        id="request-title"
                        name="title"
                        className="form-input"
                        placeholder="e.g AC not cooling"
                        value={request.title}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="category" className="form-label">
                        Category
                    </label>
                    <select
                        name="category_id"
                        id="category"
                        className="form-select"
                        onChange={handleChange}
                        value={request.category_id}
                        required
                    >
                        <option value={0} disabled>
                            Select a category
                        </option>
                        {categories.map((item) => {
                            return (
                                <>
                                    <option value={item.id} key={item.id}>
                                        {item.name}
                                    </option>
                                </>
                            );
                        })}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="description" className="form-label">
                        Description
                    </label>
                    <textarea
                        name="description"
                        id="description"
                        className="form-textarea"
                        rows={4}
                        value={request.description}
                        onChange={handleChange}
                        placeholder="Describe the problem..."
                    />
                </div>

                <div className="form-group">
                    <p className="form-label">Priority</p>
                    <div className="priority-grid">
                        <label
                            htmlFor="priority-low"
                            className="priority-option"
                        >
                            <input
                                type="radio"
                                name="priority"
                                id="priority-low"
                                value="low"
                                checked={request.priority === "low"}
                                onChange={handleChange}
                            />
                            <span>Low</span>
                        </label>

                        <label
                            htmlFor="priority-medium"
                            className="priority-option"
                        >
                            <input
                                type="radio"
                                name="priority"
                                id="priority-medium"
                                checked={request.priority === "medium"}
                                onChange={handleChange}
                                value="medium"
                            />
                            <span>Medium</span>
                        </label>

                        <label
                            htmlFor="priority-high"
                            className="priority-option"
                        >
                            <input
                                type="radio"
                                name="priority"
                                id="priority-high"
                                checked={request.priority === "high"}
                                onChange={handleChange}
                                value="high"
                            />
                            <span>High</span>
                        </label>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn">
                        Submit Request
                    </button>
                </div>
            </form>
        </div>
    );
}

export default NewRequest;
