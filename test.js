const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(logger('dev'));

// signup123

mongoose.connect('mongodb+srv://signup:signup123@signup.huufj5v.mongodb.net/?retryWrites=true&w=majority&appName=signup', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

 

  const assignTaskSchema = new mongoose.Schema({
    projectName: { type: String, required: true },
    taskName: { type: String, required: true },
    assignedTo: { type: String, required: true },
    assignedBy: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  });
  
  const AssignTask = mongoose.model('AssignTask', assignTaskSchema);
  
  
// Fetch all tasks
// Fetch all tasks
app.get('/api/tasks', async (req, res) => {
    try {
      const tasks = await AssignTask.find({});
      res.json(tasks);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

app.use(cors());

// Create a new task
app.post('/api/assign-tasks', async (req, res) => {
  try {
    const newTask = new AssignTask(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: 'Failed to save task', error: error.message });
  }
});

// Update an existing task
// Update an existing task
app.put('/api/assign-tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const taskUpdate = await AssignTask.findByIdAndUpdate(id, req.body, { new: true });
      if (!taskUpdate) {
        return res.status(404).send('Task not found');
      }
      res.json(taskUpdate);
    } catch (error) {
      console.error('Failed to update task:', error);
      res.status(500).send(error.message);
    }
  });

  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  