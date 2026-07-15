import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

declare const process: any;

interface MockQueryBuilder {
  filter: (fn: (d: any) => boolean) => MockQueryBuilder;
  collect: () => any[];
  unique: () => any | null;
  first: () => any | null;
}

// Mock implementation of Convex database context for unit testing persistentItems
class MockDatabase {
  private tables: { [tableName: string]: any[] } = {
    persistentItemCatalog: [
      { _id: "cat1" as any, itemId: "buff_hp", name: "생체 완충재", description: "최대 HP +8%", rarity: "rare", isActive: true, effects: { maxHpMultiplier: 1.08 } },
      { _id: "cat2" as any, itemId: "booster_speed", name: "과과급 동력장치", description: "이동 속도 +5%", rarity: "rare", isActive: true, effects: { speedMultiplier: 1.05 } },
      { _id: "cat3" as any, itemId: "range_lens", name: "정밀 렌즈", description: "기본 공격 사거리 +10", rarity: "epic", isActive: true, effects: { baseAttackRangeBonus: 10 } },
      { _id: "cat4" as any, itemId: "barrier_gen", name: "소형 보호막 생성기", description: "전투 시작 시 보호막 +15", rarity: "epic", isActive: true, effects: { defenseShieldBonus: 15 } }
    ],
    persistentItemUnlocks: [],
    characterItemLoadouts: [],
    itemTicketBalances: [],
    itemTicketClaims: [],
    itemDrawHistory: [],
    characterProgress: [] // Mock characterProgress table to resolve level
  };

  insert(table: string, document: any): any {
    const doc = {
      _id: `${table}_id_${Math.random()}`,
      _creationTime: Date.now(),
      ...document
    };
    this.tables[table] = this.tables[table] || [];
    this.tables[table].push(doc);
    return doc._id;
  }

  get(id: any): any {
    for (const table in this.tables) {
      const found = this.tables[table].find(d => d._id === id);
      if (found) return found;
    }
    return null;
  }

  replace(id: any, document: any): void {
    for (const table in this.tables) {
      const idx = this.tables[table].findIndex(d => d._id === id);
      if (idx !== -1) {
        this.tables[table][idx] = { _id: id, ...document };
        return;
      }
    }
    throw new Error("Document not found for replace");
  }

  patch(id: any, fields: any): void {
    for (const table in this.tables) {
      const idx = this.tables[table].findIndex(d => d._id === id);
      if (idx !== -1) {
        this.tables[table][idx] = { ...this.tables[table][idx], ...fields };
        return;
      }
    }
    throw new Error("Document not found for patch");
  }

  delete(id: any): void {
    for (const table in this.tables) {
      const idx = this.tables[table].findIndex(d => d._id === id);
      if (idx !== -1) {
        this.tables[table].splice(idx, 1);
        return;
      }
    }
    throw new Error("Document not found for delete");
  }

  // Simple query runner
  query(table: string): MockQueryBuilder {
    const data = this.tables[table] || [];
    let filtered = [...data];
    const q: MockQueryBuilder = {
      filter: (fn: (d: any) => boolean) => {
        filtered = filtered.filter(fn);
        return q;
      },
      collect: () => filtered,
      unique: () => filtered.length > 0 ? filtered[0] : null,
      first: () => filtered.length > 0 ? filtered[0] : null
    };
    return q;
  }
}

// Build mock mutation/query ctx
function createMockCtx() {
  const mockDb = new MockDatabase();
  const ctx = {
    db: {
      insert: (table: string, doc: any) => mockDb.insert(table, doc),
      get: (id: any) => mockDb.get(id),
      replace: (id: any, doc: any) => mockDb.replace(id, doc),
      patch: (id: any, fields: any) => mockDb.patch(id, fields),
      delete: (id: any) => mockDb.delete(id),
      query: (table: string) => {
        const filters: Array<(doc: any) => boolean> = [];
        const qMock = {
          eq: (field: string, value: any) => {
            filters.push((doc: any) => doc[field] === value);
            return qMock;
          }
        };

        const qBuilder = {
          withIndex: (indexName: string, indexFn: any) => {
            if (indexFn) indexFn(qMock);
            return qBuilder;
          },
          filter: (filterFn: any) => qBuilder,
          collect: async () => {
            let data = mockDb.query(table).collect();
            for (const f of filters) {
              data = data.filter(f);
            }
            return data;
          },
          unique: async () => {
            let data = mockDb.query(table).collect();
            for (const f of filters) {
              data = data.filter(f);
            }
            return data.length > 0 ? data[0] : null;
          },
          first: async () => {
            let data = mockDb.query(table).collect();
            for (const f of filters) {
              data = data.filter(f);
            }
            return data.length > 0 ? data[0] : null;
          },
          take: async (n: number) => {
            const data = await qBuilder.collect();
            return data.slice(0, n);
          },
          order: () => qBuilder,
          limit: () => qBuilder,
        };
        return qBuilder;
      }
    }
  } as any;

  return { ctx, mockDb };
}

// Import original implementation functions
import {
  claimAvailableItemTickets,
  drawPersistentItem,
  equipPersistentItem,
  clearPersistentItemSlot,
  ensureInitialPersistentItemCatalog
} from "./persistentItems";

// Simple test runner assertion helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

async function runTests() {
  console.log("=== STARTING PERSISTENT ITEMS BACKEND UNIT TESTS ===");

  // Helper to extract handler from mutation/query
  const getHandler = (func: any) => {
    return func._handler || func.handler || func;
  };

  // ----------------------------------------------------
  // Test 1: claimAvailableItemTickets level milestones & duplicate prevention
  // ----------------------------------------------------
  {
    const { ctx, mockDb } = createMockCtx();
    const clientId = "test_client_1";
    const characterId = "seojun";

    // Set level to 25
    mockDb.insert("characterProgress", { clientId, characterId, level: 25 });

    // Claim tickets
    const result1 = await getHandler(claimAvailableItemTickets)(ctx, { clientId, characterId });
    assert(result1.claimedCount === 5, "Should claim 5 tickets for Lv.25 (milestones 5, 10, 15, 20, 25)");

    const balanceDoc1 = mockDb.query("itemTicketBalances").filter(b => b.clientId === clientId).unique();
    assert(balanceDoc1 !== null && balanceDoc1.availableTickets === 5, "Ticket balance should be 5");

    // Try claiming again (idempotence check)
    const result2 = await getHandler(claimAvailableItemTickets)(ctx, { clientId, characterId });
    assert(result2.claimedCount === 0, "Should claim 0 tickets on duplicate run");

    // Advance level to 30
    const progressDoc = mockDb.query("characterProgress").filter(p => p.clientId === clientId && p.characterId === characterId).unique();
    mockDb.patch(progressDoc._id, { level: 30 });

    // Claim again
    const result3 = await getHandler(claimAvailableItemTickets)(ctx, { clientId, characterId });
    assert(result3.claimedCount === 1, "Should claim 1 more ticket for Lv.30");

    const balanceDoc2 = mockDb.query("itemTicketBalances").filter(b => b.clientId === clientId).unique();
    assert(balanceDoc2 !== null && balanceDoc2.availableTickets === 6, "Ticket balance should be 6 now");
  }

  // ----------------------------------------------------
  // Test 2: drawPersistentItem gacha logic & catalog completion
  // ----------------------------------------------------
  {
    const { ctx, mockDb } = createMockCtx();
    const clientId = "test_client_1";

    // Seed catalog
    await getHandler(ensureInitialPersistentItemCatalog)(ctx, {});

    // Try drawing with 0 tickets balance
    try {
      await getHandler(drawPersistentItem)(ctx, { clientId });
      assert(false, "Should have thrown error due to 0 tickets balance");
    } catch (e: any) {
      assert(e.message.includes("보유한 아이템 뽑기권이 부족합니다."), "Should throw insufficient tickets error");
    }

    // Set ticket balance = 1
    mockDb.insert("itemTicketBalances", { clientId, availableTickets: 1 });

    // Draw
    const drawRes = await getHandler(drawPersistentItem)(ctx, { clientId });
    assert(drawRes.catalogComplete === false, "Catalog should not be complete");
    assert(drawRes.item !== null, "Should return drawn item");

    const balanceDoc = mockDb.query("itemTicketBalances").filter(b => b.clientId === clientId).unique();
    assert(balanceDoc.availableTickets === 0, "Ticket should be deducted to 0");

    // Mock catalog completion
    // Add unlocks for all catalog items
    const catalog = mockDb.query("persistentItemCatalog").collect();
    catalog.forEach(item => {
      mockDb.insert("persistentItemUnlocks", { clientId, itemId: item.itemId });
    });

    // Draw with catalog complete (give 1 ticket again)
    mockDb.patch(balanceDoc._id, { availableTickets: 1 });
    const drawResComp = await getHandler(drawPersistentItem)(ctx, { clientId });
    assert(drawResComp.catalogComplete === true, "Should detect catalog complete");
    assert(drawResComp.item === null, "Should return null item");

    const balanceDocAfter = mockDb.query("itemTicketBalances").filter(b => b.clientId === clientId).unique();
    assert(balanceDocAfter.availableTickets === 1, "Ticket should NOT be deducted when catalog is complete");
  }

  // ----------------------------------------------------
  // Test 3: equipPersistentItem slots & level checks & duplicate prevention
  // ----------------------------------------------------
  {
    const { ctx, mockDb } = createMockCtx();
    const clientId = "test_client_1";
    const characterId = "seojun";

    // Set level to 15 (less than 20, Slot 3 is locked)
    mockDb.insert("characterProgress", { clientId, characterId, level: 15 });

    // Seed catalog and unlock two items
    mockDb.insert("persistentItemCatalog", { itemId: "buff_hp", name: "생체 완충재", rarity: "rare", isActive: true });
    mockDb.insert("persistentItemCatalog", { itemId: "booster_speed", name: "과과급 동력장치", rarity: "rare", isActive: true });
    
    mockDb.insert("persistentItemUnlocks", { clientId, itemId: "buff_hp" });
    mockDb.insert("persistentItemUnlocks", { clientId, itemId: "booster_speed" });

    // Try equipping locked slot 3
    try {
      await getHandler(equipPersistentItem)(ctx, { clientId, characterId, slot: 3, itemId: "buff_hp" });
      assert(false, "Should have blocked Slot 3 for level < 20");
    } catch (e: any) {
      assert(e.message.includes("해금됩니다"), "Should enforce slot 3 level lock");
    }

    // Equip Slot 1
    await getHandler(equipPersistentItem)(ctx, { clientId, characterId, slot: 1, itemId: "buff_hp" });
    const loadout1 = mockDb.query("characterItemLoadouts").filter(l => l.clientId === clientId && l.characterId === characterId).unique();
    assert(loadout1.slot1ItemId === "buff_hp", "Item should be equipped in slot 1");

    // Try duplicate equip: same item in Slot 2
    try {
      await getHandler(equipPersistentItem)(ctx, { clientId, characterId, slot: 2, itemId: "buff_hp" });
      assert(false, "Should have blocked equipping duplicate item");
    } catch (e: any) {
      assert(e.message.includes("중복 장착할 수 없습니다"), "Should enforce unique item per character rule");
    }

    // Equip different item in Slot 2
    await getHandler(equipPersistentItem)(ctx, { clientId, characterId, slot: 2, itemId: "booster_speed" });
    const loadout2 = mockDb.query("characterItemLoadouts").filter(l => l.clientId === clientId && l.characterId === characterId).unique();
    assert(loadout2.slot2ItemId === "booster_speed", "Second item should be equipped in slot 2");

    // Clear Slot 1
    await getHandler(clearPersistentItemSlot)(ctx, { clientId, characterId, slot: 1 });
    const loadout3 = mockDb.query("characterItemLoadouts").filter(l => l.clientId === clientId && l.characterId === characterId).unique();
    assert(loadout3.slot1ItemId === undefined, "Slot 1 should be cleared");
    assert(loadout3.slot2ItemId === "booster_speed", "Slot 2 item should remain untouched");
  }

  console.log("=== ALL PERSISTENT ITEMS BACKEND UNIT TESTS PASSED SUCCESSFULLY ===");
}

// Execute tests if this script is executed directly
if (typeof process !== "undefined" && process.argv && process.argv.length > 0) {
  runTests().catch(err => {
    console.error("Test suite failed:", err);
    process.exit(1);
  });
}
