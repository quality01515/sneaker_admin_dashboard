import { FC, ReactNode } from 'react';
import { Box, styled } from '@mui/material';

const PageTitle = styled(Box)(
  ({ theme }) => `
    padding: ${theme.spacing(0, 0, 2.5)};
`
);

interface PageTitleWrapperProps {
  children?: ReactNode;
}

const PageTitleWrapper: FC<PageTitleWrapperProps> = ({ children }) => {
  return <PageTitle className="MuiPageTitle-wrapper">{children}</PageTitle>;
};

export default PageTitleWrapper;
