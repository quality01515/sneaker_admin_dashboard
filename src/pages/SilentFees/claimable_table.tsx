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
import { FormattedNumber } from 'src/components/FormattedNumber';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Claimable_Table = ({payouts}) => {
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
                  <TableCell align="center">Next Payout</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(payouts || {}).map(([key, value], index) => {
                  return (
                    <TableRow hover key={`row-${key}`} onClick={() => handleRowClick(key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell align="center">
                        <div className="flex justify-center" style={{ cursor: 'pointer', userSelect: 'none' }}>
                          <p className="flex justify-center text-left">{key}</p>
                          <ContentCopyIcon sx={{ width: 16, height: 16 }} onClick={(e) => handleCopy(e, key)} />
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <FormattedNumber value={Number(value) / Math.pow(10, 9)} /> 
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

export default Claimable_Table;