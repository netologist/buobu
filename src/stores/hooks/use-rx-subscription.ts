'use client';

import { useEffect, useMemo } from 'react';
import { atom, useSetAtom } from 'jotai';
import type { WritableAtom } from 'jotai';
import type { RxCollection, MangoQuery, RxDocument } from 'rxdb';
import type { Collections } from '@/lib/rxdb';
import { useDbStore } from '../db-store';

const noopLoadingAtom = atom(false, () => {});

type CollectionName = keyof Collections;
type CollectionDoc<TName extends CollectionName> = Collections[TName] extends RxCollection<infer TDoc>
  ? TDoc
  : never;
type ReactiveStream<TDoc> = {
  subscribe: (observer: {
    next: (results: RxDocument<TDoc>[]) => void;
    error?: (error: unknown) => void;
  }) => { unsubscribe: () => void };
};

function getTypedCollection<TName extends CollectionName>(
  collections: Collections,
  collectionName: TName
): Collections[TName] {
  return collections[collectionName];
}

/**
 * Bridge hook: Subscribes to an RxDB reactive query and syncs results into a Jotai atom.
 * 
 * This replaces the pattern of:
 *   useEffect(() => { collection.find().exec().then(setData) }, [])
 * 
 * With a reactive subscription that automatically updates the atom whenever
 * the underlying RxDB data changes (local mutations, sync from remote, imports, etc.).
 * 
 * @param collectionName - Name of the RxDB collection to subscribe to
 * @param query - RxDB MangoQuery selector
 * @param targetAtom - Jotai writable atom to sync results into
 * @param loadingAtom - Optional Jotai atom to track loading state
 */
export function useRxSubscription<TName extends CollectionName>(
  collectionName: TName,
  query: MangoQuery<CollectionDoc<TName>>,
  targetAtom: WritableAtom<CollectionDoc<TName>[], [CollectionDoc<TName>[]], void>,
  loadingAtom?: WritableAtom<boolean, [boolean], void>
): void {
  const db = useDbStore((s) => s.db);
  const setData = useSetAtom(targetAtom);
  const setLoading = useSetAtom(loadingAtom ?? noopLoadingAtom);
  const querySignature = useMemo(() => JSON.stringify(query), [query]);

  useEffect(() => {
    if (!db) return;

    const collection = getTypedCollection(db.collections, collectionName);

    setLoading(true);
    const parsedQuery = JSON.parse(querySignature) as MangoQuery<CollectionDoc<TName>>;

    // Subscribe to reactive query — emits on every data change
    const stream = collection.find(parsedQuery).$ as unknown as ReactiveStream<CollectionDoc<TName>>;
    const subscription = stream.subscribe({
        next: (results: RxDocument<CollectionDoc<TName>>[]) => {
          const data = results.map((doc) => doc.toMutableJSON()) as CollectionDoc<TName>[];
          setData(data);
          setLoading(false);
        },
        error: () => {
          setLoading(false);
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [db, collectionName, querySignature, setData, setLoading]);
}

/**
 * Subscribe to all non-deleted documents in a collection.
 * Most common pattern — replaces getAllXxx() one-shot queries.
 */
export function useRxCollectionSubscription<TName extends CollectionName>(
  collectionName: TName,
  targetAtom: WritableAtom<CollectionDoc<TName>[], [CollectionDoc<TName>[]], void>,
  loadingAtom?: WritableAtom<boolean, [boolean], void>
): void {
  useRxSubscription(
    collectionName,
    { selector: { _deleted: false } } as MangoQuery<CollectionDoc<TName>>,
    targetAtom,
    loadingAtom
  );
}

/**
 * Subscribe to documents filtered by boardId.
 * Replaces getXxxByBoard() one-shot queries.
 */
export function useRxBoardSubscription<TName extends CollectionName>(
  collectionName: TName,
  boardId: string | null | undefined,
  targetAtom: WritableAtom<CollectionDoc<TName>[], [CollectionDoc<TName>[]], void>,
  loadingAtom?: WritableAtom<boolean, [boolean], void>
): void {
  useRxSubscription(
    collectionName,
    boardId
      ? ({ selector: { boardId, _deleted: false } } as MangoQuery<CollectionDoc<TName>>)
      : ({ selector: { _deleted: false } } as MangoQuery<CollectionDoc<TName>>),
    targetAtom,
    loadingAtom
  );
}
