import { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import {
  Box,
  CardHeader,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Button from '@mui/material/Button';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import { getSignature, getSignedMessageByWallet, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { ADMIN_ADDRESS } from 'src/config';

interface Admin {
  name: string;
  address: string;
  role: string;
  is_super_admin: boolean;
  created_at: string;
}

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const Admins_Table = () => {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [admin, setAdmin] = useState({ admin_name: '', admin_address: '' });
  const navigate = useNavigate();
  const { signMessage, publicKey } = useWallet();
  const [open, setOpen] = useState(false);

  const submitAddAdmin = () => {
    setOpen(true);
  };

  const closeAddAdmin = () => {
    setOpen(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setAdmin((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addAdmin();
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');
      console.log(super_admin_signature, timestamp);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/list_admins`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp: timestamp,
          super_admin_signature: super_admin_signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      console.log('Admins:', response.data.admins);
      
      setAdmins(response.data.admins);
      setLoading(false);
    } catch (err: any) {
      console.error('Error listing admins', err);
      setLoading(false);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      setAdmins([]);
      toast.error(err.message, {

        autoClose: 1500
      });
    }
  };

  const deleteAdmin = async (address: string) => {
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const message = `write:super_admin/delete_admin:${address}:${timestamp}`;
      let super_admin_signature = await getSignedMessageByWallet( signMessage, message);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/delete_admin`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp: timestamp,
          super_admin_signature: super_admin_signature,
          admin_address_to_delete: address,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );
      if (response.status == 200 || response.status == 204) {
        toast.success("The admin has been deleted !", {

          autoClose: 1500
        });
        let updated_admins: Admin[] = [...admins];
        updated_admins = updated_admins.filter(updated_admins => updated_admins.address !== address);
        setAdmins(updated_admins);
      }else{
        toast.error(response.data.message, {

          autoClose: 1500
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Error listing admins', err);
      setLoading(false);
      toast.error(err.message, {

        autoClose: 1500
      });
    }
  };

  const addAdmin = async () => {
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const message = `write:super_admin/add_admin:${admin.admin_name}:${admin.admin_address}:${timestamp}`;
      let super_admin_signature = await getSignedMessageByWallet( signMessage, message);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/super_admin/add_admin`,
        {
          super_admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp: timestamp,
          super_admin_signature: super_admin_signature,
          admin: {
              name: admin.admin_name,
              address: admin.admin_address
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );
      if (response.status == 200 || response.status == 204|| response.status == 201) {
        let updated_admins: Admin[] = [...admins];
        updated_admins.push({
            name: response.data.name,
            address: response.data.address,
            is_super_admin: response.data.is_super_admin,
            role: response.data.role? response.data.role : 'admin',
            created_at: response.data.created_at
        });
        setAdmins(updated_admins);
        setAdmin({ admin_address: '', admin_name: '' });
      }else{
        toast.error(response.data.message, {

          autoClose: 1500
        });
      }
      setLoading(false);
      closeAddAdmin();
    } catch (err) {
      console.error('Error listing admins', err);
      setLoading(false);
      closeAddAdmin();
      toast.error(err.message, {

        autoClose: 1500
      });
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [signMessage]);

  return (
    <Paper>
      <Dialog open={open} onClose={closeAddAdmin}>
        <DialogTitle sx={{ fontSize: 20 }}>Add Admin</DialogTitle>
        <Divider sx={{ color: 'white' }} />
        <DialogContent>
          <form onSubmit={handleSubmit} id="subscription-form">
            <TextField
              autoFocus
              required
              margin="dense"
              id="admin_name"
              name="admin_name"
              label="Admin Name"
              onChange={handleInputChange}
              value={admin.admin_name}
              type="text"
              fullWidth
              variant="standard"
            />
            <TextField
              autoFocus
              required
              margin="dense"
              id="admin_address"
              name="admin_address"
              label="Admin Address"
              onChange={handleInputChange}
              value={admin.admin_address}
              type="text"
              fullWidth
              variant="standard"
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddAdmin}>Cancel</Button>
          <Button type="submit" form="subscription-form">
            Add
          </Button>
        </DialogActions>
      </Dialog>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PersonAddAltIcon />}
          onClick={submitAddAdmin}
          sx={{
            fontSize: 12, fontWeight: 600, height: 34, px: 2,
            borderColor: 'rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.72)',
            '&:hover': { borderColor: 'rgba(45,212,209,0.45)', color: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' },
          }}
        >
          Add Admin
        </Button>
      </Box>
      {/* <CardHeader title="Admins" /> */}
      <Divider />
      <Box display="flex" justifyContent="center">
        <TableContainer style={{ maxWidth: '100%' }}>
          <LoadingOverlay
            active={loading}
            spinner
            styles={{
              wrapper: (base) => ({
                ...base,
                width: '100%'
              })
            }}
          >
            <Table sx={{ overflowX: 'auto', width: '100%' }}>
              <TableHead style={{ height: '80px', width: '100%' }}>
                <TableRow style={{ width: '100%' }}>
                  <TableCell align="center">No</TableCell>
                  <TableCell align="center">Name</TableCell>
                  <TableCell align="center">Role</TableCell>
                  <TableCell align="center">Address</TableCell>
                  <TableCell align="center">Created At</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admins.map((admin, index) => {
                  return (
                    <TableRow hover key={`row-${admin.address}`}>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell align="center">{admin.name}</TableCell>
                      <TableCell align="center">{admin.role}</TableCell>
                      <TableCell align="center">{admin.address}</TableCell>
                      <TableCell align="center">{admin.created_at}</TableCell>
                      <TableCell align="center" onClick={() => deleteAdmin(admin.address)}><DeleteOutlineIcon /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </LoadingOverlay>
        </TableContainer>
      </Box>
    </Paper>
  );
};

export default Admins_Table;