import type { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useEffect, useRef } from "react";

export function useTrueSheetVisibility(
  sheetRef: React.RefObject<TrueSheet | null>,
  visible: boolean
) {
  const hasPresented = useRef(false);

  useEffect(() => {
    if (visible) {
      hasPresented.current = true;
      sheetRef.current?.present();
    } else if (hasPresented.current) {
      hasPresented.current = false;
      sheetRef.current?.dismiss();
    }
  }, [visible, sheetRef]);
}
