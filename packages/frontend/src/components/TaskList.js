import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function TaskList({ tasks, onToggle, onDelete, onEdit, loading = false }) {
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const hasTasks = useMemo(() => tasks.length > 0, [tasks]);

  const openEditDialog = (task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDueDate(task.dueDate || '');
  };

  const closeEditDialog = () => {
    setEditingTask(null);
    setEditTitle('');
    setEditDueDate('');
  };

  const handleEditSave = () => {
    if (!editingTask || !editTitle.trim()) {
      return;
    }

    onEdit(editingTask.id, {
      title: editTitle.trim(),
      dueDate: editDueDate || null,
    });
    closeEditDialog();
  };

  if (!hasTasks) {
    return <Typography color="text.secondary">No tasks yet. Add your first task.</Typography>;
  }

  return (
    <>
      <List aria-label="Task list" sx={{ p: 0 }}>
        {tasks.map((task, index) => (
          <React.Fragment key={task.id}>
            <ListItem
              alignItems="center"
              secondaryAction={(
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    color="secondary"
                    aria-label={`Edit ${task.title}`}
                    onClick={() => openEditDialog(task)}
                    disabled={loading}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    aria-label={`Delete ${task.title}`}
                    onClick={() => onDelete(task.id)}
                    disabled={loading}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              )}
            >
              <Checkbox
                edge="start"
                checked={task.completed}
                tabIndex={0}
                onChange={() => onToggle(task.id, !task.completed)}
                inputProps={{ 'aria-label': `Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}` }}
                disabled={loading}
              />
              <ListItemText
                primary={task.title}
                secondary={task.dueDate ? `Due: ${task.dueDate}` : 'No due date'}
                primaryTypographyProps={{
                  sx: {
                    color: task.completed ? 'text.secondary' : 'text.primary',
                    textDecoration: task.completed ? 'line-through' : 'none',
                  },
                }}
              />
            </ListItem>
            {index < tasks.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>

      <Dialog open={Boolean(editingTask)} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Edit task</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Task title"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Due date"
            type="date"
            value={editDueDate}
            onChange={(event) => setEditDueDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={closeEditDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={!editTitle.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default TaskList;
