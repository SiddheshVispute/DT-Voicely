import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFile } from "node:fs/promises";
import { defaultConfig } from "../src/domain/config";
import { today, addDays, weekday } from "../src/domain/time";
let db, business, booking;
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist } });
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users(id) values('${owner}'),('${other}');`,
  );
  const sql = await readFile(
    new URL("../supabase/migrations/202610180001_voicely.sql", import.meta.url),
    "utf8",
  );
  await db.exec(sql);
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
  business = (
    await db.query("select public.create_business($1::jsonb) as id", [
      JSON.stringify(defaultConfig),
    ])
  ).rows[0].id;
}, 60000);
afterAll(async () => {
  await db?.close();
});
it("executes the complete migration and validates business config", async () => {
  expect(business).toBeTruthy();
  const rows = await db.query("select id from public.businesses");
  expect(rows.rows).toHaveLength(1);
  const invalid = { ...defaultConfig, buffer: -1 };
  await expect(
    db.query("select public.save_business_config($1,$2::jsonb)", [
      business,
      JSON.stringify(invalid),
    ]),
  ).rejects.toThrow(/Invalid setting/);
});
it("atomically books with confirmation, prevents duplicate requests and buffer conflicts", async () => {
  let date = addDays(today(defaultConfig.timezone), 2);
  while (weekday(date) === 0) date = addDays(date, 1);
  const input = {
    customer: "Database Customer",
    serviceId: "consultation",
    date,
    time: "10:00",
    idempotencyKey: "db-one",
  };
  booking = (
    await db.query("select public.book_appointment($1,$2::jsonb) as a", [
      business,
      JSON.stringify(input),
    ])
  ).rows[0].a;
  const again = (
    await db.query("select public.book_appointment($1,$2::jsonb) as a", [
      business,
      JSON.stringify(input),
    ])
  ).rows[0].a;
  expect(again.id).toBe(booking.id);
  expect(
    (await db.query("select * from public.confirmations")).rows,
  ).toHaveLength(1);
  for (const time of ["10:00", "10:15", "10:35"])
    await expect(
      db.query("select public.book_appointment($1,$2::jsonb)", [
        business,
        JSON.stringify({ ...input, time, idempotencyKey: `other-${time}` }),
      ]),
    ).rejects.toThrow(/conflict/);
  await db.query("select public.book_appointment($1,$2::jsonb)", [
    business,
    JSON.stringify({ ...input, time: "10:40", idempotencyKey: "boundary" }),
  ]);
});
it("enforces RLS and rejects unauthorized RPC and direct table mutations", async () => {
  await expect(
    db.query("update public.appointments set status=$1", ["cancelled"]),
  ).rejects.toThrow(/permission denied/);
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false);`);
  expect(
    (await db.query("select * from public.appointments")).rows,
  ).toHaveLength(0);
  expect((await db.query("select * from public.businesses")).rows).toHaveLength(
    0,
  );
  await expect(
    db.query("select public.cancel_appointment($1,$2)", [business, booking.id]),
  ).rejects.toThrow(/Unauthorized/);
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false);`);
});
it("cancels and releases the slot without deleting its historical confirmation", async () => {
  const a = (
    await db.query("select public.cancel_appointment($1,$2) as a", [
      business,
      booking.id,
    ])
  ).rows[0].a;
  expect(a.status).toBe("cancelled");
  let date = addDays(today(defaultConfig.timezone), 2);
  while (weekday(date) === 0) date = addDays(date, 1);
  const result = (
    await db.query("select public.book_appointment($1,$2::jsonb) as a", [
      business,
      JSON.stringify({
        customer: "Replacement Customer",
        date,
        time: "10:00",
        serviceId: "consultation",
        idempotencyKey: "replacement",
      }),
    ])
  ).rows[0].a;
  expect(result.status).toBe("confirmed");
  expect(
    (await db.query("select * from public.confirmations")).rows,
  ).toHaveLength(3);
});
it("retains actual transcript, booking links and outcomes across transcript updates", async () => {
  const id = crypto.randomUUID(),
    c = {
      id,
      startedAt: new Date().toISOString(),
      messages: [
        {
          id: "one",
          role: "customer",
          text: "Book a follow-up",
          at: new Date().toISOString(),
        },
      ],
      appointmentIds: [],
      outcome: "inquiry",
      summary: "Actual request",
    };
  await db.query(
    "insert into public.conversations(id,business_id,data) values($1,$2,$3::jsonb)",
    [id, business, JSON.stringify(c)],
  );
  let date = addDays(today(defaultConfig.timezone), 3);
  while (weekday(date) === 0) date = addDays(date, 1);
  const a = (
    await db.query("select public.book_appointment($1,$2::jsonb) as a", [
      business,
      JSON.stringify({
        customer: "Transcript Customer",
        date,
        time: "15:00",
        serviceId: "followup",
        idempotencyKey: "with-call",
        conversationId: id,
      }),
    ])
  ).rows[0].a;
  const saved = (
    await db.query("select public.save_conversation($1,$2::jsonb) as c", [
      business,
      JSON.stringify({
        ...c,
        messages: [
          ...c.messages,
          { id: "two", role: "assistant", text: "Confirmed" },
        ],
      }),
    ])
  ).rows[0].c;
  expect(saved.outcome).toBe("booked");
  expect(saved.appointmentIds).toEqual([a.id]);
  expect(saved.messages.map((x) => x.text)).toEqual([
    "Book a follow-up",
    "Confirmed",
  ]);
});
