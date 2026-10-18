import { validateConfig } from "../domain/config";
import { getSupabase } from "../services/integrations";
function check({ data, error }) {
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
}
export async function createSupabaseRepository() {
  const client = getSupabase();
  const { user } = check(await client.auth.getUser());
  if (!user) throw new Error("Sign in to your Supabase account first.");
  const business = check(
    await client
      .from("businesses")
      .select("id,config")
      .eq("owner_id", user.id)
      .single(),
  );
  const id = business.id;
  const repo = {
    mode: "cloud",
    businessId: id,
    async getSnapshot() {
      const rows = await Promise.all([
        client.from("businesses").select("config").eq("id", id).single(),
        client.from("appointments").select("data").eq("business_id", id),
        client.from("conversations").select("data").eq("business_id", id),
        client.from("confirmations").select("data").eq("business_id", id),
      ]);
      const [b, a, c, m] = rows.map(check);
      return {
        version: 1,
        revision: 0,
        config: b.config,
        appointments: a.map((x) => x.data),
        conversations: c.map((x) => x.data),
        confirmations: m.map((x) => x.data),
      };
    },
    async saveConfig(config) {
      validateConfig(config);
      check(
        await client.rpc("save_business_config", {
          p_business: id,
          p_config: config,
        }),
      );
      return config;
    },
    async startConversation(c) {
      check(
        await client
          .from("conversations")
          .insert({ id: c.id, business_id: id, data: c }),
      );
      return c;
    },
    async saveConversation(c) {
      return check(
        await client.rpc("save_conversation", {
          p_business: id,
          p_conversation: c,
        }),
      );
    },
    async book(input) {
      return check(
        await client.rpc("book_appointment", {
          p_business: id,
          p_input: input,
        }),
      );
    },
    async cancel(appointmentId) {
      return check(
        await client.rpc("cancel_appointment", {
          p_business: id,
          p_id: appointmentId,
        }),
      );
    },
    async reset() {
      throw new Error("Reset Demo Data is available only in local Demo Mode.");
    },
  };
  return repo;
}
