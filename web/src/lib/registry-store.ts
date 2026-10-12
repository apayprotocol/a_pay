import fs from 'node:fs';
import path from 'node:path';

export interface MerchantRecord {
  id: string;
  wallet: string;
  targetDomain: string;
  price: string;
  network?: string;
  version: string;
  firstSeen: number;
  lastHeartbeat: number;
  status: 'online' | 'idle';
  name?: string;
  category?: string;
  description?: string;
}

const REGISTRY_CACHE_FILE = path.join('/tmp', 'apay_registry.json');
const HEARTBEAT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days active window

export function canonicalizeDomain(domain: string): string {
  if (!domain) return '';
  let cleaned = domain.trim();
  try {
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      const parsed = new URL(cleaned);
      const pathname = parsed.pathname.replace(/\/+$/, '');
      cleaned = `${parsed.protocol}//${parsed.host}${pathname}`;
    } else {
      cleaned = cleaned.replace(/\/+$/, '');
    }
  } catch {
    cleaned = cleaned.replace(/\/+$/, '');
  }
  return cleaned.replace(/\/+$/, '');
}

// In-memory fallback
const localMemoryRegistry = new Map<string, MerchantRecord>();
const localMemoryTombstones = new Set<string>();
const TOMBSTONES_CACHE_FILE = path.join('/tmp', 'apay_tombstones.json');

function hydrateLocalDisk(): void {
  try {
    if (localMemoryRegistry.size === 0 && fs.existsSync(REGISTRY_CACHE_FILE)) {
      const raw = fs.readFileSync(REGISTRY_CACHE_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          const key = `${item.wallet.toLowerCase()}_${item.targetDomain}`;
          localMemoryRegistry.set(key, item);
        }
      }
    }
    if (localMemoryTombstones.size === 0 && fs.existsSync(TOMBSTONES_CACHE_FILE)) {
      const raw = fs.readFileSync(TOMBSTONES_CACHE_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const domain of data) {
          localMemoryTombstones.add(String(domain).toLowerCase());
        }
      }
    }
  } catch {
    // Non-blocking fallback
  }
}

function persistLocalDisk(): void {
  try {
    const list = Array.from(localMemoryRegistry.values());
    fs.writeFileSync(REGISTRY_CACHE_FILE, JSON.stringify(list, null, 2), 'utf8');
    const tombList = Array.from(localMemoryTombstones);
    fs.writeFileSync(TOMBSTONES_CACHE_FILE, JSON.stringify(tombList, null, 2), 'utf8');
  } catch {
    // Non-blocking disk write
  }
}

// Initial hydration
hydrateLocalDisk();

function matchesNetwork(recordNetwork: string | undefined, filterNetwork?: string): boolean {
  if (!filterNetwork || filterNetwork === 'all') return true;
  const target = filterNetwork.toLowerCase();
  const rec = (recordNetwork || 'base').toLowerCase();
  if (target === 'base-mainnet' || target === 'base') {
    return rec === 'base-mainnet' || rec === 'base';
  }
  if (target === 'base-sepolia' || target === 'sepolia') {
    return rec === 'base-sepolia' || rec === 'sepolia';
  }
  return rec === target;
}

class DistributedRegistryStore {
  private redisUrl: string | null;
  private redisToken: string | null;

  constructor() {
    this.redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || null;
    this.redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || null;
  }

  public get storageEngine(): 'upstash_redis' | 'local_fallback' {
    return this.redisUrl && this.redisToken ? 'upstash_redis' : 'local_fallback';
  }

  public async saveMerchant(record: MerchantRecord): Promise<void> {
    const cleanDomain = canonicalizeDomain(record.targetDomain);
    const domainLower = cleanDomain.toLowerCase();
    localMemoryTombstones.delete(domainLower);
    const normalizedRecord: MerchantRecord = {
      ...record,
      targetDomain: cleanDomain,
    };
    const key = `${record.wallet.toLowerCase()}_${cleanDomain}`;
    const altSlashKey = `${record.wallet.toLowerCase()}_${cleanDomain}/`;

    // 1. If Redis is configured, persist via REST API
    if (this.redisUrl && this.redisToken) {
      try {
        // Delete any trailing slash variant first to avoid duplicates
        await fetch(this.redisUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.redisToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['HDEL', 'apay:registry:merchants', altSlashKey]),
          cache: 'no-store',
        });

        // Clear tombstone if previously deleted
        await fetch(this.redisUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.redisToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['SREM', 'apay:registry:tombstones', domainLower]),
          cache: 'no-store',
        });

        const resp = await fetch(this.redisUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.redisToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            'HSET',
            'apay:registry:merchants',
            key,
            JSON.stringify(normalizedRecord),
          ]),
          cache: 'no-store',
        });
        if (resp.ok) {
          return;
        }
      } catch (err) {
        console.warn('⚠️ Upstash Redis save failed, falling back to local storage:', err);
      }
    }

    // 2. Local Fallback
    hydrateLocalDisk();
    localMemoryRegistry.delete(altSlashKey);
    localMemoryRegistry.set(key, normalizedRecord);
    persistLocalDisk();
  }

  public async getMerchants(networkFilter?: string): Promise<MerchantRecord[]> {
    const now = Date.now();

    // 1. If Redis is configured, fetch all from Hash
    if (this.redisUrl && this.redisToken) {
      try {
        const url = `${this.redisUrl}/hgetall/apay:registry:merchants`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${this.redisToken}` },
          cache: 'no-store',
        });
        if (resp.ok) {
          const json = await resp.json();
          // Upstash returns [key, val, key, val...] or { key: val }
          const records: MerchantRecord[] = [];
          if (Array.isArray(json.result)) {
            for (let i = 1; i < json.result.length; i += 2) {
              try {
                const rec: MerchantRecord = JSON.parse(json.result[i]);
                if (matchesNetwork(rec.network, networkFilter)) {
                  const isOnline = now - rec.lastHeartbeat < HEARTBEAT_TTL_MS;
                  records.push({ ...rec, status: isOnline ? 'online' : 'idle' });
                }
              } catch {
                // ignore corrupted entry
              }
            }
          } else if (typeof json.result === 'object' && json.result !== null) {
            for (const val of Object.values(json.result)) {
              try {
                const rec: MerchantRecord = JSON.parse(val as string);
                if (matchesNetwork(rec.network, networkFilter)) {
                  const isOnline = now - rec.lastHeartbeat < HEARTBEAT_TTL_MS;
                  records.push({ ...rec, status: isOnline ? 'online' : 'idle' });
                }
              } catch {
                // ignore
              }
            }
          }
          records.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);

          // Deduplicate by canonical domain so duplicates never appear
          const seen = new Set<string>();
          const uniqueRecords: MerchantRecord[] = [];
          for (const rec of records) {
            const canonicalKey = `${rec.wallet.toLowerCase()}_${canonicalizeDomain(rec.targetDomain).toLowerCase()}`;
            if (!seen.has(canonicalKey)) {
              seen.add(canonicalKey);
              uniqueRecords.push({
                ...rec,
                targetDomain: canonicalizeDomain(rec.targetDomain),
              });
            }
          }
          const tombstones = await this.getTombstones();
          return uniqueRecords.filter(
            (rec) => !tombstones.has(canonicalizeDomain(rec.targetDomain).toLowerCase()),
          );
        }
      } catch (err) {
        console.warn('⚠️ Upstash Redis fetch failed, falling back to local memory:', err);
      }
    }

    // 2. Local Fallback
    hydrateLocalDisk();
    const tombstones = await this.getTombstones();
    const list: MerchantRecord[] = [];
    localMemoryRegistry.forEach((rec) => {
      if (matchesNetwork(rec.network, networkFilter)) {
        const isOnline = now - rec.lastHeartbeat < HEARTBEAT_TTL_MS;
        list.push({ ...rec, status: isOnline ? 'online' : 'idle' });
      }
    });
    list.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);

    const seen = new Set<string>();
    const uniqueList: MerchantRecord[] = [];
    for (const rec of list) {
      const canonicalKey = `${rec.wallet.toLowerCase()}_${canonicalizeDomain(rec.targetDomain).toLowerCase()}`;
      if (!seen.has(canonicalKey)) {
        seen.add(canonicalKey);
        uniqueList.push({
          ...rec,
          targetDomain: canonicalizeDomain(rec.targetDomain),
        });
      }
    }
    return uniqueList.filter(
      (rec) => !tombstones.has(canonicalizeDomain(rec.targetDomain).toLowerCase()),
    );
  }

  public async getTombstones(): Promise<Set<string>> {
    hydrateLocalDisk();
    const set = new Set<string>(localMemoryTombstones);
    if (this.redisUrl && this.redisToken) {
      try {
        const resp = await fetch(`${this.redisUrl}/smembers/apay:registry:tombstones`, {
          headers: { Authorization: `Bearer ${this.redisToken}` },
          cache: 'no-store',
        });
        if (resp.ok) {
          const json = await resp.json();
          if (Array.isArray(json.result)) {
            for (const item of json.result) {
              if (typeof item === 'string') {
                set.add(item.toLowerCase());
              }
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Upstash Redis SMEMBERS failed:', err);
      }
    }
    return set;
  }

  public async getStats(networkFilter?: string): Promise<{
    count: number;
    onlineCount: number;
    storageEngine: 'upstash_redis' | 'local_fallback';
  }> {
    const list = await this.getMerchants(networkFilter);
    const onlineCount = list.filter((m) => m.status === 'online').length;
    return {
      count: list.length,
      onlineCount,
      storageEngine: this.storageEngine,
    };
  }

  public async deleteMerchant(wallet: string, targetDomain: string): Promise<boolean> {
    const cleanDomain = canonicalizeDomain(targetDomain);
    const domainLower = cleanDomain.toLowerCase();
    localMemoryTombstones.add(domainLower);

    if (this.redisUrl && this.redisToken) {
      try {
        await fetch(this.redisUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.redisToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['SADD', 'apay:registry:tombstones', domainLower]),
          cache: 'no-store',
        });

        const keysToDelete: string[] = [];
        if (wallet) {
          keysToDelete.push(
            `${wallet.toLowerCase()}_${cleanDomain}`,
            `${wallet.toLowerCase()}_${cleanDomain}/`,
            `${wallet.toLowerCase()}_${targetDomain}`,
          );
        }

        const resp = await fetch(`${this.redisUrl}/hkeys/apay:registry:merchants`, {
          headers: { Authorization: `Bearer ${this.redisToken}` },
          cache: 'no-store',
        });
        if (resp.ok) {
          const json = await resp.json();
          if (Array.isArray(json.result)) {
            for (const k of json.result) {
              if (
                typeof k === 'string' &&
                (k.toLowerCase().endsWith(`_${domainLower}`) ||
                  k.toLowerCase().endsWith(`_${domainLower}/`) ||
                  k.toLowerCase() === domainLower)
              ) {
                keysToDelete.push(k);
              }
            }
          }
        }

        if (keysToDelete.length > 0) {
          await fetch(this.redisUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.redisToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(['HDEL', 'apay:registry:merchants', ...new Set(keysToDelete)]),
            cache: 'no-store',
          });
        }
      } catch (err) {
        console.warn('⚠️ Upstash Redis HDEL / SADD failed:', err);
      }
    }
    hydrateLocalDisk();
    for (const k of Array.from(localMemoryRegistry.keys())) {
      if (
        k.toLowerCase().endsWith(`_${domainLower}`) ||
        k.toLowerCase().endsWith(`_${domainLower}/`) ||
        k.toLowerCase() === domainLower
      ) {
        localMemoryRegistry.delete(k);
      }
    }
    persistLocalDisk();
    return true;
  }

  public async purgeStaleMerchants(): Promise<number> {
    const merchants = await this.getMerchants();
    const stale = merchants.filter((m) => m.status === 'idle');
    for (const item of stale) {
      await this.deleteMerchant(item.wallet, item.targetDomain);
    }
    return stale.length;
  }
}

export const registryStore = new DistributedRegistryStore();
