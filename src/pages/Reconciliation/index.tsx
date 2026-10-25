import { useState } from 'react';
import { useSelector } from 'react-redux';
import LoadingOverlay from 'react-loading-overlay-ts';
import { Box, Container, Typography } from '@mui/material';
import { ADMIN_FLAG } from 'src/config';
import { RootState } from 'src/store';
import SolReconciliationTab from '../Monitor/SolReconciliationTab';

const Reconciliation = () => {
  const { is_super_admin } = useSelector((state: RootState) => state.admin);
  const isSuperAdmin = is_super_admin || localStorage.getItem(ADMIN_FLAG) === '1';
  const [loading, setLoading] = useState(false);

  return (
    <main>
      <Container maxWidth="xl">
        <LoadingOverlay
          active={loading}
          spinner
          styles={{
            wrapper: (base) => ({
              ...base,
              width: '100%',
            }),
          }}
        >
          <Box mt={3}>
            <Typography variant="h4" component="h1" sx={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
              Reconciliation
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.75)' }}>
              Compare SOL balances and make balance adjustments.
            </Typography>
          </Box>

          <Box mt={3}>
            <SolReconciliationTab
              setGlobalLoading={setLoading}
              unauthorized={!isSuperAdmin}
            />
          </Box>
        </LoadingOverlay>
      </Container>
    </main>
  );
};

export default Reconciliation;
