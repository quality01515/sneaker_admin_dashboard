import { Helmet } from 'react-helmet-async';
import Header from 'src/components/Header';
import PageTitleWrapper from 'src/components/PageTitleWrapper';
import Admins_Table from './manage_admin';
import { Grid, Container, Button, Box } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
const Dashboard = () => {
  return (
    <main>
      <Container maxWidth="xl">
        <Box mt={4}>
          <Admins_Table />
        </Box>
      </Container>
    </main>
  );
};

export default Dashboard;
