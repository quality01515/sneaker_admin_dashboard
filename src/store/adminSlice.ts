import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AdminState {
  is_admin: boolean;
  is_super_admin: boolean;
  hasCheckedRole: boolean;
}

const initialState: AdminState = {
  is_admin: false,
  is_super_admin: false,
  hasCheckedRole: false
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setAdminStatus(state, action: PayloadAction<Partial<AdminState>>) {
      state.is_admin = action.payload.is_admin ?? false;
      state.is_super_admin = action.payload.is_super_admin ?? false;
      state.hasCheckedRole = action.payload.hasCheckedRole ?? true;
    },
    resetAdminStatus(state) {
      state.is_admin = false;
      state.is_super_admin = false;
      state.hasCheckedRole = false;
    }
  }
});

export const { setAdminStatus, resetAdminStatus } = adminSlice.actions;

export default adminSlice.reducer;
