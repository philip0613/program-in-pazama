import { createClient } from '@supabase/supabase-js';

// 복잡한 환경변수 설정 없이 알려주신 키를 직접 넣었습니다.
const supabaseUrl = 'https://bmegkgonjdektvywwnkx.supabase.co';
const supabaseKey = 'sb_publishable_Adv3RXQsXuA-sQT2Nudq-w_HbyIZ893';

export const supabase = createClient(supabaseUrl, supabaseKey);
