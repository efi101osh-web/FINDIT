'use strict';

// Browsing and searching everyone's reports: GET /items (needs a real MongoDB: `npm run test:db`).
// Test IDs refer to documentation/TEST_PLAN.md.

const mongoose = require('mongoose');
const Item = require('../src/models/Item');
const { makeTestApp } = require('./helpers/testConfig');
const { describeWithDatabase, connectTestDatabase, cleanUpTestDatabase } = require('./helpers/database');
const { registerViaApi, createUserDirectly, loginViaApi } = require('./helpers/users');
const { validLost, validFound, createItem, call, dateDaysAgo } = require('./helpers/items');

const app = makeTestApp();
const rawItems = () => mongoose.connection.collection('items');
const CARD_KEYS = ['category', 'colour', 'createdAt', 'dateOccurred', 'generalLocation', 'id', 'image', 'isMine', 'locationDetail', 'reportType', 'status', 'title'];

async function newUser(name) {
  const r = await registerViaApi(app, { fullName: name });
  return { token: r.token, id: r.data.user.id };
}
async function newStaff(role) {
  const { email, password, user } = await createUserDirectly({ role });
  const login = await loginViaApi(app, email, password);
  return { token: login.body.data.token, id: String(user._id) };
}

describeWithDatabase('browsing and searching reports: GET /items', () => {
  let alice;
  let bob;
  let admin;
  let officer;
  const item = {}; // the seeded reports by short name

  const browse = (qs = '', token = alice.token) => call(app, 'get', `/items${qs ? `?${qs}` : ''}`, token);
  const idsOf = (res) => res.body.data.map((card) => card.id);
  const titlesOf = (res) => res.body.data.map((card) => card.title).sort();

  async function seed(key, owner, body, { createdMinutesAgo, status } = {}) {
    const res = await createItem(app, owner.token, body);
    expect([key, res.status]).toEqual([key, 201]);
    item[key] = res.body.data.item;
    await rawItems().updateOne(
      { _id: new mongoose.Types.ObjectId(item[key].id) },
      { $set: { createdAt: new Date(Date.now() - createdMinutesAgo * 60 * 1000) } } // raw: the model protects createdAt
    );
    if (status) await Item.updateOne({ _id: item[key].id }, { status });
  }

  beforeAll(async () => {
    await connectTestDatabase();
    alice = await newUser('Alice Reporter');
    bob = await newUser('Bob Reporter');
    admin = await newStaff('admin');
    officer = await newStaff('recovery_officer');

    await seed('headphones', alice, validLost({
      title: 'Black wireless headphones', description: 'Over-ear wireless headphones in a black case.', category: 'ELECTRONICS', colour: 'BLACK',
      generalLocation: 'LIBRARY', locationDetail: 'Main library, second floor', dateOccurred: dateDaysAgo(3),
      privateDetails: 'zebra-marker-123 scratch on the left earcup',
    }), { createdMinutesAgo: 70 });
    await seed('keys', alice, validFound({
      title: 'Set of keys on a red lanyard', description: 'Three keys on a red lanyard, found on a bench outside.', category: 'KEYS', colour: 'RED',
      generalLocation: 'MALE_HALLS', locationDetail: 'Winslow', dateOccurred: dateDaysAgo(2),
      privateDetails: 'green rubber cap quokka', privateStorageLocation: 'Vault Seven corridor',
    }), { createdMinutesAgo: 60 });
    await seed('backpack', alice, validFound({
      title: 'Blue backpack', description: 'Navy backpack with two front pockets and a laptop sleeve.', category: 'BAGS', colour: 'BLUE', brand: 'Adidas',
      generalLocation: 'CLASSROOM', locationDetail: 'BBS Class 102', dateOccurred: dateDaysAgo(10),
    }), { createdMinutesAgo: 50 });
    await seed('hoodie', alice, validLost({
      title: 'Grey hoodie', description: 'Grey zip-up hoodie with a small logo on the chest.', category: 'CLOTHING', colour: 'GREY',
      generalLocation: 'FEMALE_HALLS', locationDetail: 'Queen Esther', dateOccurred: dateDaysAgo(20),
    }), { createdMinutesAgo: 40 });
    await seed('idcard', alice, validLost({
      title: 'Student ID card', description: 'White student identity card in a clear plastic holder.', category: 'WALLETS_AND_CARDS', colour: 'WHITE',
      generalLocation: 'CHURCH', locationDetail: 'Pioneer Church', dateOccurred: dateDaysAgo(1),
    }), { createdMinutesAgo: 30 });
    await seed('mouse', bob, validFound({
      title: 'Wireless mouse', description: 'Small black wireless mouse with a USB receiver.', category: 'ELECTRONICS', colour: 'BLACK',
      generalLocation: 'NOT_SURE', locationDetail: undefined, dateOccurred: dateDaysAgo(5),
    }), { createdMinutesAgo: 20 });
    await seed('umbrella', alice, validLost({
      title: 'Closed umbrella', description: 'Long black umbrella with a wooden handle.', category: 'OTHER', colour: 'GREEN',
      generalLocation: 'LIBRARY', locationDetail: 'Reading room', dateOccurred: dateDaysAgo(8),
    }), { createdMinutesAgo: 15 });
    await seed('calculator', bob, validFound({
      title: 'Returned calculator', description: 'Scientific calculator with a grey cover.', category: 'ELECTRONICS', colour: 'GREY',
      generalLocation: 'CAFETERIA', locationDetail: 'Old Cafeteria', dateOccurred: dateDaysAgo(15),
    }), { createdMinutesAgo: 10, status: 'RETURNED' });
    await seed('watch', bob, validFound({
      title: 'Verification watch', description: 'Silver wrist watch with a leather strap.', category: 'ACCESSORIES', colour: 'SILVER',
      generalLocation: 'GATES', locationDetail: 'Main gate', dateOccurred: dateDaysAgo(30),
    }), { createdMinutesAgo: 5, status: 'UNDER_VERIFICATION' });

    expect((await call(app, 'patch', `/items/${item.umbrella.id}/close`, alice.token).send({ reason: 'Found it.' })).status).toBe(200);
  });
  afterAll(cleanUpTestDatabase);

  // ------------------------------------------------------------------------------------------
  describe('who may browse, and what a card contains', () => {
    test('a login is required', async () => {
      expect((await call(app, 'get', '/items')).status).toBe(401);
      expect((await call(app, 'get', '/items?q=head')).status).toBe(401);
    });

    test('the default list is every ACTIVE report: not closed, not returned', async () => {
      const res = await browse();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(titlesOf(res)).toEqual(['Black wireless headphones', 'Blue backpack', 'Grey hoodie', 'Set of keys on a red lanyard', 'Student ID card', 'Verification watch', 'Wireless mouse']);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 7, totalPages: 1 });
    });

    test('T-ITM-06 for lists: a card has exactly the public fields and nothing else', async () => {
      const res = await browse();
      for (const card of res.body.data) expect(Object.keys(card).sort()).toEqual(CARD_KEYS);
    });

    test('no private text and no reporter identity appears anywhere in the list', async () => {
      const text = JSON.stringify((await browse('limit=50')).body);
      for (const secret of ['zebra-marker-123', 'quokka', 'Vault Seven', 'privateDetails', 'privateStorageLocation', 'reporterId', 'reporter', alice.id, bob.id, 'Alice Reporter', 'Bob Reporter', '@example.com']) {
        expect([secret, text.includes(secret)]).toEqual([secret, false]);
      }
    });

    test('isMine tells whose report it is, per viewer', async () => {
      const asAlice = (await browse()).body.data;
      expect(asAlice.filter((c) => c.isMine).map((c) => c.title).sort()).toEqual(['Black wireless headphones', 'Blue backpack', 'Grey hoodie', 'Set of keys on a red lanyard', 'Student ID card']);
      const asBob = (await browse('', bob.token)).body.data;
      expect(asBob.filter((c) => c.isMine).map((c) => c.title).sort()).toEqual(['Verification watch', 'Wireless mouse']);
    });

    test('an administrator and a recovery officer browsing get the same public cards (no private fields)', async () => {
      for (const who of [admin, officer]) {
        const res = await browse('limit=50', who.token);
        expect(res.body.data).toHaveLength(7);
        const text = JSON.stringify(res.body);
        for (const secret of ['zebra-marker-123', 'Vault Seven', 'privateStorageLocation', 'privateDetails', 'Alice Reporter']) {
          expect([secret, text.includes(secret)]).toEqual([secret, false]);
        }
      }
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('status: closed reports are never public', () => {
    test('T-SRC-09: a CLOSED report is not in the list, not even for its own owner', async () => {
      expect(idsOf(await browse('limit=50'))).not.toContain(item.umbrella.id);
      expect((await call(app, 'get', '/items/mine?status=CLOSED', alice.token)).body.data.map((c) => c.id)).toContain(item.umbrella.id); // still in "mine"
    });

    test('asking for status=CLOSED is a 400', async () => {
      const res = await browse('status=CLOSED');
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('status');
    });

    test('searching for the title of a closed report finds nothing', async () => {
      const res = await browse('q=umbrella');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    test('RETURNED reports appear only when asked for', async () => {
      expect(idsOf(await browse('limit=50'))).not.toContain(item.calculator.id);
      expect(idsOf(await browse('status=RETURNED'))).toEqual([item.calculator.id]);
    });

    test('a single active status can be asked for; an UNDER_VERIFICATION report is part of the default list', async () => {
      expect(idsOf(await browse('status=UNDER_VERIFICATION'))).toEqual([item.watch.id]);
      expect(idsOf(await browse('limit=50'))).toContain(item.watch.id);
      expect((await browse('status=OPEN')).body.meta.total).toBe(6); // the 7 active reports minus the one under verification
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('keyword search', () => {
    test('T-SRC-01: a PARTIAL word finds the report ("head" finds "headphones")', async () => {
      const res = await browse('q=head');
      expect(titlesOf(res)).toEqual(['Black wireless headphones']);
    });

    test('it ignores letter case, in the text and in what was typed', async () => {
      expect(idsOf(await browse('q=HEADPHONES'))).toEqual([item.headphones.id]);
      expect(idsOf(await browse('q=wireless%20MOUSE'))).toEqual([item.mouse.id]);
    });

    test('several words must ALL match, in any order', async () => {
      expect(idsOf(await browse('q=black%20headphones'))).toEqual([item.headphones.id]);
      expect(idsOf(await browse('q=headphones%20black'))).toEqual([item.headphones.id]);
      expect((await browse('q=headphones%20red')).body.data).toEqual([]); // the red thing is the keys, not the headphones
    });

    test('words can match in DIFFERENT fields (the brand and the title)', async () => {
      expect(idsOf(await browse('q=adidas%20backpack'))).toEqual([item.backpack.id]);
    });

    test('the description is searched', async () => {
      expect(idsOf(await browse('q=bench'))).toEqual([item.keys.id]);
      expect(idsOf(await browse('q=sleeve'))).toEqual([item.backpack.id]);
    });

    test('the brand is searched', async () => {
      expect(idsOf(await browse('q=adid'))).toEqual([item.backpack.id]);
    });

    test('the place is searched: the detail (a hall), and the NAME of the zone', async () => {
      expect(idsOf(await browse('q=winslow'))).toEqual([item.keys.id]); // the hall chosen from the list
      expect(idsOf(await browse('q=pioneer'))).toEqual([item.idcard.id]);
      expect(idsOf(await browse('q=library'))).toEqual([item.headphones.id]); // zone name and detail; the closed umbrella is also in the library but is never public
      expect(titlesOf(await browse('q=residence'))).toEqual(['Grey hoodie', 'Set of keys on a red lanyard']); // "Halls of residence (male/female)"
    });

    test('T-SRC-05: pattern characters are plain text: no error, no "match everything"', async () => {
      for (const q of ['.*', '(.*)+$', '[a-z]+', '\\', '(a+)+$', 'a|b', '^h', '^', '$']) {
        const started = Date.now();
        const res = await browse(`q=${encodeURIComponent(q.length < 2 ? `${q}${q}` : q)}`);
        expect([q, res.status, res.body.data.length]).toEqual([q, 200, 0]);
        expect(Date.now() - started).toBeLessThan(2000);
      }
      expect((await browse('q=h.adphones')).body.data).toEqual([]); // "." is not "any letter"
      expect((await browse('q=head')).body.data).toHaveLength(1); // the same search without the dot does match
    });

    test('a very long chain of words is cut to the first five, and still works', async () => {
      const res = await browse(`q=${encodeURIComponent('black wireless headphones in a case with extras')}`);
      expect(res.status).toBe(200);
      expect(idsOf(res)).toEqual([item.headphones.id]);
    });

    test('an unmatched search is an empty list, not an error', async () => {
      const res = await browse('q=zzzzzz');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });

    test('PRIVATE details are NOT searchable: a secret cannot be guessed by searching for it', async () => {
      // the secret really exists: the owner sees it ...
      const own = (await call(app, 'get', `/items/${item.headphones.id}`, alice.token)).body.data.item;
      expect(own.privateDetails).toContain('zebra-marker-123');
      expect((await call(app, 'get', `/items/${item.keys.id}`, alice.token)).body.data.item.privateStorageLocation).toBe('Vault Seven corridor');
      // ... but searching for it finds nothing, for the owner, a stranger and an administrator alike
      for (const who of [alice, bob, admin]) {
        for (const q of ['zebra-marker-123', 'zebra', 'quokka', 'green%20rubber', 'Vault%20Seven', 'corridor']) {
          const res = await browse(`q=${q}`, who.token);
          expect([q, res.status, res.body.data.length]).toEqual([q, 200, 0]);
        }
      }
    });

    test('searching does not find people: names and emails are not searched', async () => {
      expect((await browse('q=alice')).body.data).toEqual([]);
      expect((await browse('q=example.com')).body.data).toEqual([]);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('filters', () => {
    test('T-SRC-02: by report type', async () => {
      expect(titlesOf(await browse('reportType=LOST'))).toEqual(['Black wireless headphones', 'Grey hoodie', 'Student ID card']);
      expect(titlesOf(await browse('reportType=FOUND'))).toEqual(['Blue backpack', 'Set of keys on a red lanyard', 'Verification watch', 'Wireless mouse']);
    });

    test('by category, colour and place (the zone)', async () => {
      expect(idsOf(await browse('category=KEYS'))).toEqual([item.keys.id]);
      expect(titlesOf(await browse('colour=BLACK'))).toEqual(['Black wireless headphones', 'Wireless mouse']);
      expect(idsOf(await browse('location=MALE_HALLS'))).toEqual([item.keys.id]);
      expect(idsOf(await browse('location=CHURCH'))).toEqual([item.idcard.id]);
    });

    test('filters combine: all of them must hold', async () => {
      expect(idsOf(await browse('reportType=FOUND&category=ELECTRONICS'))).toEqual([item.mouse.id]);
      expect(idsOf(await browse('reportType=LOST&category=ELECTRONICS&colour=BLACK&location=LIBRARY'))).toEqual([item.headphones.id]);
      expect((await browse('reportType=LOST&category=KEYS')).body.data).toEqual([]);
    });

    test('a filter and a search work together', async () => {
      expect(idsOf(await browse('colour=BLACK&q=wireless'))).toHaveLength(2);
      expect(idsOf(await browse('colour=BLACK&q=mouse'))).toEqual([item.mouse.id]);
      expect(idsOf(await browse('colour=RED&q=mouse'))).toEqual([]);
    });

    test('T-SRC-02: by date range, inclusive at both ends', async () => {
      const inRange = await browse(`dateFrom=${dateDaysAgo(6)}&dateTo=${dateDaysAgo(2)}`);
      expect(titlesOf(inRange)).toEqual(['Black wireless headphones', 'Set of keys on a red lanyard', 'Wireless mouse']); // 3, 2 and 5 days ago
      expect(idsOf(await browse(`dateFrom=${dateDaysAgo(3)}&dateTo=${dateDaysAgo(3)}`))).toEqual([item.headphones.id]); // a single day
      expect(idsOf(await browse(`dateFrom=${dateDaysAgo(2)}`)).sort()).toEqual([item.keys.id, item.idcard.id].sort()); // 2 and 1 days ago
      expect(idsOf(await browse(`dateTo=${dateDaysAgo(20)}`)).sort()).toEqual([item.hoodie.id, item.watch.id].sort()); // 20 and 30 days ago
    });

    test('the status filter still never shows closed reports, whatever else is asked', async () => {
      expect(idsOf(await browse('category=OTHER&colour=GREEN'))).toEqual([]); // that is the closed umbrella
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('sorting and paging', () => {
    const newest = () => ['watch', 'mouse', 'idcard', 'hoodie', 'backpack', 'keys', 'headphones'].map((k) => item[k].id);

    test('default and "newest": the most recently reported first', async () => {
      expect(idsOf(await browse())).toEqual(newest());
      expect(idsOf(await browse('sort=newest'))).toEqual(newest());
    });

    test('T-SRC-07: "oldest" is the reverse', async () => {
      expect(idsOf(await browse('sort=oldest'))).toEqual(newest().reverse());
    });

    test('T-SRC-07: "eventNewest" and "eventOldest" go by the date it was lost or found', async () => {
      const byDate = ['idcard', 'keys', 'headphones', 'mouse', 'backpack', 'hoodie', 'watch'].map((k) => item[k].id); // 1, 2, 3, 5, 10, 20, 30 days ago
      expect(idsOf(await browse('sort=eventNewest'))).toEqual(byDate);
      expect(idsOf(await browse('sort=eventOldest'))).toEqual([...byDate].reverse());
    });

    test('T-SRC-03: pages of 3 give 3, 3 and 1, with correct totals, and together they are everything exactly once', async () => {
      const pages = [];
      for (const page of [1, 2, 3]) pages.push((await browse(`limit=3&page=${page}`)).body);
      expect(pages.map((p) => p.data.length)).toEqual([3, 3, 1]);
      expect(pages[0].meta).toEqual({ page: 1, limit: 3, total: 7, totalPages: 3 });
      expect(pages[2].meta).toEqual({ page: 3, limit: 3, total: 7, totalPages: 3 });
      expect(pages.flatMap((p) => p.data.map((c) => c.id))).toEqual(newest());
    });

    test('a page past the end is an empty list, with the true total', async () => {
      const res = await browse('limit=3&page=9');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({ page: 9, limit: 3, total: 7, totalPages: 3 });
    });

    test('T-SRC-08: an empty result is 200 with total 0', async () => {
      const res = await browse('category=SPORTS_EQUIPMENT');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });

    test('paging never repeats or skips a report, even when reports were made at the very same moment', async () => {
      const sameMoment = new Date(Date.now() - 3600 * 1000);
      await rawItems().updateMany({}, { $set: { createdAt: sameMoment } });
      const seen = [];
      for (const page of [1, 2, 3, 4, 5, 6, 7]) seen.push(...idsOf(await browse(`limit=1&page=${page}`)));
      expect(seen).toHaveLength(7);
      expect(new Set(seen).size).toBe(7);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('refused requests', () => {
    test('T-SRC-04: a page size above 50, and bad numbers, are 400 and nothing runs', async () => {
      for (const qs of ['limit=500', 'limit=51', 'limit=0', 'limit=-1', 'limit=abc', 'page=0', 'page=-2', 'page=1.5']) {
        const res = await browse(qs);
        expect([qs, res.status, res.body.error && res.body.error.code]).toEqual([qs, 400, 'VALIDATION_ERROR']);
      }
      expect((await browse('limit=50')).status).toBe(200);
    });

    test('T-SRC-06: operator-style and repeated values are 400', async () => {
      for (const qs of ['category[$ne]=KEYS', 'status[$in][]=OPEN', 'q[$regex]=.*', 'q=ab&q=cd', 'limit=2&limit=3', 'colour=RED&colour=BLUE', 'location[$gt]=']) {
        const res = await browse(qs);
        expect([qs, res.status]).toEqual([qs, 400]);
      }
    });

    test('text that is too short or too long, or values not on the lists, are 400', async () => {
      for (const qs of ['q=a', 'q=', `q=${'x'.repeat(61)}`, 'category=FOOD', 'colour=TURQUOISE', 'location=MARS', 'reportType=MISSING', 'sort=sideways']) {
        const res = await browse(qs);
        expect([qs, res.status]).toEqual([qs, 400]);
      }
    });

    test('bad dates, and a range that runs backwards, are 400', async () => {
      for (const qs of ['dateFrom=2026-02-30', 'dateFrom=14/11/2026', 'dateTo=tomorrow', `dateFrom=${dateDaysAgo(1)}&dateTo=${dateDaysAgo(5)}`]) {
        const res = await browse(qs);
        expect([qs, res.status]).toEqual([qs, 400]);
      }
    });

    test('unknown parameters are refused, including attempts to look at someone else\'s reports', async () => {
      for (const qs of ['reporterId=' + alice.id, 'mine=false', 'privateDetails=x', 'includeClosed=true', 'status=ALL']) {
        const res = await browse(qs);
        expect([qs, res.status]).toEqual([qs, 400]);
      }
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('the other item routes still work next to the list', () => {
    test('/items/mine is still "my reports" and is not read as an id', async () => {
      const res = await call(app, 'get', '/items/mine', bob.token);
      expect(res.status).toBe(200);
      expect(res.body.data.every((c) => c.isMine)).toBe(true);
      expect(res.body.data.map((c) => c.title).sort()).toEqual(['Returned calculator', 'Verification watch', 'Wireless mouse']);
    });

    test('a single report can still be opened, and the list does not change anything', async () => {
      const before = await Item.countDocuments();
      await browse('q=head');
      await browse('limit=50&sort=oldest');
      expect(await Item.countDocuments()).toBe(before);
      expect((await call(app, 'get', `/items/${item.mouse.id}`, alice.token)).status).toBe(200);
    });
  });
});
