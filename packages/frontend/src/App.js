import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import './App.css';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const getApiErrorMessage = async (response, fallbackMessage) => {
    let payload;

    try {
      payload = await response.json();
    } catch (parseError) {
      payload = null;
    }

    if (payload && payload.error) {
      return payload.error;
    }

    if ([502, 503, 504].includes(response.status)) {
      return 'Backend service is unavailable. Make sure the backend server is running on port 3030.';
    }

    return `${fallbackMessage} (HTTP ${response.status})`;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/todos');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setTasks(result);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch tasks: ${err.message}`);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async ({ title, dueDate }) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, dueDate }),
      });

      if (!response.ok) {
        const errorMessage = await getApiErrorMessage(response, 'Failed to create task');
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setTasks((currentTasks) => [...currentTasks, result]);
      setToastMessage('Task added');
      setError(null);

      fetchData();
    } catch (err) {
      setError(`Error adding task: ${err.message}`);
      console.error('Error adding task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(`/api/todos/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorMessage = await getApiErrorMessage(response, 'Failed to delete task');
        throw new Error(errorMessage);
      }

      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
      setToastMessage('Task deleted');
      setError(null);

      fetchData();
    } catch (err) {
      setError(`Error deleting task: ${err.message}`);
      console.error('Error deleting task:', err);
    }
  };

  const handleUpdateTask = async (taskId, patch) => {
    try {
      const existingTask = tasks.find((task) => task.id === taskId);
      if (!existingTask) {
        return;
      }

      const payload = {
        title: patch.title ?? existingTask.title,
        dueDate: patch.dueDate !== undefined ? patch.dueDate : existingTask.dueDate,
        completed: patch.completed !== undefined ? patch.completed : existingTask.completed,
      };

      const response = await fetch(`/api/todos/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorMessage = await getApiErrorMessage(response, 'Failed to update task');
        throw new Error(errorMessage);
      }

      const updatedTask = await response.json();
      setTasks((currentTasks) => currentTasks.map((task) => (
        task.id === taskId ? updatedTask : task
      )));
      setToastMessage('Task updated');
      setError(null);

      fetchData();
    } catch (err) {
      setError(`Error updating task: ${err.message}`);
      console.error('Error updating task:', err);
    }
  };

  return (
    <Box className="app-shell">
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, display: 'grid', gap: { xs: 2, md: 3 } }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              TODO Planner
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create, prioritize, and complete your tasks.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}

          <TaskForm onCreate={handleCreateTask} loading={loading} />

          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={22} />
              <Typography>Loading tasks...</Typography>
            </Box>
          ) : (
            <TaskList
              tasks={tasks}
              onToggle={(taskId, completed) => handleUpdateTask(taskId, { completed })}
              onDelete={handleDeleteTask}
              onEdit={handleUpdateTask}
              loading={loading}
            />
          )}
        </Paper>
      </Container>

      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={2500}
        onClose={() => setToastMessage('')}
        message={toastMessage}
      />
    </Box>
  );
}

export default App;