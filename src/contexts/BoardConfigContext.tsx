import { createContext, useContext, type ReactNode } from "react";

type BoardConfigContextValue = {
  archiveColumnId: string;
  routineTitleById: Record<string, string>;
};

const BoardConfigContext = createContext<BoardConfigContextValue | null>(null);

export function BoardConfigProvider({
  archiveColumnId,
  routineTitleById,
  children,
}: BoardConfigContextValue & { children: ReactNode }) {
  return (
    <BoardConfigContext.Provider value={{ archiveColumnId, routineTitleById }}>
      {children}
    </BoardConfigContext.Provider>
  );
}

export function useBoardConfig(): BoardConfigContextValue {
  const ctx = useContext(BoardConfigContext);
  if (!ctx) throw new Error("useBoardConfig must be used inside BoardConfigProvider");
  return ctx;
}
