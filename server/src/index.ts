import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello World!' });
});

// List all todos
app.get('/todos', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM todos');
    res.json(result.rows);
  } catch (err) {
    const error = err as Error;
    if (error.message.includes('relation "todos" does not exist')) {
      res.status(500).json({ error: 'The "todos" table does not exist in the database.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Create a new todo
app.post('/todos', async (req: Request, res: Response) => {
  const { text } = req.body;
  try {
    const result = await pool.query('INSERT INTO todos (text) VALUES ($1) RETURNING *', [text]);
    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
    if (error.message.includes('relation "todos" does not exist')) {
      try {
        await pool.query('CREATE TABLE todos (id SERIAL PRIMARY KEY, text VARCHAR(255) NOT NULL)');
        const result = await pool.query('INSERT INTO todos (text) VALUES ($1) RETURNING *', [text]);
        res.json(result.rows[0]);
      } catch (createErr) {
        const createError = createErr as Error;
        res.status(500).json({ error: createError.message });
      }
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update a todo
app.put('/todos/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;
  try {
    const result = await pool.query('UPDATE todos SET text = $1 WHERE id = $2 RETURNING *', [text, id]);
    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Delete a todo
app.delete('/todos/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Paginated list of todos
app.get('/todos/paginated', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query('SELECT * FROM todos LIMIT $1 OFFSET $2', [limit, offset]);
    const countResult = await pool.query('SELECT COUNT(*) FROM todos');
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      todos: result.rows,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Search todos by text
app.get('/todos/search', async (req: Request, res: Response) => {
  const searchText = req.query.q as string;

  try {
    const result = await pool.query('SELECT * FROM todos WHERE text ILIKE $1', [`%${searchText}%`]);
    res.json(result.rows);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Get todos by date range
app.get('/todos/date-range', async (req: Request, res: Response) => {
  const startDate = req.query.start as string;
  const endDate = req.query.end as string;

  try {
    const result = await pool.query('SELECT * FROM todos WHERE created_at BETWEEN $1 AND $2', [startDate, endDate]);
    res.json(result.rows);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Count todos
app.get('/todos/count', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM todos');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// Mark todo as completed
app.patch('/todos/:id/complete', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE todos SET completed = TRUE WHERE id = $1 RETURNING *', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});