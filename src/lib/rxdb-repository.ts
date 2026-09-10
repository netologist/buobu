import { type Database } from './rxdb';
import type { Task, BacklogItem, Habit, HabitLog, VisionBoardItem, Note, Mindmap, Board, Swimlane, Bookmark, Routine, RoutineLog, Timeblock } from './types';
import { generateId } from './uuid';
import { getDeviceId } from './device-id';

type EntityWithMeta = {
  _version?: number;
  _createdAt?: string;
  _updatedAt?: string;
  _deleted?: boolean;
  _deviceId?: string;
  _modified?: number;
  user_id?: string;
};

function getBaseMetadata(userId: string) {
  const now = new Date().toISOString();
  return {
    _version: 1,
    _createdAt: now,
    _updatedAt: now,
    _modified: Date.now(),
    user_id: userId,
    _deleted: false,
    _deviceId: getDeviceId(),
  };
}

function getUpdatedMetadata(existing: EntityWithMeta, userId: string) {
  return {
    _version: (existing._version || 0) + 1,
    _createdAt: existing._createdAt,
    _updatedAt: new Date().toISOString(),
    _modified: Date.now(),
    user_id: existing.user_id || userId,
    _deleted: false,
    _deviceId: getDeviceId(),
  };
}

export class RxDBRepository {
  constructor(
    private db: Database,
    private userId: string
  ) {}

  async getTasksByBoard(boardId: string): Promise<Task[]> {
    const result = await this.db.tasks.find({
      selector: {
        boardId,
        _deleted: false,
      },
      sort: [{ order: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getTasksBySwimlane(swimlaneId: string): Promise<Task[]> {
    const result = await this.db.tasks.find({
      selector: {
        swimlaneId,
        _deleted: false,
      },
      sort: [{ order: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putTask(task: Partial<Task>): Promise<Task> {
    const existing = task.id ? await this.db.tasks.findOne(task.id).exec() : null;
    
    const taskData: Task = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...task,
      id: task.id || generateId(),
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as Task;

    if (existing) {
      await existing.patch(taskData);
      return existing.toMutableJSON();
    } else {
      await this.db.tasks.insert(taskData);
      return taskData;
    }
  }

  async putTasks(tasks: Partial<Task>[]): Promise<Task[]> {
    const results: Task[] = [];

    for (const task of tasks) {
      results.push(await this.putTask(task));
    }

    return results;
  }

  async deleteTask(taskId: string): Promise<void> {
    const doc = await this.db.tasks.findOne(taskId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  async getAllTasks(): Promise<Task[]> {
    const result = await this.db.tasks.find({
      selector: {
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getBacklogBySwimlane(swimlaneId: string): Promise<BacklogItem[]> {
    const result = await this.db.backlogs.find({
      selector: {
        swimlaneId,
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getBacklogCountsBySwimlane(swimlaneIds: string[]): Promise<Record<string, number>> {
    if (swimlaneIds.length === 0) return {};

    const result = await this.db.backlogs.find({
      selector: {
        swimlaneId: { $in: swimlaneIds },
        _deleted: false,
      },
    }).exec();

    const counts: Record<string, number> = Object.fromEntries(swimlaneIds.map((id) => [id, 0]));
    for (const doc of result) {
      const item = doc.toMutableJSON() as BacklogItem;
      counts[item.swimlaneId] = (counts[item.swimlaneId] ?? 0) + 1;
    }

    return counts;
  }

  async putBacklogItem(item: Partial<BacklogItem>): Promise<BacklogItem> {
    const existing = item.id ? await this.db.backlogs.findOne(item.id).exec() : null;
    
    const itemData: BacklogItem = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...item,
      id: item.id || generateId(),
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as BacklogItem;

    if (existing) {
      await existing.patch(itemData);
      return existing.toMutableJSON();
    } else {
      await this.db.backlogs.insert(itemData);
      return itemData;
    }
  }

  async deleteBacklogItem(itemId: string): Promise<void> {
    const doc = await this.db.backlogs.findOne(itemId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  async getAllBacklogItems(): Promise<BacklogItem[]> {
    const result = await this.db.backlogs.find({
      selector: {
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getHabitsByBoard(boardId: string): Promise<Habit[]> {
    const result = await this.db.habits.find({
      selector: {
        boardId,
        _deleted: false,
      },
      sort: [{ order: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getHabitsBySwimlane(swimlaneId: string): Promise<Habit[]> {
    const result = await this.db.habits.find({
      selector: {
        swimlaneId,
        _deleted: false,
      },
      sort: [{ order: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putHabit(habit: Partial<Habit>): Promise<Habit> {
    const existing = habit.id ? await this.db.habits.findOne(habit.id).exec() : null;
    
    const habitData: Habit = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...habit,
      id: habit.id || generateId(),
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as Habit;

    if (existing) {
      await existing.patch(habitData);
      return existing.toMutableJSON();
    } else {
      await this.db.habits.insert(habitData);
      return habitData;
    }
  }

  async deleteHabit(habitId: string): Promise<void> {
    const doc = await this.db.habits.findOne(habitId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  async getHabitLogsByHabit(habitId: string): Promise<HabitLog[]> {
    const result = await this.db.habitLogs.find({
      selector: {
        habitId,
        _deleted: false,
      },
      sort: [{ date: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putHabitLog(log: Partial<HabitLog>): Promise<HabitLog> {
    const existing = log.id ? await this.db.habitLogs.findOne(log.id).exec() : null;
    
    const logData: HabitLog = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...log,
      id: log.id || generateId(),
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as HabitLog;

    if (existing) {
      await existing.patch(logData);
      return existing.toMutableJSON();
    } else {
      await this.db.habitLogs.insert(logData);
      return logData;
    }
  }

  async deleteHabitLog(logId: string): Promise<void> {
    const doc = await this.db.habitLogs.findOne(logId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  async getAllHabitLogs(): Promise<HabitLog[]> {
    const result = await this.db.habitLogs.find({
      selector: {
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  // --- Whiteboard ---

  async getVisionItemsByBoard(boardId: string): Promise<VisionBoardItem[]> {
    const result = await this.db.visionItems.find({
      selector: {
        boardId,
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getVisionItemsBySwimlane(swimlaneId: string): Promise<VisionBoardItem[]> {
    const result = await this.db.visionItems.find({
      selector: {
        swimlaneId,
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getAllVisionItems(): Promise<VisionBoardItem[]> {
    const result = await this.db.visionItems.find({
      selector: {
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putVisionItem(item: Partial<VisionBoardItem>): Promise<VisionBoardItem> {
    const existing = item.id ? await this.db.visionItems.findOne(item.id).exec() : null;

    const itemData: VisionBoardItem = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...item,
      id: item.id || generateId(),
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as VisionBoardItem;

    if (existing) {
      await existing.patch(itemData);
      return existing.toMutableJSON();
    } else {
      await this.db.visionItems.insert(itemData);
      return itemData;
    }
  }

  async deleteVisionItem(itemId: string): Promise<void> {
    const doc = await this.db.visionItems.findOne(itemId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  // --- Notes ---

  async getNotesByBoard(boardId: string): Promise<Note[]> {
    const result = await this.db.notes.find({
      selector: {
        boardId,
        _deleted: false,
      },
      sort: [{ updatedAt: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getNotesBySwimlane(swimlaneId: string): Promise<Note[]> {
    const result = await this.db.notes.find({
      selector: {
        swimlaneId,
        _deleted: false,
      },
      sort: [{ updatedAt: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getAllNotes(): Promise<Note[]> {
    const result = await this.db.notes.find({
      selector: {
        _deleted: false,
      },
      sort: [{ updatedAt: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putNote(note: Partial<Note>): Promise<Note> {
    const existing = note.id ? await this.db.notes.findOne(note.id).exec() : null;

    const noteData: Note = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...note,
      id: note.id || generateId(),
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as Note;

    if (existing) {
      await existing.patch(noteData);
      return existing.toMutableJSON();
    } else {
      await this.db.notes.insert(noteData);
      return noteData;
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    const doc = await this.db.notes.findOne(noteId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  // --- Bookmarks ---

  async getBookmarksByBoard(boardId: string): Promise<Bookmark[]> {
    const result = await this.db.bookmarks.find({
      selector: {
        boardId,
        _deleted: false,
      },
      sort: [{ updatedAt: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getBookmarksBySwimlane(swimlaneId: string): Promise<Bookmark[]> {
    const result = await this.db.bookmarks.find({
      selector: {
        swimlaneId,
        _deleted: false,
      },
      sort: [{ updatedAt: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getAllBookmarks(): Promise<Bookmark[]> {
    const result = await this.db.bookmarks.find({
      selector: {
        _deleted: false,
      },
      sort: [{ updatedAt: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putBookmark(bookmark: Partial<Bookmark>): Promise<Bookmark> {
    const existing = bookmark.id ? await this.db.bookmarks.findOne(bookmark.id).exec() : null;

    const data: Bookmark = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...bookmark,
      id: bookmark.id || generateId(),
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as Bookmark;

    if (existing) {
      await existing.patch(data);
      return existing.toMutableJSON();
    } else {
      await this.db.bookmarks.insert(data);
      return data;
    }
  }

  async deleteBookmark(bookmarkId: string): Promise<void> {
    const doc = await this.db.bookmarks.findOne(bookmarkId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  // --- Mindmaps ---

  async getMindmapsByBoard(boardId: string): Promise<Mindmap[]> {
    const result = await this.db.mindmaps.find({
      selector: {
        boardId,
        _deleted: false,
      },
      sort: [{ updatedAt: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getMindmapsBySwimlane(swimlaneId: string): Promise<Mindmap[]> {
    const result = await this.db.mindmaps.find({
      selector: {
        swimlaneId,
        _deleted: false,
      },
      sort: [{ updatedAt: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getAllMindmaps(): Promise<Mindmap[]> {
    const result = await this.db.mindmaps.find({
      selector: {
        _deleted: false,
      },
      sort: [{ updatedAt: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putMindmap(mindmap: Partial<Mindmap>): Promise<Mindmap> {
    const existing = mindmap.id ? await this.db.mindmaps.findOne(mindmap.id).exec() : null;

    const data: Mindmap = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...mindmap,
      id: mindmap.id || generateId(),
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as Mindmap;

    if (existing) {
      await existing.patch(data);
      return existing.toMutableJSON();
    } else {
      await this.db.mindmaps.insert(data);
      return data;
    }
  }

  async deleteMindmap(mindmapId: string): Promise<void> {
    const doc = await this.db.mindmaps.findOne(mindmapId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  // --- Boards ---

  async getAllBoards(): Promise<Board[]> {
    const result = await this.db.boards.find({
      selector: {
        _deleted: false,
      },
    }).exec();
    
    const boards = result.map(doc => doc.toMutableJSON());

    // Sort by explicit order first, fall back to name
    boards.sort((a, b) => {
      const ao = a.order ?? 9999;
      const bo = b.order ?? 9999;
      if (ao !== bo) return ao - bo;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    
    // Fetch swimlanes for each board
    for (const board of boards) {
      const swimlanes = await this.getSwimlanesByBoard(board.id);
      board.swimlanes = swimlanes;
    }
    
    return boards;
  }

  async getBoardById(boardId: string): Promise<Board | null> {
    const doc = await this.db.boards.findOne(boardId).exec();
    if (!doc) return null;
    return doc.toMutableJSON();
  }

  async putBoard(board: Partial<Board>): Promise<Board> {
    const existing = board.id ? await this.db.boards.findOne(board.id).exec() : null;

    const now = new Date().toISOString();
    const boardData: Board = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...board,
      id: board.id || generateId(),
      createdAt: existing ? existing.toMutableJSON().createdAt : now,
      updatedAt: now,
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as Board;

    if (existing) {
      await existing.patch(boardData);
      return existing.toMutableJSON();
    } else {
      await this.db.boards.insert(boardData);
      return boardData;
    }
  }

  async deleteBoard(boardId: string): Promise<void> {
    const activeBoards = await this.db.boards.find({
      selector: { _deleted: false },
    }).exec();
    if (activeBoards.length <= 1) {
      throw new Error('Cannot delete the last board. Create another board first.');
    }

    const now = new Date().toISOString();
    
    const boardDoc = await this.db.boards.findOne(boardId).exec();
    if (boardDoc) {
      await boardDoc.patch({
        _deleted: true,
        _updatedAt: now,
        _version: (boardDoc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
    
    const swimlanes = await this.db.swimlanes.find({
      selector: { boardId, _deleted: false }
    }).exec();
    
    for (const swimlane of swimlanes) {
      await this.deleteSwimlane(swimlane.id, { skipLastGuard: true });
    }
  }

  // --- Swimlanes ---

  async getSwimlanesByBoard(boardId: string): Promise<Swimlane[]> {
    const result = await this.db.swimlanes.find({
      selector: {
        boardId,
        _deleted: false,
      },
      sort: [{ order: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getSwimlaneById(swimlaneId: string): Promise<Swimlane | null> {
    const doc = await this.db.swimlanes.findOne(swimlaneId).exec();
    if (!doc) return null;
    return doc.toMutableJSON();
  }

  async putSwimlane(swimlane: Partial<Swimlane>): Promise<Swimlane> {
    const existing = swimlane.id ? await this.db.swimlanes.findOne(swimlane.id).exec() : null;

    const now = new Date().toISOString();
    const swimlaneData: Swimlane = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...swimlane,
      id: swimlane.id || generateId(),
      createdAt: existing ? existing.toMutableJSON().createdAt : now,
      updatedAt: now,
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as Swimlane;

    if (existing) {
      await existing.patch(swimlaneData);
      return existing.toMutableJSON();
    } else {
      await this.db.swimlanes.insert(swimlaneData);
      return swimlaneData;
    }
  }

  async deleteSwimlane(swimlaneId: string, options?: { skipLastGuard?: boolean }): Promise<void> {
    const now = new Date().toISOString();
    
    const swimlaneDoc = await this.db.swimlanes.findOne(swimlaneId).exec();
    if (!swimlaneDoc) return;

    const swimlane = swimlaneDoc.toMutableJSON();
    if (!options?.skipLastGuard && swimlane.boardId) {
      const activeSwimlanes = await this.db.swimlanes.find({
        selector: { boardId: swimlane.boardId, _deleted: false },
      }).exec();
      if (activeSwimlanes.length <= 1) {
        throw new Error('Cannot delete the last swimlane in a board. Create another swimlane first.');
      }
    }

    if (swimlaneDoc) {
      await swimlaneDoc.patch({
        _deleted: true,
        _updatedAt: now,
        _version: (swimlaneDoc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
    
    const collections = [
      this.db.tasks,
      this.db.habits,
      this.db.notes,
      this.db.bookmarks,
      this.db.visionItems,
      this.db.mindmaps,
      this.db.backlogs,
    ];
    
    for (const collection of collections) {
      const docs = await collection.find({
        selector: { swimlaneId }
      }).exec();
      
      for (const doc of docs) {
        await doc.patch({
          _deleted: true,
          _updatedAt: now,
          _version: (doc.toMutableJSON()._version || 0) + 1,
          _modified: Date.now(),
        });
      }
    }
    
    const habits = await this.db.habits.find({
      selector: { swimlaneId }
    }).exec();
    const habitIds = habits.map(h => h.id);
    
    for (const habitId of habitIds) {
      const habitLogs = await this.db.habitLogs.find({
        selector: { habitId }
      }).exec();
      
      for (const log of habitLogs) {
        await log.patch({
          _deleted: true,
          _updatedAt: now,
          _version: (log.toMutableJSON()._version || 0) + 1,
          _modified: Date.now(),
        });
      }
    }
  }

  // --- Archive Operations ---

  private async archiveCollection(collectionName: string, swimlaneId: string, timestamp: string): Promise<void> {
    const collection = (this.db as unknown as Record<string, import('rxdb').RxCollection>)[collectionName];
    if (!collection) return;

    const docs = await collection.find({
      selector: { swimlaneId, _deleted: false },
    }).exec();

    for (const doc of docs) {
      const json = doc.toMutableJSON();
      await doc.patch({
        archived: true,
        archivedAt: timestamp,
        _updatedAt: new Date().toISOString(),
        _version: (json._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  private async unarchiveCollection(collectionName: string, swimlaneId: string): Promise<void> {
    const collection = (this.db as unknown as Record<string, import('rxdb').RxCollection>)[collectionName];
    if (!collection) return;

    const docs = await collection.find({
      selector: { swimlaneId, archived: true, _deleted: false },
    }).exec();

    for (const doc of docs) {
      const json = doc.toMutableJSON();
      await doc.patch({
        archived: false,
        archivedAt: null,
        _updatedAt: new Date().toISOString(),
        _version: (json._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  async archiveBoard(boardId: string): Promise<void> {
    const now = new Date().toISOString();

    // 1. Archive the board
    await this.putBoard({ id: boardId, archived: true, archivedAt: now });

    // 2. Get all swimlanes for this board
    const swimlanes = await this.getSwimlanesByBoard(boardId);

    // 3. Archive each swimlane + its children
    for (const swimlane of swimlanes) {
      await this.archiveSwimlane(swimlane.id, now);
    }
  }

  async archiveSwimlane(swimlaneId: string, timestamp?: string): Promise<void> {
    const now = timestamp || new Date().toISOString();

    // 1. Archive the swimlane
    await this.putSwimlane({ id: swimlaneId, archived: true, archivedAt: now });

    // 2. Archive all children (parallel per collection)
    await Promise.all([
      this.archiveCollection('tasks', swimlaneId, now),
      this.archiveCollection('habits', swimlaneId, now),
      this.archiveCollection('notes', swimlaneId, now),
      this.archiveCollection('mindmaps', swimlaneId, now),
      this.archiveCollection('visionItems', swimlaneId, now),
      this.archiveCollection('backlogs', swimlaneId, now),
      this.archiveCollection('bookmarks', swimlaneId, now),
      this.archiveCollection('timeblocks', swimlaneId, now),
    ]);
  }

  async unarchiveBoard(boardId: string): Promise<void> {
    // Unarchive board only — swimlanes remain archived, user must explicitly restore each
    await this.putBoard({ id: boardId, archived: false, archivedAt: null });
  }

  async unarchiveSwimlane(swimlaneId: string): Promise<void> {
    // Unarchive swimlane + all children
    await this.putSwimlane({ id: swimlaneId, archived: false, archivedAt: null });

    await Promise.all([
      this.unarchiveCollection('tasks', swimlaneId),
      this.unarchiveCollection('habits', swimlaneId),
      this.unarchiveCollection('notes', swimlaneId),
      this.unarchiveCollection('mindmaps', swimlaneId),
      this.unarchiveCollection('visionItems', swimlaneId),
      this.unarchiveCollection('backlogs', swimlaneId),
      this.unarchiveCollection('bookmarks', swimlaneId),
      this.unarchiveCollection('timeblocks', swimlaneId),
    ]);
  }

  async permanentDeleteBoard(boardId: string): Promise<void> {
    // Permanently delete an archived board and cascade to all children
    const swimlanes = await this.getSwimlanesByBoard(boardId);
    for (const swimlane of swimlanes) {
      await this.deleteSwimlane(swimlane.id, { skipLastGuard: true });
    }
    const boardDoc = await this.db.boards.findOne(boardId).exec();
    if (boardDoc) {
      await boardDoc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (boardDoc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  async permanentDeleteSwimlane(swimlaneId: string): Promise<void> {
    await this.deleteSwimlane(swimlaneId, { skipLastGuard: true });
  }

  // --- Routines ---

  async getAllRoutines(): Promise<Routine[]> {
    const result = await this.db.routines.find({
      selector: {
        user_id: this.userId,
        _deleted: false,
      },
      sort: [{ order: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getRoutinesBySwimlane(swimlaneId: string): Promise<Routine[]> {
    const result = await this.db.routines.find({
      selector: {
        swimlaneId,
        _deleted: false,
      },
      sort: [{ order: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putRoutine(routine: Partial<Routine>): Promise<Routine> {
    const existing = routine.id ? await this.db.routines.findOne(routine.id).exec() : null;
    const now = new Date().toISOString();
    const routineData: Routine = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...routine,
      id: routine.id || generateId(),
      createdAt: existing ? existing.toMutableJSON().createdAt : now,
      updatedAt: now,
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as Routine;
    if (existing) {
      await existing.patch(routineData);
      return existing.toMutableJSON();
    } else {
      await this.db.routines.insert(routineData);
      return routineData;
    }
  }

  async deleteRoutine(routineId: string): Promise<void> {
    const doc = await this.db.routines.findOne(routineId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  async archiveRoutine(routineId: string): Promise<void> {
    const doc = await this.db.routines.findOne(routineId).exec();
    if (doc) {
      const now = new Date().toISOString();
      await doc.patch({
        archived: true,
        archivedAt: now,
        _updatedAt: now,
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  // --- RoutineLogs ---

  async getAllRoutineLogs(): Promise<RoutineLog[]> {
    const result = await this.db.routineLogs.find({
      selector: {
        user_id: this.userId,
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putRoutineLog(log: Partial<RoutineLog>): Promise<RoutineLog> {
    const existing = log.id ? await this.db.routineLogs.findOne(log.id).exec() : null;
    const now = new Date().toISOString();
    const logData: RoutineLog = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...log,
      id: log.id || generateId(),
      createdAt: existing ? existing.toMutableJSON().createdAt : now,
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as RoutineLog;
    if (existing) {
      await existing.patch(logData);
      return existing.toMutableJSON();
    } else {
      await this.db.routineLogs.insert(logData);
      return logData;
    }
  }

  async deleteRoutineLog(logId: string): Promise<void> {
    const doc = await this.db.routineLogs.findOne(logId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
    }
  }

  async getRoutineLogsByRoutine(routineId: string): Promise<RoutineLog[]> {
    const result = await this.db.routineLogs.find({
      selector: {
        routineId,
        _deleted: false,
      },
      sort: [{ date: 'desc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  // --- Timeblocks ---

  private recurrenceToFrequencyDays(timeblock: Timeblock): number[] {
    if (timeblock.recurrence.type === 'daily') return [0, 1, 2, 3, 4, 5, 6];
    if (timeblock.recurrence.type === 'weekly') {
      return timeblock.recurrence.daysOfWeek && timeblock.recurrence.daysOfWeek.length > 0
        ? timeblock.recurrence.daysOfWeek
        : [0, 1, 2, 3, 4, 5, 6];
    }
    return [];
  }

  private async getProjectionHabitsForTimeblock(timeblockId: string): Promise<Habit[]> {
    const result = await this.db.habits.find({
      selector: {
        sourceType: 'timeblock',
        sourceTimeblockId: timeblockId,
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  private async archiveTimeblockProjectionHabits(timeblockId: string, timestamp?: string): Promise<void> {
    const now = timestamp || new Date().toISOString();
    const habits = await this.getProjectionHabitsForTimeblock(timeblockId);
    await Promise.all(habits.map((habit) => this.putHabit({
      ...habit,
      archived: true,
      archivedAt: now,
      updatedAt: now,
    })));
  }

  private async softDeleteTimeblockProjectionHabits(timeblockId: string): Promise<void> {
    const habits = await this.getProjectionHabitsForTimeblock(timeblockId);
    await Promise.all(habits.map((habit) => this.deleteHabit(habit.id)));
  }

  private async syncTimeblockProjectionHabit(timeblock: Timeblock): Promise<void> {
    const existingProjectionHabits = await this.getProjectionHabitsForTimeblock(timeblock.id);
    if (!timeblock.showAsHabit || timeblock.archived) {
      await this.archiveTimeblockProjectionHabits(timeblock.id);
      return;
    }

    const now = new Date().toISOString();
    const currentProjection = existingProjectionHabits[0] ?? null;
    await this.putHabit({
      ...(currentProjection ?? {}),
      id: currentProjection?.id || generateId(),
      boardId: timeblock.boardId,
      swimlaneId: timeblock.swimlaneId,
      title: timeblock.title,
      color: timeblock.color ?? currentProjection?.color,
      order: timeblock.order ?? currentProjection?.order,
      breakHabit: false,
      frequencyDays: this.recurrenceToFrequencyDays(timeblock),
      timeblockId: timeblock.id,
      sourceType: 'timeblock',
      sourceTimeblockId: timeblock.id,
      archived: false,
      archivedAt: null,
      createdAt: currentProjection?.createdAt ?? now,
      updatedAt: now,
    });
  }

  async getAllTimeblocks(): Promise<Timeblock[]> {
    const result = await this.db.timeblocks.find({
      selector: {
        user_id: this.userId,
        _deleted: false,
      },
      sort: [{ order: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getTimeblocksBySwimlane(swimlaneId: string): Promise<Timeblock[]> {
    const result = await this.db.timeblocks.find({
      selector: {
        swimlaneId,
        _deleted: false,
      },
      sort: [{ order: 'asc' }],
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getHabitsByTimeblock(timeblockId: string): Promise<Habit[]> {
    const result = await this.db.habits.find({
      selector: {
        timeblockId,
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async getRoutinesByTimeblock(timeblockId: string): Promise<Routine[]> {
    const result = await this.db.routines.find({
      selector: {
        timeblockId,
        _deleted: false,
      },
    }).exec();
    return result.map(doc => doc.toMutableJSON());
  }

  async putTimeblock(timeblock: Partial<Timeblock>): Promise<Timeblock> {
    const existing = timeblock.id ? await this.db.timeblocks.findOne(timeblock.id).exec() : null;
    const now = new Date().toISOString();
    const timeblockData: Timeblock = {
      ...(existing ? existing.toMutableJSON() : {}),
      ...timeblock,
      id: timeblock.id || generateId(),
      showAsHabit: typeof timeblock.showAsHabit === 'boolean'
        ? timeblock.showAsHabit
        : (existing?.toMutableJSON().showAsHabit ?? false),
      createdAt: existing ? existing.toMutableJSON().createdAt : now,
      updatedAt: now,
      ...(existing ? getUpdatedMetadata(existing.toMutableJSON(), this.userId) : getBaseMetadata(this.userId)),
    } as Timeblock;
    if (existing) {
      await existing.patch(timeblockData);
      const saved = existing.toMutableJSON() as Timeblock;
      await this.syncTimeblockProjectionHabit(saved);
      return saved;
    } else {
      await this.db.timeblocks.insert(timeblockData);
      await this.syncTimeblockProjectionHabit(timeblockData);
      return timeblockData;
    }
  }

  async deleteTimeblock(timeblockId: string): Promise<void> {
    const doc = await this.db.timeblocks.findOne(timeblockId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
      await this.softDeleteTimeblockProjectionHabits(timeblockId);
    }
  }

  async archiveTimeblock(timeblockId: string, timestamp?: string): Promise<void> {
    const doc = await this.db.timeblocks.findOne(timeblockId).exec();
    if (doc) {
      const now = timestamp || new Date().toISOString();
      await doc.patch({
        archived: true,
        archivedAt: now,
        _updatedAt: now,
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
      await this.archiveTimeblockProjectionHabits(timeblockId, now);
    }
  }

  async unarchiveTimeblock(timeblockId: string): Promise<void> {
    const doc = await this.db.timeblocks.findOne(timeblockId).exec();
    if (doc) {
      const now = new Date().toISOString();
      await doc.patch({
        archived: false,
        archivedAt: null,
        _updatedAt: now,
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
      await this.syncTimeblockProjectionHabit(doc.toMutableJSON() as Timeblock);
    }
  }

  async permanentDeleteTimeblock(timeblockId: string): Promise<void> {
    const doc = await this.db.timeblocks.findOne(timeblockId).exec();
    if (doc) {
      await doc.patch({
        _deleted: true,
        _updatedAt: new Date().toISOString(),
        _version: (doc.toMutableJSON()._version || 0) + 1,
        _modified: Date.now(),
      });
      await this.softDeleteTimeblockProjectionHabits(timeblockId);
    }
  }

  /**
   * Detach all habits and routines from a timeblock (set timeblockId → null).
   * Used before archiving a timeblock when user chooses not to cascade.
   */
  async detachFromTimeblock(timeblockId: string): Promise<void> {
    const now = new Date().toISOString();
    const habits = await this.getHabitsByTimeblock(timeblockId);
    const routines = await this.getRoutinesByTimeblock(timeblockId);
    await Promise.all([
      ...habits.map(h => this.putHabit({ ...h, timeblockId: null })),
      ...routines.map(r => this.putRoutine({ ...r, timeblockId: null })),
    ]);
    void now; // suppress lint
  }
}
