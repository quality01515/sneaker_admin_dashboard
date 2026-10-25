import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

function Logo() {
  return (
    <Box
      component={Link}
      to="/"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        textDecoration: 'none',
        py: 1,
        opacity: { xs: 0.2, sm: 0.4, md: 0.55 },
      }}
    >
      <Box
        component="img"
        src="/snake_no_background.png"
        alt=""
        sx={{
          width: 50,
          height: 50,
          flexShrink: 0,
          filter: 'invert(1)',
          display: 'block',
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', lineHeight: 1, mt: 1.5 }}>
        <Typography
          sx={{
            fontSize: 27,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontFamily: 'inherit',
          }}
        >
          Vanish
        </Typography>
        <Typography
          sx={{
            fontSize: 27,
            fontWeight: 400,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontFamily: 'inherit',
          }}
        >
          Labs
        </Typography>
      </Box>
    </Box>
  );
}

export default Logo;
