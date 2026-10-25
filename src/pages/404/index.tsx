import {
  Box,
  Card,
  Typography,
  Container,
  Button,
  styled
} from '@mui/material';
import { Helmet } from 'react-helmet-async';

const MainContent = styled(Box)`
  height: 100%;
  display: flex;
  flex: 1;
  overflow: auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

function Status404() {
  return (
    <>
      <Helmet>
        <title>Page Not Found!</title>
      </Helmet>
      <MainContent>
        <Container maxWidth="md">
          <Box textAlign="center">
            <img alt="404" height={180} src="/static/images/status/404.svg" />
            <Typography variant="h2" sx={{ my: 2 }}>
              The page you were looking for doesn't exist.
            </Typography>
          </Box>
          <Card sx={{ textAlign: 'center', mt: 3, p: 4 }}>
            <Button href="/" variant="outlined">
              Go to homepage
            </Button>
          </Card>
        </Container>
      </MainContent>
    </>
  );
}

export default Status404;
