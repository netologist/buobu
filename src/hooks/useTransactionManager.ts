import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { nanoid } from "nanoid";

import type { Task } from "@/lib/types";

type TransactionManagerOptions = {
  draftTask: Task | null;
  setDraftTask: Dispatch<SetStateAction<Task | null>>;
  getCurrencyForSwimlane: (swimlaneId: string) => string;
};

export function useTransactionManager(options: TransactionManagerOptions) {
  const { setDraftTask, getCurrencyForSwimlane } = options;
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionNote, setTransactionNote] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingTransactionDraft, setEditingTransactionDraft] = useState<{
    type: "income" | "expense";
    amount: string;
    note: string;
    date: string;
  } | null>(null);

  const addTransaction = useCallback((input?: {
    amount?: number | string;
    note?: string;
    date?: string;
    type?: "income" | "expense";
  }) => {
    const amount = Number(input?.amount ?? transactionAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setDraftTask((current) => {
      if (!current) return current;
      const currency = getCurrencyForSwimlane(current.swimlaneId);
      return {
        ...current,
        transactions: [
          ...current.transactions,
          {
            id: nanoid(),
            type: input?.type ?? transactionType,
            amount,
            currency,
            note: (input?.note ?? transactionNote).trim() ? (input?.note ?? transactionNote).trim() : undefined,
            date: (input?.date ?? transactionDate) || undefined,
          },
        ],
      };
    });
    setTransactionAmount("");
    setTransactionNote("");
    setTransactionDate("");
  }, [getCurrencyForSwimlane, setDraftTask, transactionAmount, transactionDate, transactionNote, transactionType]);

  const removeTransaction = useCallback((transactionId: string) => {
    setDraftTask((current) => (current ? {
      ...current,
      transactions: current.transactions.filter((item) => item.id !== transactionId),
    } : current));
  }, [setDraftTask]);

  const updateTransaction = useCallback((transactionId: string, patch: Partial<Task["transactions"][number]>) => {
    setDraftTask((current) => (current ? {
      ...current,
      transactions: current.transactions.map((tx) => tx.id === transactionId ? { ...tx, ...patch } : tx),
    } : current));
  }, [setDraftTask]);

  const startEditTransaction = useCallback((tx: Task["transactions"][number]) => {
    setEditingTransactionId(tx.id);
    setEditingTransactionDraft({
      type: tx.type,
      amount: String(tx.amount),
      note: tx.note ?? "",
      date: tx.date ?? "",
    });
  }, []);

  const saveEditTransaction = useCallback(() => {
    if (!editingTransactionId || !editingTransactionDraft) return;
    updateTransaction(editingTransactionId, {
      type: editingTransactionDraft.type,
      amount: Number(editingTransactionDraft.amount || 0),
      note: editingTransactionDraft.note,
      date: editingTransactionDraft.date,
    });
    setEditingTransactionId(null);
    setEditingTransactionDraft(null);
  }, [editingTransactionDraft, editingTransactionId, updateTransaction]);

  const cancelEditTransaction = useCallback(() => {
    setEditingTransactionId(null);
    setEditingTransactionDraft(null);
  }, []);

  return {
    transactionType,
    transactionAmount,
    transactionNote,
    transactionDate,
    editingTransactionId,
    editingTransactionDraft,
    setTransactionType,
    setTransactionAmount,
    setTransactionNote,
    setTransactionDate,
    setEditingTransactionId,
    setEditingTransactionDraft,
    addTransaction,
    removeTransaction,
    updateTransaction,
    startEditTransaction,
    saveEditTransaction,
    cancelEditTransaction,
  };
}
