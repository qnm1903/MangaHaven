import { atom, createStore } from 'jotai';

// Explicit store singleton, must be shared between JotaiProvider and axios interceptor
// so that writes from outside React (interceptor) are visible to components.
export const jotaiStore = createStore();

// Flag to check if outside services are in maintenance or not
export const isMaintenanceModeAtom = atom<boolean>(false);