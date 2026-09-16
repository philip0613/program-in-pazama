import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bmegkgonjdektvywwnkx.supabase.co';
const supabaseKey = 'sb_publishable_Adv3RXQsXuA-sQT2Nudq-w_HbyIZ893';

export const supabase = createClient(supabaseUrl, supabaseKey);
