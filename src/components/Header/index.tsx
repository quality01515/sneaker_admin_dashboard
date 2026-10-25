import { Typography, Grid } from '@mui/material';

function Header({ pageName }: { pageName: string }) {
  return (
    <Grid container justifyContent="space-between" alignItems="center">
      <Grid item>
        <Typography variant="h3" component="h3" gutterBottom>
          {pageName}
        </Typography>
      </Grid>
    </Grid>
  );
}

export default Header;
