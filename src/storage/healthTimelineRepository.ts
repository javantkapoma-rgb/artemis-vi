import type { HealthEvent, HealthAlert } from "../types/healthTimeline";

const DB_NAME = "ASTRA_HEALTH_DB";
const DB_VERSION = 1;
const EVENT_STORE = "health_events";
const ALERT_STORE = "health_alerts";

let dbInstance: IDBDatabase | null = null;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(EVENT_STORE)) {
        const events = database.createObjectStore(EVENT_STORE, { keyPath: "id" });
        events.createIndex("astronautId", "astronautId", { unique: false });
        events.createIndex("timestamp", "timestamp", { unique: false });
        events.createIndex("type", "type", { unique: false });
        events.createIndex("astronaut_timestamp", ["astronautId", "timestamp"], { unique: false });
      }

      if (!database.objectStoreNames.contains(ALERT_STORE)) {
        const alerts = database.createObjectStore(ALERT_STORE, { keyPath: "id" });
        alerts.createIndex("astronautId", "astronautId", { unique: false });
        alerts.createIndex("triggeredAt", "triggeredAt", { unique: false });
        alerts.createIndex("acknowledged", "acknowledged", { unique: false });
        alerts.createIndex("ruleId", "ruleId", { unique: false });
        alerts.createIndex("astronaut_triggered", ["astronautId", "triggeredAt"], { unique: false });
      }
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class HealthTimelineRepository {
  async saveEvent(event: HealthEvent): Promise<void> {
    const database = await openDatabase();
    const tx = database.transaction([EVENT_STORE], "readwrite");
    await requestToPromise(tx.objectStore(EVENT_STORE).put(event));
  }

  async saveEvents(events: HealthEvent[]): Promise<void> {
    if (events.length === 0) return;
    const database = await openDatabase();
    const tx = database.transaction([EVENT_STORE], "readwrite");
    const store = tx.objectStore(EVENT_STORE);
    await Promise.all(events.map((event) => requestToPromise(store.put(event))));
  }

  async getEvents(astronautId: string, from?: number, to?: number): Promise<HealthEvent[]> {
    const database = await openDatabase();
    const tx = database.transaction([EVENT_STORE], "readonly");
    const store = tx.objectStore(EVENT_STORE);
    const index = store.index("astronautId");
    const events = (await requestToPromise(index.getAll(astronautId))) as HealthEvent[];

    return events
      .filter((event) => {
        if (from !== undefined && event.timestamp < from) return false;
        if (to !== undefined && event.timestamp > to) return false;
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getAllEvents(): Promise<HealthEvent[]> {
    const database = await openDatabase();
    const tx = database.transaction([EVENT_STORE], "readonly");
    const events = (await requestToPromise(tx.objectStore(EVENT_STORE).getAll())) as HealthEvent[];
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getEventById(id: string): Promise<HealthEvent | null> {
    const database = await openDatabase();
    const tx = database.transaction([EVENT_STORE], "readonly");
    const event = await requestToPromise(tx.objectStore(EVENT_STORE).get(id));
    return (event as HealthEvent) ?? null;
  }

  async saveAlert(alert: HealthAlert): Promise<void> {
    const database = await openDatabase();
    const tx = database.transaction([ALERT_STORE], "readwrite");
    await requestToPromise(tx.objectStore(ALERT_STORE).put(alert));
  }

  async getAlerts(astronautId: string, unacknowledgedOnly = false): Promise<HealthAlert[]> {
    const database = await openDatabase();
    const tx = database.transaction([ALERT_STORE], "readonly");
    const store = tx.objectStore(ALERT_STORE);
    const index = store.index("astronautId");
    const alerts = (await requestToPromise(index.getAll(astronautId))) as HealthAlert[];

    return alerts
      .filter((alert) => (unacknowledgedOnly ? !alert.acknowledged : true))
      .sort((a, b) => b.triggeredAt - a.triggeredAt);
  }

  async getAllAlerts(unacknowledgedOnly = false): Promise<HealthAlert[]> {
    const database = await openDatabase();
    const tx = database.transaction([ALERT_STORE], "readonly");
    const alerts = (await requestToPromise(tx.objectStore(ALERT_STORE).getAll())) as HealthAlert[];
    return alerts
      .filter((alert) => (unacknowledgedOnly ? !alert.acknowledged : true))
      .sort((a, b) => b.triggeredAt - a.triggeredAt);
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<void> {
    const database = await openDatabase();
    const tx = database.transaction([ALERT_STORE], "readwrite");
    const store = tx.objectStore(ALERT_STORE);
    const existing = (await requestToPromise(store.get(id))) as HealthAlert | undefined;
    if (!existing) return;

    const updated: HealthAlert = {
      ...existing,
      acknowledged: true,
      acknowledgedBy,
      acknowledgedAt: Date.now(),
    };
    await requestToPromise(store.put(updated));
  }

  async clear(): Promise<void> {
    const database = await openDatabase();
    const tx = database.transaction([EVENT_STORE, ALERT_STORE], "readwrite");
    await Promise.all([
      requestToPromise(tx.objectStore(EVENT_STORE).clear()),
      requestToPromise(tx.objectStore(ALERT_STORE).clear()),
    ]);
  }
}

export const healthTimelineRepository = new HealthTimelineRepository();
