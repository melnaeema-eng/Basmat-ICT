import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pxbtwjuerndgmppicumr.supabase.co";
const supabaseAnonKey = "sb_publishable__yXcbi0MFx4OyGMz21HUQQ_ha8JOcMG";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);