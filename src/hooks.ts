// See https://redux-toolkit.js.org/tutorials/typescript#define-typed-hooks
import { useDispatch, useSelector } from "react-redux"
import type { TypedUseSelectorHook } from "react-redux"
import type { RootState, AppDispatch } from "./reducers"
import { useEffect, useCallback } from 'react';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector




export function useKeyPress(targetKey: string, callback: () => void, metaRequired: boolean = false) {
    // Function that handles key presses
    const handleKeyPress = useCallback(
      (event: KeyboardEvent) => {
        // Check if the pressed key matches the target key and if meta key is required (Cmd or Ctrl)
        const isMetaPressed = metaRequired ? (event.metaKey || event.ctrlKey) : true;
        
        if (event.key === targetKey && isMetaPressed) {
          callback(); // Trigger the callback if the conditions are met
        }
      },
      [targetKey, callback, metaRequired] // Dependencies
    );
  
    useEffect(() => {
      // Add event listener for keydown when the component mounts
      window.addEventListener('keydown', handleKeyPress);
  
      // Clean up the event listener when the component unmounts or dependencies change
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }, [handleKeyPress]);
  
    return;
  }