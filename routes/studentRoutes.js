const express = require("express");
const pool = require("../config/db");

const router = express.Router();

function getStudentId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function validateStudentInput(body, partial = false) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return "request body must be a JSON object";
    }
    const { name, email, age } = body;
    if (!partial && (typeof name !== "string" || typeof email !== "string" || !Number.isInteger(age))) {
        return "name, email, and integer age are required";
    }
    if (partial && name === undefined && email === undefined && age === undefined) {
        return "at least one of name, email, or age is required";
    }
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
        return "name must be a non-empty string";
    }
    if (email !== undefined && (typeof email !== "string" || email.trim() === "")) {
        return "email must be a non-empty string";
    }
    if (age !== undefined && (!Number.isInteger(age) || age < 0)) {
        return "age must be a non-negative integer";
    }
    return null;
}

router.post("/", async (req, res, next) => {
    const validationError = validateStudentInput(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const { name, email, age } = req.body;
        const [result] = await pool.execute(
            "INSERT INTO students (name, email, age) VALUES (?, ?, ?)",
            [name.trim(), email.trim(), age]
        );
        console.log(`Insert student: id=${result.insertId}, email=${email.trim()}`);
        const [rows] = await pool.execute("SELECT id, name, email, age FROM students WHERE id = ?", [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "email is already in use" });
        }
        next(error);
    }
});

router.get("/", async (req, res, next) => {
    try {
        const [rows] = await pool.execute("SELECT id, name, email, age FROM students ORDER BY id");
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

router.get("/:id", async (req, res, next) => {
    const id = getStudentId(req.params.id);
    if (id === null) {
        return res.status(400).json({ error: "id must be a positive integer" });
    }

    try {
        const [rows] = await pool.execute("SELECT id, name, email, age FROM students WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "student not found" });
        }
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

router.put("/:id", async (req, res, next) => {
    const id = getStudentId(req.params.id);
    if (id === null) {
        return res.status(400).json({ error: "id must be a positive integer" });
    }
    const validationError = validateStudentInput(req.body, true);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const fields = [];
    const values = [];
    for (const field of ["name", "email", "age"]) {
        if (req.body[field] !== undefined) {
            fields.push(`${field} = ?`);
            values.push(field === "name" || field === "email" ? req.body[field].trim() : req.body[field]);
        }
    }
    values.push(id);

    try {
        const [result] = await pool.execute(`UPDATE students SET ${fields.join(", ")} WHERE id = ?`, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "student not found" });
        }
        console.log(`Update student: id=${id}`);
        const [rows] = await pool.execute("SELECT id, name, email, age FROM students WHERE id = ?", [id]);
        res.json(rows[0]);
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "email is already in use" });
        }
        next(error);
    }
});

router.delete("/:id", async (req, res, next) => {
    const id = getStudentId(req.params.id);
    if (id === null) {
        return res.status(400).json({ error: "id must be a positive integer" });
    }

    try {
        const [result] = await pool.execute("DELETE FROM students WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "student not found" });
        }
        console.log(`Delete student: id=${id}`);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

module.exports = router;
