import { toast } from 'react-toastify';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate } from 'react-router-dom';
import { FormattedNumber } from 'src/components/FormattedNumber';

const Top10_Table = ({users}) => {
  const navigate = useNavigate();

  const handleRowClick = (userAddress: string) => {
    navigate(`/user?user_address=${userAddress}`);
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', {

      autoClose: 1500
    });
  };

  return (
    <Paper>
      <Box display="flex" justifyContent="center">
        <TableContainer style={{ maxWidth: '100%' }}>
            <Table sx={{ overflowX: 'auto', width: '100%' }}>
              <TableHead style={{ height: '80px', width: '100%' }}>
                <TableRow style={{ width: '100%' }}>
                  <TableCell align="center">No</TableCell>
                  <TableCell align="center">Address</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">Paid Out</TableCell>
                  <TableCell align="center">Pending</TableCell>
                  <TableCell align="center">Next Payout</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(users || []).map((user, index) => {
                  return (
                    <TableRow hover key={`row-${user.user_address}`} onClick={() => handleRowClick(user.user_address)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell align="center">
                        <div className="flex justify-center" style={{ cursor: 'pointer', userSelect: 'none' }}>
                          <p className="flex justify-center text-left">{user.user_address}</p>
                          <ContentCopyIcon sx={{ width: 24, height: 24 }} onClick={(e) => handleCopy(e, user.user_address)} />
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <FormattedNumber value={Number(user.total) / Math.pow(10, 9)} /> 
                      </TableCell>
                      <TableCell align="center">
                        <FormattedNumber value={Number(user.paid_out) / Math.pow(10, 9)} /> 
                      </TableCell>
                      <TableCell align="center">
                        <FormattedNumber value={Number(user.pending) / Math.pow(10, 9)} /> 
                      </TableCell>
                      <TableCell align="center">
                        <FormattedNumber value={Number(user.next_payout) / Math.pow(10, 9)} /> 
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </TableContainer>
      </Box>
    </Paper>
  );
};

export default Top10_Table;