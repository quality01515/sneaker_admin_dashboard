import { createSlice } from '@reduxjs/toolkit';
import { CredentialType } from './userSliceTypes';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    logged: ''
  },

  reducers: {
    setLoginStatus(state, action) {
      state.logged = action.payload;
    }
  }
});

export const { setLoginStatus } = userSlice.actions;

export default userSlice.reducer;
