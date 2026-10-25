import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import "./index.css";
import 'nprogress/nprogress.css';
import App from 'src/App';
import { SidebarProvider } from 'src/contexts/SidebarContext';
import { FocusedModeProvider } from 'src/contexts/FocusedModeContext';
import * as serviceWorker from 'src/serviceWorker';
import { store, persistor } from './store';
import { PersistGate } from 'redux-persist/integration/react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AppWalletProvider from './layouts/app-wallet-provider';

import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');

createRoot(container).render(
  <AppWalletProvider>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <HelmetProvider>
            <FocusedModeProvider>
              <SidebarProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </SidebarProvider>
            </FocusedModeProvider>
          </HelmetProvider>
        </LocalizationProvider>
      </PersistGate>
    </Provider>
    <ToastContainer
      position="top-center"
      autoClose={2500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable={false}
      theme="dark"
      transition={Slide}
      toastClassName="vanish-toast"
      progressClassName="vanish-toast-progress"
    />
  </AppWalletProvider>
);

serviceWorker.unregister();
