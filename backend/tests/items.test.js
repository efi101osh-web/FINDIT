'use strict';

// Lost and found reports against a REAL MongoDB (run with `npm run test:db`).
// Test IDs refer to documentation/TEST_PLAN.md.

const request = require('supertest');
const mongoose = require('mongoose');
const Item = require('../src/models/Item');
const { makeTestApp } = require('./helpers/testConfig');
const { describeWithDatabase, connectTestDatabase, cleanUpTestDatabase } = require('./helpers/database');
const { registerViaApi, createUserDirectly, loginViaApi } = require('./helpers/users');
const { validLost, validFound, createItem, call } = require('./helpers/items');

const app = makeTestApp();
const rawItems = () => mongoose.connection.collection('items');

async function newUser() {
  const r = await registerViaApi(app);
  return { token: r.token, id: r.data.user.id, email: r.body.email, fullName: r.body.fullName };
}
async function newStaff(role) {
  const { email, password, user } = await createUserDirectly({ role });
  const login = await loginViaApi(app, email, password);
  return { token: login.body.data.token, id: String(user._id), email, fullName: user.fullName };
}
const makeItem = async (user, body = validLost()) => (await createItem(app, user.token, body)).body.data.item;
const setStatus = (id, status) => Item.updateOne({ _id: id }, { status });

// Strings that must NEVER reach anyone but the owner (and administrators).
const SECRET_DETAILS = 'Scratch on the left earcup; blue sticker inside the case.';
const SECRET_STORAGE = 'Security Office, shelf B';

describeWithDatabase('lost and found reports', () => {
  let owner;
  let other;
  let admin;
  let officer;

  beforeAll(async () => {
    await connectTestDatabase();
    owner = await newUser();
    other = await newUser();
    admin = await newStaff('admin');
    officer = await newStaff('recovery_officer');
  });
  afterAll(cleanUpTestDatabase);

  // ------------------------------------------------------------------------------------------
  describe('creating a report: POST /items', () => {
    test('T-ITM-01: a valid LOST report returns 201 and the owner\'s full view, and is stored under the caller', async () => {
      const res = await createItem(app, owner.token, validLost());
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const item = res.body.data.item;
      expect(item).toMatchObject({
        id: expect.stringMatching(/^[0-9a-f]{24}$/),
        reportType: 'LOST',
        title: 'Black wireless headphones',
        category: 'ELECTRONICS',
        colour: 'BLACK',
        generalLocation: 'LIBRARY',
        locationDetail: 'Main library, second floor',
        status: 'OPEN',
        isMine: true,
        approximateTime: 'AFTERNOON',
        brand: null,
        image: null,
        images: [],
        privateDetails: SECRET_DETAILS,
        dateOccurred: expect.stringMatching(/T00:00:00\.000Z$/),
      });
      expect(item).not.toHaveProperty('handedToOffice'); // found-only
      expect(item).not.toHaveProperty('privateStorageLocation');
      expect(JSON.stringify(res.body)).not.toContain('reporterId'); // the reporter id is never sent

      const stored = await rawItems().findOne({ _id: new mongoose.Types.ObjectId(item.id) });
      expect(String(stored.reporterId)).toBe(owner.id);
      expect(stored.status).toBe('OPEN');
    });

    test('T-ITM-02: a FOUND report keeps its private storage details and the office flag', async () => {
      const res = await createItem(app, owner.token, validFound());
      expect(res.status).toBe(201);
      expect(res.body.data.item).toMatchObject({ reportType: 'FOUND', handedToOffice: true, privateStorageLocation: SECRET_STORAGE, generalLocation: 'MALE_HALLS', locationDetail: 'Winslow' });
      const stored = await rawItems().findOne({ _id: new mongoose.Types.ObjectId(res.body.data.item.id) });
      expect(stored.privateStorageLocation).toBe(SECRET_STORAGE);
      expect(stored.handedToOffice).toBe(true);
    });

    test('the text is trimmed and the optional fields default sensibly', async () => {
      const body = validLost({ title: '   Black headphones   ', approximateTime: undefined, brand: ' Sony ' });
      const res = await createItem(app, owner.token, body);
      expect(res.status).toBe(201);
      expect(res.body.data.item).toMatchObject({ title: 'Black headphones', brand: 'Sony', approximateTime: 'UNKNOWN' });
    });

    test('without a login it is a 401, even when the body is also invalid', async () => {
      expect((await request(app).post('/api/v1/items').send({})).status).toBe(401);
      expect((await request(app).post('/api/v1/items').send(validLost())).status).toBe(401);
    });

    test('T-ITM-03: invalid values are a 400 that names each field, and nothing is saved', async () => {
      const before = await Item.countDocuments();
      const res = await createItem(app, owner.token, validLost({ category: 'FOOD', colour: 'TURQUOISE', generalLocation: 'MARS', title: 'ab' }));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['category', 'colour', 'generalLocation', 'title']));
      expect(await Item.countDocuments()).toBe(before);
    });

    test('the place is checked as a whole: a hall must come from the list, the library needs a description', async () => {
      expect((await createItem(app, owner.token, validLost({ generalLocation: 'FEMALE_HALLS', locationDetail: 'Queen Esther' }))).status).toBe(201);
      const wrongHall = await createItem(app, owner.token, validLost({ generalLocation: 'FEMALE_HALLS', locationDetail: 'Winslow' }));
      expect(wrongHall.status).toBe(400);
      expect(wrongHall.body.error.details[0].field).toBe('locationDetail');
      const noLibraryDetail = validLost();
      delete noLibraryDetail.locationDetail;
      expect((await createItem(app, owner.token, noLibraryDetail)).status).toBe(400);
    });

    test('T-ITM-04: a date in the future is refused', async () => {
      const future = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const res = await createItem(app, owner.token, validLost({ dateOccurred: future }));
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('dateOccurred');
    });

    test('T-ITM-05: found-only fields on a LOST report are refused', async () => {
      const res = await createItem(app, owner.token, validLost({ handedToOffice: true, privateStorageLocation: 'Somewhere' }));
      expect(res.status).toBe(400);
      expect(res.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['handedToOffice', 'privateStorageLocation']));
    });

    test('T-ITM-10: status, reporterId and other fields the client must not control are refused, and nothing is saved', async () => {
      const before = await Item.countDocuments();
      for (const extra of [{ status: 'RETURNED' }, { reporterId: other.id }, { images: [] }, { isMine: false }, { closedAt: '2026-01-01' }]) {
        const res = await createItem(app, owner.token, validLost(extra));
        expect([JSON.stringify(extra), res.status]).toEqual([JSON.stringify(extra), 400]);
      }
      expect(await Item.countDocuments()).toBe(before);
    });

    test('a report is always stored under the person who sent it, and always starts OPEN', async () => {
      const item = await makeItem(other, validFound());
      const stored = await rawItems().findOne({ _id: new mongoose.Types.ObjectId(item.id) });
      expect(String(stored.reporterId)).toBe(other.id);
      expect(stored.status).toBe('OPEN');
    });

    test('administrators and recovery officers can report items too (a found item arrives at the office)', async () => {
      expect((await createItem(app, admin.token, validFound())).status).toBe(201);
      expect((await createItem(app, officer.token, validLost())).status).toBe(201);
    });

    test('injection attempts in the body are refused', async () => {
      expect((await createItem(app, owner.token, validLost({ title: { $ne: null } }))).status).toBe(400);
      expect((await createItem(app, owner.token, validLost({ category: { $in: ['BAGS'] } }))).status).toBe(400);
    });

    test('the database has the indexes the design calls for', async () => {
      const keys = (await rawItems().indexes()).map((i) => JSON.stringify(i.key));
      for (const key of [
        { reportType: 1, status: 1, createdAt: -1 },
        { category: 1, reportType: 1, status: 1 },
        { reporterId: 1, createdAt: -1 },
        { dateOccurred: -1 },
        { generalLocation: 1 },
      ]) expect(keys).toContain(JSON.stringify(key));
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('viewing one report: GET /items/:id', () => {
    let lost;
    let found;
    beforeAll(async () => {
      const u = await newUser();
      lost = { ...(await makeItem(u, validLost())), ownerUser: u };
      found = { ...(await makeItem(u, validFound())), ownerUser: u };
    });

    test('T-ITM-06: another user sees the public view only: no private fields, no reporter, no reporter id', async () => {
      for (const item of [lost, found]) {
        const res = await call(app, 'get', `/items/${item.id}`, other.token);
        expect(res.status).toBe(200);
        const view = res.body.data.item;
        expect(view).toMatchObject({ id: item.id, title: item.title, isMine: false, status: 'OPEN' });
        for (const key of ['privateDetails', 'privateStorageLocation', 'reporter', 'reporterId', 'closedAt', 'closeReason']) {
          expect([key, key in view]).toEqual([key, false]);
        }
        const text = JSON.stringify(res.body);
        for (const secret of [SECRET_DETAILS, 'blue sticker', SECRET_STORAGE, 'Security Office', item.ownerUser.email, item.ownerUser.id, 'Test Person']) {
          expect([secret, text.includes(secret)]).toEqual([secret, false]);
        }
      }
    });

    test('a found report shows the public handedToOffice flag, a lost report does not', async () => {
      expect((await call(app, 'get', `/items/${found.id}`, other.token)).body.data.item.handedToOffice).toBe(true);
      expect(await call(app, 'get', `/items/${lost.id}`, other.token).then((r) => 'handedToOffice' in r.body.data.item)).toBe(false);
    });

    test('a recovery officer sees the same public view as any other user (not the private fields)', async () => {
      const view = (await call(app, 'get', `/items/${found.id}`, officer.token)).body.data.item;
      expect(view).not.toHaveProperty('privateStorageLocation');
      expect(view).not.toHaveProperty('privateDetails');
      expect(view).not.toHaveProperty('reporter');
    });

    test('T-ITM-07: the owner sees their own private fields', async () => {
      const lostView = (await call(app, 'get', `/items/${lost.id}`, lost.ownerUser.token)).body.data.item;
      expect(lostView).toMatchObject({ isMine: true, privateDetails: SECRET_DETAILS, closedAt: null, closeReason: null });
      expect(lostView).not.toHaveProperty('reporter'); // the owner does not need their own contact details echoed back
      const foundView = (await call(app, 'get', `/items/${found.id}`, found.ownerUser.token)).body.data.item;
      expect(foundView).toMatchObject({ privateStorageLocation: SECRET_STORAGE, privateDetails: 'Blue sticker inside the lid.' });
    });

    test('an administrator sees the private fields AND the reporter\'s contact details (but never a password hash)', async () => {
      const view = (await call(app, 'get', `/items/${found.id}`, admin.token)).body.data.item;
      expect(view).toMatchObject({ privateStorageLocation: SECRET_STORAGE, privateDetails: 'Blue sticker inside the lid.', isMine: false });
      expect(view.reporter).toEqual({
        id: found.ownerUser.id,
        fullName: 'Test Person',
        email: found.ownerUser.email,
        phoneNumber: null,
        contactPreference: 'IN_APP',
      });
      expect(JSON.stringify(view)).not.toMatch(/passwordHash|\$2[aby]\$/);
    });

    test('private fields are not even loaded from the database unless asked for (select: false)', async () => {
      const plain = await Item.findById(found.id);
      expect(plain.privateDetails).toBeUndefined();
      expect(plain.privateStorageLocation).toBeUndefined();
      const asked = await Item.findById(found.id).select('+privateDetails +privateStorageLocation');
      expect(asked.privateStorageLocation).toBe(SECRET_STORAGE);
    });

    test('the close reason is also not loaded unless asked for (select: false)', async () => {
      const closing = await makeItem(owner, validLost());
      await call(app, 'patch', `/items/${closing.id}/close`, owner.token).send({ reason: 'Found it in my bag.' });
      const plain = await Item.findById(closing.id);
      expect(plain.status).toBe('CLOSED');
      expect(plain.closeReason).toBeUndefined();
      const asked = await Item.findById(closing.id).select('+closeReason');
      expect(asked.closeReason).toBe('Found it in my bag.');
    });

    test('T-ITM-12: a CLOSED report is invisible to others (404) but still visible to its owner and to administrators', async () => {
      const mine = await makeItem(other, validLost());
      expect((await call(app, 'patch', `/items/${mine.id}/close`, other.token).send({ reason: 'Found it.' })).status).toBe(200);

      const stranger = await call(app, 'get', `/items/${mine.id}`, owner.token);
      expect(stranger.status).toBe(404);
      expect(stranger.body.error.code).toBe('NOT_FOUND');
      expect((await call(app, 'get', `/items/${mine.id}`, other.token)).body.data.item).toMatchObject({ status: 'CLOSED', closeReason: 'Found it.' });
      expect((await call(app, 'get', `/items/${mine.id}`, admin.token)).status).toBe(200);
    });

    test('a malformed id is a 400, an unknown id is a 404, and no login is a 401', async () => {
      expect((await call(app, 'get', '/items/not-an-id', other.token)).status).toBe(400);
      expect((await call(app, 'get', '/items/665f2a7e9b1d4a0012ab3501', other.token)).status).toBe(404);
      expect((await call(app, 'get', `/items/${lost.id}`)).status).toBe(401);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('my reports: GET /items/mine', () => {
    let me;
    let ids;
    beforeAll(async () => {
      me = await newUser();
      ids = [];
      for (const body of [validLost({ title: 'First lost item' }), validLost({ title: 'Second lost item' }), validFound({ title: 'First found item' }), validLost({ title: 'Third lost item' }), validFound({ title: 'Second found item' })]) {
        ids.push((await makeItem(me, body)).id);
        await new Promise((r) => setTimeout(r, 5)); // distinct creation times
      }
      await call(app, 'patch', `/items/${ids[1]}/close`, me.token).send({});
      await makeItem(other, validLost({ title: 'Someone else\'s item' })); // must never appear in my list
    });

    test('lists only MY reports, including closed ones, newest first, with the right totals', async () => {
      const res = await call(app, 'get', '/items/mine', me.token);
      expect(res.status).toBe(200);
      expect(res.body.data.map((i) => i.id)).toEqual([...ids].reverse());
      expect(res.body.data.every((i) => i.isMine === true)).toBe(true);
      expect(res.body.data.find((i) => i.id === ids[1]).status).toBe('CLOSED');
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 5, totalPages: 1 });
    });

    test('the list shows cards only: never the private fields', async () => {
      const text = JSON.stringify((await call(app, 'get', '/items/mine', me.token)).body);
      for (const secret of [SECRET_DETAILS, SECRET_STORAGE, 'privateDetails', 'privateStorageLocation', 'reporterId']) {
        expect([secret, text.includes(secret)]).toEqual([secret, false]);
      }
    });

    test('pagination: pages of 2 give 2, 2 and 1 items', async () => {
      const pageOf = async (page) => (await call(app, 'get', `/items/mine?limit=2&page=${page}`, me.token)).body;
      const [p1, p2, p3, p4] = [await pageOf(1), await pageOf(2), await pageOf(3), await pageOf(4)];
      expect([p1.data.length, p2.data.length, p3.data.length, p4.data.length]).toEqual([2, 2, 1, 0]);
      expect(p1.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
      expect([...p1.data, ...p2.data, ...p3.data].map((i) => i.id)).toEqual([...ids].reverse());
    });

    test('filters by report type and by status, alone or together', async () => {
      const get = async (qs) => (await call(app, 'get', `/items/mine?${qs}`, me.token)).body;
      expect((await get('reportType=FOUND')).data).toHaveLength(2);
      expect((await get('reportType=LOST')).data).toHaveLength(3);
      expect((await get('status=CLOSED')).data.map((i) => i.id)).toEqual([ids[1]]);
      expect((await get('reportType=LOST&status=OPEN')).meta.total).toBe(2);
    });

    test('a person with no reports gets an empty list, not an error', async () => {
      const fresh = await newUser();
      const res = await call(app, 'get', '/items/mine', fresh.token);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });

    test('T-SRC-04 / T-SRC-06: oversized limits, bad numbers, unknown values and injection are refused with 400', async () => {
      for (const qs of ['limit=500', 'limit=0', 'page=0', 'page=abc', 'reportType=NOPE', 'status=DONE', 'status[$ne]=OPEN', 'q=headphones', 'limit=2&limit=3']) {
        const res = await call(app, 'get', `/items/mine?${qs}`, me.token);
        expect([qs, res.status]).toEqual([qs, 400]);
      }
    });

    test('"mine" is not mistaken for an id, and it needs a login', async () => {
      expect((await call(app, 'get', '/items/mine', me.token)).body.success).toBe(true);
      expect((await call(app, 'get', '/items/mine')).status).toBe(401);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('editing a report: PATCH /items/:id', () => {
    let mine;
    beforeEach(async () => {
      mine = await makeItem(owner, validLost());
    });
    const edit = (id, token, body) => call(app, 'patch', `/items/${id}`, token).send(body);

    test('T-ITM-09: the owner can edit, only the sent fields change, and updatedAt moves', async () => {
      await new Promise((r) => setTimeout(r, 15));
      const res = await edit(mine.id, owner.token, { title: '  Black Sony headphones ', colour: 'SILVER', brand: 'Sony', approximateTime: 'EVENING' });
      expect(res.status).toBe(200);
      expect(res.body.data.item).toMatchObject({
        title: 'Black Sony headphones', colour: 'SILVER', brand: 'Sony', approximateTime: 'EVENING',
        description: mine.description, category: 'ELECTRONICS', generalLocation: 'LIBRARY', privateDetails: SECRET_DETAILS, status: 'OPEN',
      });
      expect(new Date(res.body.data.item.updatedAt).getTime()).toBeGreaterThan(new Date(mine.updatedAt).getTime());
    });

    test('T-ITM-08: another user is refused (403) and nothing changes; with no login it is a 401', async () => {
      const res = await edit(mine.id, other.token, { title: 'Hijacked title' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect((await Item.findById(mine.id)).title).toBe(mine.title);
      expect((await call(app, 'patch', `/items/${mine.id}`).send({ title: 'No login title' })).status).toBe(401);
    });

    test('an administrator cannot edit someone else\'s report yet (administrator editing arrives with the audit log, Stage 12)', async () => {
      expect((await edit(mine.id, admin.token, { title: 'Admin edit attempt' })).status).toBe(403);
    });

    test('T-ITM-10: reportType, status, reporterId and other protected fields are refused, and nothing changes', async () => {
      for (const extra of [{ reportType: 'FOUND' }, { status: 'RETURNED' }, { reporterId: other.id }, { images: [] }, { id: 'x' }, { isMine: false }]) {
        const res = await edit(mine.id, owner.token, { title: 'A perfectly valid title', ...extra });
        expect([JSON.stringify(extra), res.status]).toEqual([JSON.stringify(extra), 400]);
      }
      const stored = await rawItems().findOne({ _id: new mongoose.Types.ObjectId(mine.id) });
      expect([stored.reportType, stored.status, String(stored.reporterId), stored.title]).toEqual(['LOST', 'OPEN', owner.id, mine.title]);
    });

    test('an empty edit is a 400; invalid values are refused', async () => {
      expect((await edit(mine.id, owner.token, {})).status).toBe(400);
      expect((await edit(mine.id, owner.token, { colour: 'TURQUOISE' })).status).toBe(400);
      expect((await edit(mine.id, owner.token, { dateOccurred: '2099-01-01' })).status).toBe(400);
    });

    test('null clears optional fields (and they are really removed from the database)', async () => {
      await edit(mine.id, owner.token, { brand: 'Sony' });
      const res = await edit(mine.id, owner.token, { brand: null, privateDetails: null });
      expect(res.status).toBe(200);
      expect(res.body.data.item).toMatchObject({ brand: null, privateDetails: null });
      const stored = await rawItems().findOne({ _id: new mongoose.Types.ObjectId(mine.id) });
      expect('brand' in stored).toBe(false);
      expect('privateDetails' in stored).toBe(false);
    });

    test('a required field cannot be cleared', async () => {
      expect((await edit(mine.id, owner.token, { title: null })).status).toBe(400);
    });

    test('changing the place: the new zone must come with a valid detail, and an old detail never carries over to a new zone', async () => {
      // LIBRARY + description  ->  male hall WITHOUT a detail: refused (the old text is not a hall)
      const noDetail = await edit(mine.id, owner.token, { generalLocation: 'MALE_HALLS' });
      expect(noDetail.status).toBe(400);
      expect(noDetail.body.error.details[0].field).toBe('locationDetail');
      expect((await Item.findById(mine.id)).generalLocation).toBe('LIBRARY'); // unchanged

      const ok = await edit(mine.id, owner.token, { generalLocation: 'MALE_HALLS', locationDetail: 'Winslow' });
      expect(ok.status).toBe(200);
      expect(ok.body.data.item).toMatchObject({ generalLocation: 'MALE_HALLS', locationDetail: 'Winslow' });

      // same zone, just a different hall from the list
      expect((await edit(mine.id, owner.token, { locationDetail: 'Neal Wilson' })).body.data.item.locationDetail).toBe('Neal Wilson');
      // a hall that is not in the male list
      expect((await edit(mine.id, owner.token, { locationDetail: 'Nyberg' })).status).toBe(400);
      // a zone where no detail is needed: the old hall name is dropped, not carried along
      const notSure = await edit(mine.id, owner.token, { generalLocation: 'NOT_SURE' });
      expect(notSure.status).toBe(200);
      expect(notSure.body.data.item).toMatchObject({ generalLocation: 'NOT_SURE', locationDetail: null });
    });

    test('the detail can be cleared where it is optional, but not where it is required', async () => {
      expect((await edit(mine.id, owner.token, { locationDetail: null })).status).toBe(400); // LIBRARY needs it
      await edit(mine.id, owner.token, { generalLocation: 'CAFETERIA', locationDetail: 'Old Cafeteria' });
      const cleared = await edit(mine.id, owner.token, { locationDetail: null });
      expect(cleared.status).toBe(200);
      expect(cleared.body.data.item.locationDetail).toBeNull();
    });

    test('found-only fields: refused on a LOST report, allowed on a FOUND report', async () => {
      const wrong = await edit(mine.id, owner.token, { handedToOffice: true, privateStorageLocation: 'Shelf' });
      expect(wrong.status).toBe(400);
      expect(wrong.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['handedToOffice', 'privateStorageLocation']));

      const found = await makeItem(owner, validFound({ handedToOffice: false, privateStorageLocation: undefined }));
      const res = await edit(found.id, owner.token, { handedToOffice: true, privateStorageLocation: 'Security Office, shelf C' });
      expect(res.status).toBe(200);
      expect(res.body.data.item).toMatchObject({ handedToOffice: true, privateStorageLocation: 'Security Office, shelf C' });
    });

    test('a report can be edited only while it is OPEN or a POTENTIAL_MATCH; in every other status it is a 409', async () => {
      await setStatus(mine.id, 'POTENTIAL_MATCH');
      expect((await edit(mine.id, owner.token, { colour: 'RED' })).status).toBe(200);
      for (const status of ['UNDER_VERIFICATION', 'APPROVED_FOR_RETURN', 'RETURNED', 'CLOSED']) {
        await setStatus(mine.id, status);
        const res = await edit(mine.id, owner.token, { colour: 'BLUE' });
        expect([status, res.status, res.body.error.code]).toEqual([status, 409, 'CONFLICT']);
      }
      expect((await Item.findById(mine.id)).colour).toBe('RED');
    });

    test('someone else\'s CLOSED report: a stranger gets 404 (it is invisible to them), not 403', async () => {
      await setStatus(mine.id, 'CLOSED');
      expect((await edit(mine.id, other.token, { title: 'Hijacked title' })).status).toBe(404);
    });

    test('reportType and reporterId can never be changed, even by code that saves the document (immutable)', async () => {
      const doc = await Item.findById(mine.id);
      doc.reportType = 'FOUND';
      doc.reporterId = new mongoose.Types.ObjectId(other.id);
      await doc.save();
      const stored = await rawItems().findOne({ _id: new mongoose.Types.ObjectId(mine.id) });
      expect([stored.reportType, String(stored.reporterId)]).toEqual(['LOST', owner.id]);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('closing a report: PATCH /items/:id/close', () => {
    let mine;
    beforeEach(async () => {
      mine = await makeItem(owner, validLost());
    });
    const close = (id, token, body = {}) => call(app, 'patch', `/items/${id}/close`, token).send(body);

    test('T-ITM-11: the owner closes a report with a reason, and it moves to CLOSED', async () => {
      const res = await close(mine.id, owner.token, { reason: 'Found it in my bag.' });
      expect(res.status).toBe(200);
      expect(res.body.data.item).toMatchObject({ status: 'CLOSED', closeReason: 'Found it in my bag.', closedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
      const stored = await Item.findById(mine.id).select('+closeReason');
      expect([stored.status, stored.closeReason]).toEqual(['CLOSED', 'Found it in my bag.']);
    });

    test('the reason is optional', async () => {
      const res = await close(mine.id, owner.token);
      expect(res.status).toBe(200);
      expect(res.body.data.item.closeReason).toBeNull();
    });

    test('the closed report still shows in "my reports", marked CLOSED', async () => {
      await close(mine.id, owner.token);
      const list = (await call(app, 'get', '/items/mine?status=CLOSED', owner.token)).body.data;
      expect(list.map((i) => i.id)).toContain(mine.id);
    });

    test('another user cannot close it (403); an administrator cannot yet either (Stage 12); no login is a 401', async () => {
      const res = await close(mine.id, other.token);
      expect(res.status).toBe(403);
      expect((await close(mine.id, admin.token)).status).toBe(403);
      expect((await call(app, 'patch', `/items/${mine.id}/close`).send({})).status).toBe(401);
      expect((await Item.findById(mine.id)).status).toBe('OPEN');
    });

    test('closing twice is a 409 INVALID_STATE_TRANSITION', async () => {
      await close(mine.id, owner.token);
      const again = await close(mine.id, owner.token);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    test('a POTENTIAL_MATCH report can be closed; reports that are under verification, approved or returned cannot (by the owner)', async () => {
      await setStatus(mine.id, 'POTENTIAL_MATCH');
      expect((await close(mine.id, owner.token)).status).toBe(200);

      for (const status of ['UNDER_VERIFICATION', 'APPROVED_FOR_RETURN', 'RETURNED']) {
        const found = await makeItem(owner, validFound());
        await setStatus(found.id, status);
        const res = await close(found.id, owner.token);
        expect([status, res.status, res.body.error.code]).toEqual([status, 409, 'INVALID_STATE_TRANSITION']);
        expect((await Item.findById(found.id)).status).toBe(status); // unchanged
      }
    });

    test('an invalid request changes nothing: reason too long, or an extra field', async () => {
      expect((await close(mine.id, owner.token, { reason: 'x'.repeat(201) })).status).toBe(400);
      expect((await close(mine.id, owner.token, { status: 'RETURNED' })).status).toBe(400);
      expect((await Item.findById(mine.id)).status).toBe('OPEN');
    });

    test('once closed, the owner can no longer edit it (409)', async () => {
      await close(mine.id, owner.token);
      expect((await call(app, 'patch', `/items/${mine.id}`, owner.token).send({ colour: 'RED' })).status).toBe(409);
    });

    test('a stranger asking to close an already-closed report gets 404 (it is invisible to them)', async () => {
      await close(mine.id, owner.token);
      expect((await close(mine.id, other.token)).status).toBe(404);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('the database layer refuses nonsense even if the API were bypassed', () => {
    const base = () => ({ ...validLost(), dateOccurred: new Date(), reporterId: new mongoose.Types.ObjectId() });

    test('a LOST report cannot be handed to an office or have a storage location', async () => {
      await expect(Item.create({ ...base(), handedToOffice: true })).rejects.toThrow(/handedToOffice/);
      await expect(Item.create({ ...base(), privateStorageLocation: 'Shelf' })).rejects.toThrow(/privateStorageLocation/);
    });

    test('values outside the allowed lists are rejected', async () => {
      await expect(Item.create({ ...base(), category: 'FOOD' })).rejects.toThrow(/category/);
      await expect(Item.create({ ...base(), generalLocation: 'MARS' })).rejects.toThrow(/generalLocation/);
      await expect(Item.create({ ...base(), status: 'DONE' })).rejects.toThrow(/status/);
    });
  });
});
