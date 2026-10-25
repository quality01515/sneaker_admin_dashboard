import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import { getSignature, getSignedMessageByWallet, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import LoadingOverlay from 'react-loading-overlay-ts';
import { TxBundleResponse } from "./types";
import axios from 'axios';
import { ADMIN_ADDRESS } from 'src/config';
import { toast } from 'react-toastify';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const Tx_History = ({ user_address }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TxBundleResponse>({
    data: [],
    page: 0,
    per_page: 0,
    has_more: false,
  });
  const { signMessage, publicKey } = useWallet();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expired, setExpired] = useState(false);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard', {

        autoClose: 1500
      });
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };
  
  const handleSearchClick = () => {
    setPage(0);
    fetchUserTxBundle(0, rowsPerPage, expired, searchText);
  };
  
  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
    fetchUserTxBundle(newPage, rowsPerPage, expired, searchText);
  };

  const onlyExpired = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setExpired(event.target.checked);
    fetchUserTxBundle(0, rowsPerPage, event.target.checked);
  };

  const handleTxIdClick = ( tx_id ) => {
    navigate(`/transaction?tx_id=${tx_id}`);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    console.log(event.target.value);
    setRowsPerPage(parseInt(event.target.value));
    setPage(0);
    fetchUserTxBundle(0, parseInt(event.target.value), expired, searchText);
  };

  const fetchUserTxBundle = async (page?: number, rowsPerPage?: number, only_expired?: boolean, filter_keyword?: String) => {
    setLoading(true);
    if (!user_address) {
      setLoading(false);
      return;
    }

    try {
      const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/user/transactions`,
        {
          admin_address: localStorage.getItem(ADMIN_ADDRESS),
          timestamp: timestamp,
          admin_signature: super_admin_signature,
          page: page,
          per_page: rowsPerPage,
          user_address,
          status: only_expired? 'expired' : 'all',
          filter_keyword
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'x-api-key': ADMIN_DASHBOARD_API_KEY,
          },
        }
      );

      console.log('Txes:', response.data);
      
      setData(response.data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error listing data', err);
      setLoading(false);
      if (err instanceof SignatureExpiredError) {
        handleSessionExpired(navigate);
        return;
      }
      toast.error(err.message, {

        autoClose: 1500
      });
    }
  };

  useEffect(() => {
    fetchUserTxBundle(page, rowsPerPage, expired, searchText);
  }, [signMessage]);

  return (
    <Paper>
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
      <div className='flex my-3'>
        <Paper
          component="form"
          sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 700 }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Search User Address Or Transaction"
            inputProps={{ 'aria-label': 'search user address' }}
            value={searchText}  
            onChange={handleInputChange} 
          />
          <IconButton type="button" sx={{ p: '10px' }} aria-label="search" onClick={handleSearchClick}>
            <SearchIcon />
          </IconButton>
        </Paper>
        <FormControlLabel control={<Checkbox sx={{ transform: 'scale(1.1)' }} checked={expired} />} label="Only Expired" sx={{ '& .MuiFormControlLabel-label': { fontSize: 18, color: 'red' }, marginLeft: 2 }}  onChange={onlyExpired} />
      </div>
      <Box display="flex" justifyContent="center">
        <TableContainer style={{ maxWidth: '100%' }}>
            <Table sx={{ overflowX: 'auto', width: '100%' }}>
              <TableHead style={{ height: '80px', width: '100%' }}>
                <TableRow style={{ width: '100%' }}>
                  <TableCell align="center">No</TableCell>
                  <TableCell align="center">Tx Id</TableCell>
                  <TableCell align="center">Action Type</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Source Token Address</TableCell>
                  <TableCell align="center">Target Token Address</TableCell>
                  <TableCell align="center">Sol Dalta</TableCell>
                  <TableCell align="center">Source Token Delta</TableCell>
                  <TableCell align="center">Target Token Delta</TableCell>
                  <TableCell align="center">Source Token Price</TableCell>
                  <TableCell align="center">Target Token Price</TableCell>
                  <TableCell align="center">Created At</TableCell>
                  <TableCell align="center">Completed At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map((tx, index) => {
                  return (
                    <TableRow hover key={`row-${tx.tx_id}`}>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell align="center">
                        <div className="flex" onClick={(e) => { e.stopPropagation(); handleTxIdClick(tx.tx_id); }} style={{ cursor: 'pointer', userSelect: 'none' }} >
                          <p className="truncate w-[140px]">{tx.tx_id}</p>		
                          <ContentCopyIcon sx={{ width: 18, height: 18 }} onClick={(e) => { e.stopPropagation(); handleCopy(tx.tx_id); }} />
                        </div>	
                      </TableCell>
                      <TableCell align="center">{tx.action_type}</TableCell>
                      <TableCell align="center">{tx.status}</TableCell>
                      <TableCell align="center">
                        <div className="flex" onClick={(e) => { e.stopPropagation(); handleCopy(tx.source_token_address); }} style={{ cursor: 'pointer', userSelect: 'none' }} >
                          <p className="truncate w-[140px]">{tx.source_token_address == ""? "So11111111111111111111111111111111111111112": tx.source_token_address}</p>		
                          <ContentCopyIcon sx={{ width: 18, height: 18 }} />
                        </div>	
                      </TableCell>
                      <TableCell align="center">
                        <div className="flex" onClick={(e) => { e.stopPropagation(); handleCopy(tx.target_token_address); }} style={{ cursor: 'pointer', userSelect: 'none' }} >
                          <p className="truncate w-[140px]">{tx.target_token_address == ""? "So11111111111111111111111111111111111111112": tx.target_token_address}</p>		
                          <ContentCopyIcon sx={{ width: 18, height: 18 }} />
                        </div>	
                      </TableCell>
                      <TableCell align="center">{(Number(tx.sol_delta) / Math.pow(10, 9)).toFixed(5)}</TableCell>
                      <TableCell align="center">{tx.source_token_delta? (Number(tx.source_token_delta) / Math.pow(10, Number(tx.decimals_source))).toFixed(6): 0 }</TableCell>
                      <TableCell align="center">{tx.target_token_delta? (Number(tx.target_token_delta) / Math.pow(10, Number(tx.decimals_target))).toFixed(6): 0 }</TableCell>
                      <TableCell align="center">{tx.source_token_price? tx.source_token_price: 0}</TableCell>
                      <TableCell align="center">{tx.target_token_price? tx.target_token_price: 0}</TableCell>
                      <TableCell align="center">{tx.created_at}</TableCell>
                      <TableCell align="center">{tx.completed_at}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              page={page}
              count={page * rowsPerPage + data.data.length}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              nextIconButtonProps={{ disabled: !data.has_more }}
            />
        </TableContainer>
      </Box>
      </LoadingOverlay>
    </Paper>
  );
};

export default Tx_History;