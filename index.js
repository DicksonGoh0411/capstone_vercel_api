let express = require("express");
let path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
const { DATABASE_URL } = process.env;
const { error } = require("console");
require("dotenv").config();

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function getPostgresVersion() {
  const client = await pool.connect();
  try {
    const response = await client.query("SELECT version()");
    console.log(response.rows[0]);
  } finally {
    client.release();
  }
}

getPostgresVersion();

app.get("/bookings/user/:uid", async (req, res) => {
  const { uid } = req.params;
  const client = await pool.connect();

  try {
    const bookings = await client.query(
      "SELECT * FROM bookings WHERE uid = $1",
      [uid],
    );
    if (bookings.rowCount > 0) {
      res.json(bookings.rows);
    } else {
      res.status(404).json({ message: "No bookings found for this user" });
    }
  } catch (error) {
    console.error("Error", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    const bookings = await client.query(
      "SELECT * FROM bookings WHERE id = $1",
      [id],
    );
    if (bookings.rowCount > 0) {
      res.json(bookings.rows);
    } else {
      res.status(404).json({ message: "Booking does not exist" });
    }
  } catch (error) {
    console.error("Error", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post("/bookings", async (req, res) => {
  const { room, pax, date, time, name, phone, email, uid } = req.body;

  const client = await pool.connect();
  try {
    const bookings = await client.query(
      "INSERT INTO bookings (room, pax, date, time, name, phone, email, uid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [room, pax, date, time, name, phone, email, uid],
    );

    res.json(bookings.rows[0]);
  } catch (err) {
    console.log(err.stack);
    res.status(500).send("An error occurred, please try again.");
  } finally {
    client.release();
  }
});

app.put("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const { room, pax, date, time, name, phone, email } = req.body;

  const client = await pool.connect();
  try {
    // Check if the booking exists by querying the booking with the provided id
    const bookingExists = await client.query(
      "SELECT * FROM bookings WHERE id = $1",
      [id],
    );

    // If booking doesn't exist, return 404
    if (bookingExists.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Update the booking if it exists
    const updatedBooking = await client.query(
      "UPDATE bookings SET room = $1, pax = $2, date = $3, time = $4, name = $5, phone = $6, email = $7 WHERE id = $8 RETURNING *",
      [room, pax, date, time, name, phone, email, id],
    );

    // Return the updated booking data
    res.json(updatedBooking.rows[0]);
  } catch (err) {
    console.log(err.stack);
    res.status(500).send("An error occurred, please try again.");
  } finally {
    client.release();
  }
});

app.delete("/bookings/:id", async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    // Check if the booking exists
    const bookingExists = await client.query(
      "SELECT * FROM bookings WHERE id = $1",
      [id],
    );

    // If booking doesn't exist, return 404
    if (bookingExists.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Delete the booking
    const deletedBooking = await client.query(
      "DELETE FROM bookings WHERE id = $1 RETURNING *",
      [id],
    );

    // Return the deleted booking data
    res.json({
      message: "Booking deleted successfully",
      booking: deletedBooking.rows[0],
    });
  } catch (err) {
    console.log(err.stack);
    res.status(500).send("An error occurred, please try again.");
  } finally {
    client.release();
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the API");
})

app.listen(3000, () => {
  console.log("App is listening on port 3000");
});
