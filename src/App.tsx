import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import { CssBaseline } from '@mui/material';
import { CookiesProvider } from 'react-cookie';
import ThemeProvider from './theme/ThemeProvider';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <ThemeProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <CookiesProvider>
          <AppRoutes />
        </CookiesProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
export default App;
