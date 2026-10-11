import express from "express";
import cors from "cors";
import pool from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access denied. Token not found!",
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET || "default_secret",
        (error, decoded) => {
            if (error) {
                return res.status(403).json({
                    message: "Invalid or expired token.",
                });
            }

            req.user = decoded;
            next();
        },
    );
};

app.post("/api/user", async (req, res) => {
    const { first_name, last_name, email, password, role } = req.body;

    try {
        const saltRound = 10;
        const hashedPassword = await bcrypt.hash(password, saltRound);
        const user = await pool.query(
            ` INSERT INTO users (
            
                first_name,
                last_name,
                email,
                password,
                role
            )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *;
            `,
            [first_name, last_name, email, hashedPassword, role],
        );

        res.status(201).json({
            message: "User added",
            data: user.rows[0],
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error",
        });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(401).json({
            message: "Invalid input email or password",
        });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM users WHERE email = $1;
            `,
            [email],
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || "default_secret",
            { expiresIn: "1d" },
        );

        delete user.password;

        res.status(200).json({
            message: "Login successfully",
            token: token,
            user: user,
        });
    } catch (error) {
        console.log("Login error", error);
        res.status(500).json({
            message: "Server error",
        });
    }
});

app.post("/api/request", authenticateToken, async (req, res) => {
    const tenant_id = req.user?.id || req.body.tenant_id;

    const {
        category_id,
        title,
        description,
        piority,
        status = "pending",
    } = req.body;

    try {
        const apartmentResult = await pool.query(
            ` SELECT id FROM apartments WHERE tenant_id = $1
            LIMIT 1
            `,
            [tenant_id],
        );

        if (apartmentResult.rows.length === 0) {
            return res.status(404).json({
                message: "No apartment found assigned to this tenant.",
            });
        }

        const apartment_id = apartmentResult.rows[0].id;

        const request = await pool.query(
            ` INSERT INTO maintenance_requests (
            ternant_id,
            apartment_id,
            category_id,
            title,
            description,
            piority,
            status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *;
        `,
            [
                tenant_id,
                apartment_id,
                category_id,
                title,
                description,
                piority,
                status,
            ],
        );
        res.status(201).json({
            message: "Request sent",
            data: request.rows[0],
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error",
        });
    }
});

app.get("/api/category", async (req, res) => {
    try {
        const result = await pool.query(
            ` SELECT * FROM categories ORDER BY name ASC
            `,
        );
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error",
        });
    }
});

app.post("/api/comment", async (req, res) => {
    const {
        request_id,
        message,
        user_id = req.user?.id || req.body.user_id,
    } = req.body;

    try {
        const requestResult = await pool.query(
            `SELECT id FROM maintenance_requests WHERE id = $1
            LIMIT 1
            `,
            [request_id],
        );
        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                message: "Maintenance request not found.",
            });
        }

        const comments = await pool.query(
            `
            INSERT INTO comments (
                request_id,
                user_id,
                message
            ) VALUES ($1, $2, $3)
            RETURNING *;
            `,
            [request_id, user_id, message],
        );
        res.status(201).json({
            message: "Comments added.",
            data: comments.rows[0],
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error",
        });
    }
});

app.post("/api/apartment", async (req, res) => {
    const { unit_number, building, floor } = req.body;

    const tenant_id = req.user?.id || req.body.tenant_id;
    try {
        const apartment = await pool.query(
            ` INSERT INTO apartments (
                unit_number,
                building,
                floor,
                tenant_id
            ) VALUES ($1, $2, $3, $4)
             RETURNING *;
            `,
            [unit_number, building, floor, tenant_id],
        );

        res.status(201).json({
            message: "Apartment informations added.",
            data: apartment.rows[0],
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error",
        });
    }
});

app.listen(port, () => {
    console.log("Server running on port", port);
});
