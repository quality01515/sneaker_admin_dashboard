import { createSlice } from '@reduxjs/toolkit';

export const initialAuthState = {
  token: {
    access_token: '',
    expiry_date: 0,
    id_token: '',
    refresh_token: '',
    scope: '',
    token_type: ''
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,

  reducers: {
    setToken(state, action) {
      state.token = action.payload;
    }
  }
});

export const { setToken } = authSlice.actions;

export default authSlice.reducer;
