import React, { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';

const getTodayDate = () => new Date().toISOString().slice(0, 10);

function TaskForm({ onCreate, loading = false }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(getTodayDate());

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const normalizedDueDate = dueDate || getTodayDate();

    if (!trimmedTitle) {
      return;
    }

    onCreate({
      title: trimmedTitle,
      dueDate: normalizedDueDate,
    });

    setTitle('');
    setDueDate(getTodayDate());
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
      <TextField
        label="Task title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        fullWidth
        inputProps={{ 'aria-label': 'Task title input' }}
      />
      <TextField
        label="Due date"
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth
        inputProps={{ 'aria-label': 'Task due date input' }}
      />
      <Button type="submit" variant="contained" disabled={loading || !title.trim()}>
        Add Task
      </Button>
    </Box>
  );
}

export default TaskForm;
