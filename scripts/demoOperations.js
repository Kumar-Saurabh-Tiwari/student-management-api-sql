require("dotenv").config();

const pool = require("../config/db");

async function runDemo() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [first] = await connection.execute(
            "INSERT INTO students (name, email, age) VALUES (?, ?, ?)",
            ["MS Dhoni", "dhoni@example.com", 42]
        );
        console.log(`Insert student: id=${first.insertId}, email=dhoni@example.com`);

        const [second] = await connection.execute(
            "INSERT INTO students (name, email, age) VALUES (?, ?, ?)",
            ["Virat Kohli", "virat.kohli@example.com", 35]
        );
        console.log(`Insert student: id=${second.insertId}, email=virat.kohli@example.com`);

        await connection.execute(
            "UPDATE students SET name = ?, email = ? WHERE id = ?",
            ["Captain Cool", "captaincool@example.com", first.insertId]
        );
        console.log(`Update student: id=${first.insertId}`);

        await connection.execute("DELETE FROM students WHERE id = ?", [second.insertId]);
        console.log(`Delete student: id=${second.insertId}`);

        const [remaining] = await connection.execute(
            "SELECT id, name, email, age FROM students ORDER BY id"
        );
        await connection.commit();
        console.log("Remaining students:", remaining);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

runDemo().catch((error) => {
    console.error("Demo operations failed:", error.message);
    process.exitCode = 1;
});
