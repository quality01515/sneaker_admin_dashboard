import React, { Fragment, useState, useEffect } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";

export interface BoxSpecRow {
  id: number;
  id_box: number;
  box_label: string;
  id_spec: number;
  spec_label: string;
  sort: number;
  status: number;
}

interface SpecFormData {
  spec_label: string;
  status: string;
}

interface SavetableProps {
  boxLabel: string;
  idBox: number;
  rows: BoxSpecRow[];
}

export const Savetable = ({ boxLabel, idBox, rows }: SavetableProps) => {
  const [modalShow, setModalShow] = useState(false);
  const [contacts, setContacts] = useState<BoxSpecRow[]>(rows);

  useEffect(() => {
    setContacts(rows);
  }, [rows]);

  const [addFormData, setAddFormData] = useState<SpecFormData>({ spec_label: "", status: "1" });
  const [editFormData, setEditFormData] = useState<SpecFormData>({ spec_label: "", status: "1" });
  const [addStatusChecked, setAddStatusChecked] = useState(true);
  const [editStatusChecked, setEditStatusChecked] = useState(true);
  const [editContactId, setEditContactId] = useState<number | null>(null);

  const handleAddFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAddFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditStatusChange = (checked: boolean) => {
    setEditStatusChecked(checked);
    setEditFormData((prev) => ({ ...prev, status: checked ? "1" : "0" }));
  };

  const handleAddFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const maxId = contacts.length ? Math.max(...contacts.map((c) => c.id)) : 0;
    const newRow: BoxSpecRow = {
      id: maxId + 1,
      id_box: idBox,
      box_label: boxLabel,
      id_spec: maxId + 1,
      spec_label: addFormData.spec_label,
      sort: contacts.length + 1,
      status: addStatusChecked ? 1 : 0,
    };
    setContacts([...contacts, newRow]);
    setAddFormData({ spec_label: "", status: "1" });
    setAddStatusChecked(true);
    setModalShow(false);
  };

  const handleEditFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editContactId === null) return;
    const index = contacts.findIndex((c) => c.id === editContactId);
    if (index === -1) return;
    const edited = {
      ...contacts[index],
      spec_label: editFormData.spec_label,
      status: editStatusChecked ? 1 : 0,
    };
    const newContacts = [...contacts];
    newContacts[index] = edited;
    setContacts(newContacts);
    setEditContactId(null);
  };

  const handleEditClick = (event: React.MouseEvent, row: BoxSpecRow) => {
    event.preventDefault();
    setEditContactId(row.id);
    setEditFormData({ spec_label: row.spec_label, status: String(row.status) });
    setEditStatusChecked(Number(row.status) === 1);
  };

  const handleCancelClick = () => setEditContactId(null);

  const handleDeleteClick = (id: number) => {
    setContacts(contacts.filter((c) => c.id !== id));
  };

  const handleStatusToggle = (row: BoxSpecRow) => {
    const newStatus = Number(row.status) === 1 ? 0 : 1;
    const newContacts = contacts.map((c) =>
      c.id === row.id ? { ...c, status: newStatus } : c
    );
    setContacts(newContacts);
  };

  const EditableRow = ({
    editFormData,
    handleEditFormChange,
    handleEditStatusChange,
    editStatusChecked,
    handleCancelClick,
    no,
    id,
  }: {
    editFormData: SpecFormData;
    handleEditFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleEditStatusChange: (checked: boolean) => void;
    editStatusChecked: boolean;
    handleCancelClick: () => void;
    no: number;
    id: number;
  }) => (
    <TableRow>
      <TableCell align="center" sx={{ color: "black" }}>
        {no}
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          fullWidth
          placeholder="spec_label"
          name="spec_label"
          value={editFormData.spec_label}
          onChange={handleEditFormChange}
          required
          sx={{ "& input": { color: "black" } }}
        />
      </TableCell>
      <TableCell align="center" padding="checkbox">
        <Checkbox
          checked={editStatusChecked}
          onChange={(e) => handleEditStatusChange(e.target.checked)}
          size="small"
          sx={{ padding: 0.5, color: "#1976d2", "&.Mui-checked": { color: "#1976d2" } }}
        />
      </TableCell>
      <TableCell sx={{ color: "black" }}>{id}</TableCell>
      <TableCell align="center">
        <IconButton size="small" type="submit" color="primary" title="Save">
          <SaveIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleCancelClick} color="error" title="Cancel">
          <CloseIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  const ReadOnlyRow = ({
    row,
    no,
    handleEditClick,
    handleDeleteClick,
    handleStatusToggle,
  }: {
    row: BoxSpecRow;
    no: number;
    handleEditClick: (e: React.MouseEvent, row: BoxSpecRow) => void;
    handleDeleteClick: (id: number) => void;
    handleStatusToggle: (row: BoxSpecRow) => void;
  }) => (
    <TableRow hover sx={{ "&:nth-of-type(even)": { bgcolor: "grey.50" } }}>
      <TableCell align="center" sx={{ color: "black" }}>
        {no}
      </TableCell>
      <TableCell sx={{ color: "black" }}>{row.spec_label}</TableCell>
      <TableCell align="center" padding="checkbox">
        <Checkbox
          checked={Number(row.status) === 1}
          onChange={() => handleStatusToggle(row)}
          size="small"
          sx={{ padding: 0.5, color: "#1976d2", "&.Mui-checked": { color: "#1976d2" } }}
        />
      </TableCell>
      <TableCell sx={{ color: "black" }}>{row.id}</TableCell>
      <TableCell align="center">
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => handleEditClick(e, row)}
          title="Edit"
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => handleDeleteClick(row.id)}
          title="Delete"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        overflow: "hidden",
        borderRadius: 2,
        border: "2px solid",
        borderColor: "grey.300",
        borderBottomColor: "grey.400",
        borderRightColor: "grey.400",
        background: "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
        boxShadow: "6px 6px 12px rgba(0,0,0,0.15), 10px 10px 20px rgba(0,0,0,0.1)",
        transition: "all 0.25s ease",
        "&:hover": {
          boxShadow: "8px 8px 16px rgba(0,0,0,0.2), 14px 14px 28px rgba(0,0,0,0.12)",
          transform: "translateY(-3px) translateX(-1px)",
          borderBottomColor: "grey.500",
          borderRightColor: "grey.500",
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          {boxLabel}
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        <form onSubmit={handleEditFormSubmit}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setModalShow(true)}
            sx={{ mb: 2 }}
          >
            Add Row
          </Button>
          <TableContainer
            sx={{
              overflowX: "auto",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              "& .MuiTableCell-root": { color: "black" },
            }}
          >
            <Table size="small" sx={{ minWidth: 280 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    No
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Spec</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((row, idx) => (
                  <Fragment key={row.id}>
                    {editContactId === row.id ? (
                      <EditableRow
                        editFormData={editFormData}
                        handleEditFormChange={handleEditFormChange}
                        handleEditStatusChange={handleEditStatusChange}
                        editStatusChecked={editStatusChecked}
                        handleCancelClick={handleCancelClick}
                        no={idx + 1}
                        id={row.id}
                      />
                    ) : (
                      <ReadOnlyRow
                        row={row}
                        no={idx + 1}
                        handleEditClick={handleEditClick}
                        handleDeleteClick={handleDeleteClick}
                        handleStatusToggle={handleStatusToggle}
                      />
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </form>

        <Dialog open={modalShow} onClose={() => setModalShow(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Row</DialogTitle>
          <form onSubmit={handleAddFormSubmit}>
            <DialogContent>
              <TextField
                margin="dense"
                name="spec_label"
                label="Spec Label"
                fullWidth
                value={addFormData.spec_label}
                onChange={handleAddFormChange}
                required
              />
              <Box sx={{ display: "flex", alignItems: "center", mt: 1.5, gap: 1 }}>
                <Checkbox
                  checked={addStatusChecked}
                  onChange={(e) => setAddStatusChecked(e.target.checked)}
                  sx={{ color: "#1976d2", "&.Mui-checked": { color: "#1976d2" } }}
                />
                <Typography variant="body2" color="text.secondary">
                  Status (checked = 1, unchecked = 0)
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setModalShow(false)}>Cancel</Button>
              <Button type="submit" variant="contained">
                Add
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Paper>
  );
};
