import { create } from "zustand";

type User = {
  displayName: string;
  email: string;
  address: string;
};

type userActions = {
  setUser: (user: User) => void;
  resetUser: () => void;
  updateDisplayName: (displayName: User["displayName"]) => void;
  updateEmail: (email: User["email"]) => void;
  updateAddress: (address: User["address"]) => void;
};

const initialUserState: User = {
  displayName: "",
  email: "",
  address: "",
};

export const useUserStore = create<User & userActions>((set) => ({
  ...initialUserState,

  setUser: (user) => set(user),
  resetUser: () => set(initialUserState),

  updateDisplayName: (displayName) => set({ displayName }),
  updateEmail: (email) => set({ email }),
  updateAddress: (address) => set({ address }),
}));
