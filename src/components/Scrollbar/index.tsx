import { FC, ReactNode } from 'react';
import { Box } from '@mui/material';

interface ScrollbarProps {
  className?: string;
  children?: ReactNode;
}

const Scrollbar: FC<ScrollbarProps> = ({ className, children }) => {
  return (
    <Box
      className={className}
      sx={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': { width: 5 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 4,
          '&:hover': { background: 'rgba(255,255,255,0.2)' },
        },
      }}
    >
      {children}
    </Box>
  );
};

export default Scrollbar;
