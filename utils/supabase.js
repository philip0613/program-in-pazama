import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bmegkgonjdektvywwnkx.supabase.co';
// 모든 권한을 다 뚫어버리는 마스터 키 (시크릿 키) 적용 완료!
const supabaseKey = 'sb_secret_ZUSCuGxV8uiH8_7XRZkwqg_PjqIA5oG';

export const supabase = createClient(supabaseUrl, supabaseKey);
