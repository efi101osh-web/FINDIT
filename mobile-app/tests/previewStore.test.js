import { ApiError } from '../src/api/ApiError';
import { closeItem, createItem, getItem, listItems, listMine, updateItem } from '../src/api/itemsApi';
import { allRecords, createRecord } from '../src/api/previewStore';
import { sampleItems } from '../src/api/sampleData';
import { describeWithBackend, fromBackend } from './helpers/backend';

const CARD_KEYS = ['category', 'colour', 'createdAt', 'dateOccurred', 'generalLocation', 'id', 'image', 'isMine', 'locationDetail', 'reportType', 'status', 'title'];
const lost = (over = {}) => ({ reportType: 'LOST', title: 'Red umbrella', category: 'OTHER', colour: 'RED', description: 'A red folding umbrella.', generalLocation: 'LIBRARY', locationDetail: 'Reading room', dateOccurred: '2026-11-24', approximateTime: 'EVENING', privateDetails: 'Wooden handle', ...over });
const found = (over = {}) => lost({ reportType: 'FOUND', title: 'Blue flask', generalLocation: 'MALE_HALLS', locationDetail: 'Winslow', handedToOffice: true, privateStorageLocation: 'Security Office', ...over });
const rejects = async (promise, status) => {
  const error = await promise.then(() => null, (failure) => failure);
  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(status);
  return error;
};

describe('who sees what (as the server does)', () => {
  test('someone else\'s report shows no private field at all', async () => {
    const view = await getItem('s2');
    for (const key of ['privateDetails', 'privateStorageLocation', 'closedAt', 'closeReason', 'reporter', 'reporterId']) expect([key, key in view]).toEqual([key, false]);
    expect(view).toMatchObject({ title: 'Set of keys on a red lanyard', isMine: false, handedToOffice: true });
  });
  test('my own report shows my private details', async () => {
    const view = await getItem('s1');
    expect(view).toMatchObject({ isMine: true, privateDetails: 'Small scratch on the left earcup; blue sticker inside the case.', closedAt: null, closeReason: null });
  });
  test('an unknown report is a 404 with the server\'s wording', async () => {
    const error = await rejects(getItem('nope'), 404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Report not found.');
  });
  test('a lost report never has found-only fields', async () => {
    expect(await getItem('s1')).not.toHaveProperty('handedToOffice');
    expect(await getItem('s1')).not.toHaveProperty('privateStorageLocation');
  });
});

describe('rules that depend on whose report it is (the sample reports alone cannot show these)', () => {
  const record = (id) => allRecords().find((candidate) => candidate.id === id);

  test('someone else\'s report never shows private data, even if the server-side copy has some', async () => {
    Object.assign(record('s2'), { privateDetails: 'SECRET-MARK-123', privateStorageLocation: 'VAULT-9', closedAt: '2026-11-01T00:00:00.000Z', closeReason: 'SECRET-REASON' });
    const view = await getItem('s2');
    const text = JSON.stringify(view);
    for (const secret of ['SECRET-MARK-123', 'VAULT-9', 'SECRET-REASON']) expect([secret, text.includes(secret)]).toEqual([secret, false]);
    for (const key of ['privateDetails', 'privateStorageLocation', 'closedAt', 'closeReason']) expect([key, key in view]).toEqual([key, false]);
  });

  test('my own report does show them', async () => {
    Object.assign(record('s1'), { privateStorageLocation: 'ignored for lost', closeReason: 'Found it.' });
    expect(await getItem('s1')).toMatchObject({ privateDetails: expect.any(String), closeReason: 'Found it.' });
  });

  test('someone else\'s CLOSED report is a 404, and is in no list', async () => {
    record('s2').status = 'CLOSED';
    await rejects(getItem('s2'), 404);
    expect((await listItems({})).items.map((card) => card.id)).not.toContain('s2');
    expect((await listMine({})).items.map((card) => card.id)).not.toContain('s2');
    await rejects(updateItem('s2', { title: 'x' }), 404);
    await rejects(closeItem('s2', {}), 404);
  });

  test('a RETURNED report is left out of the default list and shown only when asked for', async () => {
    record('s6').status = 'RETURNED';
    expect((await listItems({})).items.map((card) => card.id)).not.toContain('s6');
    expect((await listItems({ status: 'RETURNED' })).items.map((card) => card.id)).toEqual(['s6']);
    expect((await listItems({ q: 'calculator' })).items).toEqual([]);
  });
});

describe('creating', () => {
  test('a new lost report is open, mine, and has the owner\'s view', async () => {
    const made = await createItem(lost());
    expect(made).toMatchObject({ reportType: 'LOST', status: 'OPEN', isMine: true, title: 'Red umbrella', privateDetails: 'Wooden handle', closedAt: null, closeReason: null, images: [], brand: null });
    expect(made.dateOccurred).toBe('2026-11-24T00:00:00.000Z');
    expect(made).not.toHaveProperty('handedToOffice');
  });
  test('a new found report keeps the office flag and the private storage place', async () => {
    expect(await createItem(found())).toMatchObject({ reportType: 'FOUND', handedToOffice: true, privateStorageLocation: 'Security Office' });
  });
  test('it appears in the public list and in my reports', async () => {
    const made = await createItem(lost());
    expect((await listItems({})).items.map((card) => card.id)).toContain(made.id);
    expect((await listMine({})).items.map((card) => card.id)).toContain(made.id);
  });
  test('the id is new each time', async () => {
    const [a, b] = [await createItem(lost()), await createItem(lost())];
    expect(a.id).not.toBe(b.id);
  });
});

describe('editing', () => {
  test('the owner can edit, and only the sent fields change', async () => {
    const changed = await updateItem('s1', { brand: 'Bose', approximateTime: 'EVENING' });
    expect(changed).toMatchObject({ brand: 'Bose', approximateTime: 'EVENING', title: 'Black wireless headphones' });
  });
  test('null removes an optional field', async () => {
    const changed = await updateItem('s1', { brand: null, privateDetails: null });
    expect(changed).toMatchObject({ brand: null, privateDetails: null });
  });
  test('changing the zone drops the old detail unless a new one is sent', async () => {
    expect(await updateItem('s1', { generalLocation: 'NOT_SURE' })).toMatchObject({ generalLocation: 'NOT_SURE', locationDetail: null });
    expect(await updateItem('s1', { generalLocation: 'MALE_HALLS', locationDetail: 'Winslow' })).toMatchObject({ generalLocation: 'MALE_HALLS', locationDetail: 'Winslow' });
  });
  test('someone else\'s report is a 403', async () => {
    const error = await rejects(updateItem('s2', { title: 'Hijacked' }), 403);
    expect(error.code).toBe('FORBIDDEN');
  });
  test('a report that is being handled can no longer be edited (409)', async () => {
    const error = await rejects(updateItem('s5', { title: 'New title' }), 409);
    expect(error.code).toBe('CONFLICT');
  });
  test('found-only fields on a lost report are a 400 that names the fields', async () => {
    const error = await rejects(updateItem('s1', { handedToOffice: true, privateStorageLocation: 'Shelf' }), 400);
    expect(error.details.map((detail) => detail.field).sort()).toEqual(['handedToOffice', 'privateStorageLocation']);
  });
});

describe('closing', () => {
  test('the owner closes an open report, with a reason', async () => {
    const closed = await closeItem('s1', { reason: 'Found it.' });
    expect(closed).toMatchObject({ status: 'CLOSED', closeReason: 'Found it.' });
    expect(closed.closedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  test('a closed report leaves the public list but stays in my reports', async () => {
    await closeItem('s1', {});
    expect((await listItems({})).items.map((card) => card.id)).not.toContain('s1');
    const mine = (await listMine({})).items;
    expect(mine.find((card) => card.id === 's1').status).toBe('CLOSED');
  });
  test('closing twice is a 409 INVALID_STATE_TRANSITION', async () => {
    await closeItem('s1', {});
    const error = await rejects(closeItem('s1', {}), 409);
    expect(error.code).toBe('INVALID_STATE_TRANSITION');
  });
  test('a report under verification cannot be closed by its owner', async () => {
    await rejects(closeItem('s5', {}), 409);
  });
  test('someone else\'s report cannot be closed (403)', async () => {
    await rejects(closeItem('s2', {}), 403);
  });
  test('after closing, the owner can no longer edit it', async () => {
    await closeItem('s1', {});
    await rejects(updateItem('s1', { title: 'Late edit' }), 409);
  });
});

describe('the public list (browse and search follow the server\'s rules)', () => {
  const titles = async (query) => (await listItems(query)).items.map((card) => card.title);
  const ids = async (query) => (await listItems(query)).items.map((card) => card.id);

  test('with nothing asked it lists every active report, newest first, as cards', async () => {
    const { items, meta } = await listItems({});
    expect(items).toHaveLength(8);
    expect(items.map((card) => card.id)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']);
    expect(meta).toEqual({ page: 1, limit: 20, total: 8, totalPages: 1 });
    for (const card of items) expect(Object.keys(card).sort()).toEqual(CARD_KEYS);
  });
  test('partial words work, in any letter case', async () => {
    expect(await ids({ q: 'head' })).toEqual(['s1']);
    expect(await ids({ q: 'HEADPHONES' })).toEqual(['s1']);
  });
  test('several words must ALL match, in any order', async () => {
    expect(await ids({ q: 'black headphones' })).toEqual(['s1']);
    expect(await ids({ q: 'headphones black' })).toEqual(['s1']);
    expect(await ids({ q: 'headphones red' })).toEqual([]);
  });
  test('the description, the brand, the place detail and the zone name are searched', async () => {
    expect(await ids({ q: 'bench' })).toEqual(['s2']); // description
    expect(await ids({ q: 'adid' })).toEqual(['s3']); // brand
    expect(await ids({ q: 'winslow' })).toEqual(['s2']); // hall chosen from the list
    expect(await ids({ q: 'residence' })).toEqual(['s2', 's4']); // "Halls of residence (male/female)"
    expect(await ids({ q: 'library' })).toEqual(['s1']);
  });
  test('PRIVATE details are never searched, even for my own report', async () => {
    expect(await ids({ q: 'earcup' })).toEqual([]);
    expect(await ids({ q: 'sticker' })).toEqual([]);
    expect(await ids({ q: 'tear' })).toEqual([]);
  });
  test('text like a pattern is only text', async () => {
    for (const q of ['.*', '(.*)+$', '[a-z]+', '(a+)+$']) expect([q, await ids({ q })]).toEqual([q, []]);
  });
  test('only the first five words are used', async () => {
    expect(await ids({ q: 'black wireless headphones in zebra' })).toEqual([]); // the 5th word is used, and matches nothing
    expect(await ids({ q: 'black wireless headphones in a zebra' })).toEqual(['s1']); // the 6th word is ignored
  });
  test('filters: type, category, colour, place, and they combine', async () => {
    expect(await ids({ reportType: 'LOST' })).toEqual(['s1', 's4', 's5', 's8']);
    expect(await ids({ category: 'KEYS' })).toEqual(['s2']);
    expect(await ids({ colour: 'GREY' })).toEqual(['s4', 's6']);
    expect(await ids({ location: 'CHURCH' })).toEqual(['s5']);
    expect(await ids({ reportType: 'FOUND', category: 'ELECTRONICS' })).toEqual(['s6']);
    expect(await ids({ reportType: 'LOST', colour: 'GREY' })).toEqual(['s4']);
  });
  test('a status can be asked for; RETURNED shows only when asked for', async () => {
    expect(await ids({ status: 'UNDER_VERIFICATION' })).toEqual(['s5']);
    expect(await ids({ status: 'RETURNED' })).toEqual([]);
    expect(await ids({ status: 'CLOSED' })).toEqual([]);
  });
  test('date range, inclusive at both ends', async () => {
    const day = (id) => sampleItems.find((card) => card.id === id).dateOccurred.slice(0, 10);
    expect(await ids({ dateFrom: day('s2'), dateTo: day('s2') })).toEqual(['s2']);
    expect(await ids({ dateFrom: day('s3'), dateTo: day('s1') })).toEqual(['s1', 's2', 's3']);
  });
  test('the four sorts', async () => {
    expect(await ids({ sort: 'oldest' })).toEqual(['s8', 's7', 's6', 's5', 's4', 's3', 's2', 's1']);
    expect(await ids({ sort: 'eventNewest' })).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']);
    expect(await ids({ sort: 'eventOldest' })).toEqual(['s8', 's7', 's6', 's5', 's4', 's3', 's2', 's1']);
    expect(await ids({ sort: 'newest' })).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']);
  });
  test('paging gives each report exactly once', async () => {
    const first = await listItems({ page: 1, limit: 3 });
    const second = await listItems({ page: 2, limit: 3 });
    const third = await listItems({ page: 3, limit: 3 });
    expect([first.items.length, second.items.length, third.items.length]).toEqual([3, 3, 2]);
    expect(first.meta).toEqual({ page: 1, limit: 3, total: 8, totalPages: 3 });
    expect([...first.items, ...second.items, ...third.items].map((card) => card.id)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']);
  });
  test('no match is an empty list, not an error', async () => {
    const reply = await listItems({ q: 'zzzzzz' });
    expect(reply.items).toEqual([]);
    expect(reply.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    expect(await titles({ q: 'zzzzzz' })).toEqual([]);
  });
});

describe('my reports', () => {
  test('only mine, newest first, with filters', async () => {
    expect((await listMine({})).items.map((card) => card.id)).toEqual(['s1', 's5']);
    expect((await listMine({ reportType: 'FOUND' })).items).toEqual([]);
    expect((await listMine({ status: 'UNDER_VERIFICATION' })).items.map((card) => card.id)).toEqual(['s5']);
  });
  test('a report I create goes to the top', async () => {
    const made = createRecord(lost());
    expect((await listMine({})).items[0].id).toBe(made.id);
    expect(allRecords()[0].id).toBe(made.id);
  });
});

describeWithBackend('the preview reports have exactly the fields the server sends', () => {
  let serializers;
  beforeAll(() => {
    serializers = fromBackend('src/utils/serializers.js');
  });
  const serverKeys = (reportType, includePrivate) =>
    Object.keys(
      serializers.toItemDetail(
        { _id: 'x', reportType, title: 't', description: 'd', category: 'KEYS', colour: 'RED', generalLocation: 'NOT_SURE', dateOccurred: new Date(), status: 'OPEN', reporterId: 'u', createdAt: new Date(), updatedAt: new Date() },
        includePrivate ? 'u' : 'someone-else',
        { includePrivate }
      )
    ).sort();

  test('a stranger\'s view, lost and found', async () => {
    expect(Object.keys(await getItem('s4')).sort()).toEqual(serverKeys('LOST', false));
    expect(Object.keys(await getItem('s2')).sort()).toEqual(serverKeys('FOUND', false));
  });
  test('the owner\'s view, lost and found', async () => {
    expect(Object.keys(await getItem('s1')).sort()).toEqual(serverKeys('LOST', true));
    expect(Object.keys(await createItem(found())).sort()).toEqual(serverKeys('FOUND', true));
    expect(Object.keys(await createItem(lost())).sort()).toEqual(serverKeys('LOST', true));
  });
  test('the owner\'s view after an edit and after closing keeps the same shape', async () => {
    expect(Object.keys(await updateItem('s1', { brand: 'X' })).sort()).toEqual(serverKeys('LOST', true));
    expect(Object.keys(await closeItem('s1', {})).sort()).toEqual(serverKeys('LOST', true));
  });
});
