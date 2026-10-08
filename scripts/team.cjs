#!/usr/bin/env node
// 팀원용 도우미: Git 명령어를 몰라도 작업 시작 / 실행 / 올리기 / 최신 받기를 할 수 있게 해줍니다.
// 보통은 폴더의 .bat 파일(맥은 맥용/ 폴더의 .command)을 더블클릭해서 사용합니다.
//   node scripts/team.cjs start   작업시작: 최신 코드 받기 + 내 작업 공간(브랜치) 만들기
//   node scripts/team.cjs run     실행하기: 필요한 파일 설치 + 개발 서버 실행
//   node scripts/team.cjs save    올리기:   저장(commit) + 최신 코드 합치기 + 올리기(push) + PR 페이지 열기
//   node scripts/team.cjs sync    최신받기: 친구들이 합친 최신 코드 받기
// 이 파일은 프론트/백엔드 레포에 똑같이 들어 있습니다. 고칠 때는 양쪽을 같이 고쳐주세요.

const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const MAIN = 'main';
const IS_WIN = process.platform === 'win32';

// ───────── 출력 ─────────

class FriendlyError extends Error {}
const say = (msg = '') => console.log(msg);
const done = (msg) => console.log(`\n✅ ${msg}`);
const warn = (msg) => console.log(`\n⚠️  ${msg}`);
const fail = (msg) => { throw new FriendlyError(msg); };
const HELP = '이 창을 캡처해서 단톡방에 올려주세요. 같이 해결해요!';

// ───────── 입력 (파이프 입력에서도 줄 단위로 동작하도록 한 인터페이스만 사용) ─────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const pendingLines = [];
const waiters = [];
let inputClosed = false;
rl.on('line', (line) => (waiters.length ? waiters.shift()(line) : pendingLines.push(line)));
rl.on('close', () => {
  inputClosed = true;
  while (waiters.length) waiters.shift()('');
});

function ask(question) {
  process.stdout.write(`\n${question}\n> `);
  return new Promise((resolve) => {
    if (pendingLines.length) resolve(pendingLines.shift());
    else if (inputClosed) resolve('');
    else waiters.push(resolve);
  }).then((answer) => answer.trim());
}

// ───────── Git ─────────

function git(args, { allowFail = false, raw = false } = {}) {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8' });
  if (r.error) throw r.error;
  const out = r.stdout || '';
  const result = { ok: r.status === 0, out: raw ? out : out.trim(), err: (r.stderr || '').trim() };
  if (!result.ok && !allowFail) {
    fail(`Git 작업 중 문제가 생겼어요: git ${args.join(' ')}\n${result.err || result.out}\n\n${HELP}`);
  }
  return result;
}

// 로그인 창이 뜰 수 있는 작업(push)은 화면에 그대로 연결
function gitLive(args) {
  const r = spawnSync('git', args, { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
}

function checkGit() {
  const r = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (r.error) {
    fail(
      'Git 이 설치되어 있지 않아요.\n' +
      (IS_WIN
        ? '  https://git-scm.com/download/win 에서 설치하세요 (설치 화면은 전부 Next 눌러도 돼요).\n'
        : '  터미널에서 git 을 한 번 입력하면 설치 안내가 나와요.\n') +
      '  설치 후 이 창을 닫고 다시 실행하세요.'
    );
  }
  if (!git(['rev-parse', '--is-inside-work-tree'], { allowFail: true }).ok) {
    fail('이 폴더가 GitHub 에서 가져온(Clone) 폴더가 아니에요. 가이드 2번을 다시 확인해주세요.');
  }
}

async function ensureIdentity() {
  if (!git(['config', 'user.name'], { allowFail: true }).out) {
    const name = await ask('처음 한 번만 물어볼게요. GitHub 아이디가 뭐예요? (예: Chanu0525)');
    if (!name) fail('아이디를 입력해야 해요. 다시 실행해주세요.');
    git(['config', '--global', 'user.name', name]);
  }
  if (!git(['config', 'user.email'], { allowFail: true }).out) {
    const email = await ask('GitHub 에 가입한 이메일 주소를 적어주세요.');
    if (!email.includes('@')) fail('이메일 주소가 올바르지 않아요. 다시 실행해주세요.');
    git(['config', '--global', 'user.email', email]);
  }
}

const currentBranch = () => git(['branch', '--show-current']).out;
const changedLines = () => git(['status', '--porcelain', '--untracked-files=all'], { raw: true }).out.split('\n').filter(Boolean);
const isDirty = () => changedLines().length > 0;
const countCommits = (range) => Number(git(['rev-list', '--count', range], { allowFail: true }).out || 0);
const refExists = (ref) => git(['rev-parse', '--verify', '--quiet', ref], { allowFail: true }).ok;
const hasUpstream = () => git(['rev-parse', '--abbrev-ref', '@{u}'], { allowFail: true }).ok;

function fetchLatest() {
  say('🌐 GitHub 에서 최신 정보를 확인하는 중...');
  if (!git(['fetch', 'origin', '--prune'], { allowFail: true }).ok) {
    fail('GitHub 에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 실행하세요.');
  }
}

function printChanges() {
  const labels = { '??': '새 파일', A: '새 파일', M: '수정', D: '삭제', R: '이름 변경' };
  say('\n📝 바뀐 파일:');
  for (const line of changedLines()) {
    const code = line.slice(0, 2).trim();
    const label = labels[code] || labels[code[0]] || '변경';
    say(`   [${label}] ${line.slice(3)}`);
  }
}

// "댓글 기능" → "feat/댓글-기능" (이미 있으면 -2, -3 ...)
function toBranchName(text) {
  const slug = text
    .replace(/\s+/g, '-')
    .replace(/[~^:?*[\]\\@{}'"`<>|!#$%&()+,;=]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[-./]+|[-./]+$/g, '')
    .slice(0, 40) || '작업';
  let name = `feat/${slug}`;
  if (!git(['check-ref-format', '--branch', name], { allowFail: true }).ok) name = `feat/작업-${Date.now()}`;
  const base = name;
  for (let i = 2; refExists(`refs/heads/${name}`) || refExists(`refs/remotes/origin/${name}`); i++) name = `${base}-${i}`;
  return name;
}

// main 을 GitHub 최신 상태로. main 에 실수로 저장(commit)한 내용이 있으면 새 작업 공간으로 옮겨서 보존
function updateMainBranch() {
  if (git(['merge', '--ff-only', `origin/${MAIN}`], { allowFail: true }).ok) return null;
  const rescue = toBranchName(`main에서-한-작업-${new Date().toISOString().slice(0, 10)}`);
  git(['branch', rescue]);
  git(['reset', '--hard', `origin/${MAIN}`]);
  warn(`원본(main)에 실수로 저장된 내용이 있어서 "${rescue}" 작업 공간으로 옮겨놨어요.\n` +
       '   그 내용을 올리고 싶으면 단톡방에 도움을 요청하세요.');
  return rescue;
}

// 내 작업 공간에 최신 main 합치기. 충돌이 나면 되돌리고 false
function mergeLatestMain() {
  const r = git(['merge', '--no-edit', `origin/${MAIN}`], { allowFail: true });
  if (r.ok) return true;
  git(['merge', '--abort'], { allowFail: true });
  return false;
}

function repoWebUrl() {
  const url = git(['remote', 'get-url', 'origin']).out;
  const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
  return m ? `https://github.com/${m[1]}` : null;
}

function openBrowser(url) {
  say(`\n🔗 ${url}`);
  if (process.env.TEAM_NO_BROWSER) return;
  if (IS_WIN) spawnSync('cmd', ['/c', 'start', '""', url]);
  else spawnSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [url]);
}

// ───────── 명령 ─────────

async function start() {
  checkGit();
  const branch = currentBranch();
  if (isDirty()) {
    printChanges();
    fail(`아직 올리지 않은 수정 내용이 있어요 (지금 작업 공간: ${branch}).\n` +
         '   먼저 "올리기"를 실행해서 올린 다음, 다시 "작업시작"을 해주세요.');
  }
  fetchLatest();
  if (branch !== MAIN) git(['switch', MAIN]);
  updateMainBranch();
  say('📥 최신 코드를 받았어요.');

  const what = await ask('무슨 작업을 하나요? 짧게 적어주세요. (예: 댓글 기능, 로그인 버그 수정)');
  const name = toBranchName(what);
  git(['switch', '-c', name]);

  done(`"${name}" 작업 공간을 만들었어요!\n` +
       '   이제 VS Code 에서 코드를 고치세요.\n' +
       '   다 고쳤으면 → "올리기" 더블클릭');
}

async function save() {
  checkGit();
  await ensureIdentity();
  fetchLatest();

  let branch = currentBranch();
  if (branch === MAIN) {
    const ahead = countCommits(`origin/${MAIN}..${MAIN}`);
    if (!isDirty() && ahead === 0) fail('올릴 수정 내용이 없어요. 코드를 고친 뒤 저장(Ctrl+S)했는지 확인해주세요.');
    warn('지금 원본(main)에 있어요. 수정 내용을 새 작업 공간으로 안전하게 옮길게요.');
    const what = await ask('무슨 작업이었나요? 짧게 적어주세요. (예: 댓글 기능)');
    branch = toBranchName(what);
    git(['switch', '-c', branch]);
    if (ahead > 0) git(['branch', '-f', MAIN, `origin/${MAIN}`]);
  }

  if (isDirty()) {
    printChanges();
    const message = (await ask('무엇을 했는지 한 줄로 적어주세요. (예: 댓글 목록 화면 추가)')) || '작업 내용 저장';
    git(['add', '-A']);
    git(['commit', '-q', '-m', message]);
    say('💾 저장했어요.');
  }

  const unpushed = hasUpstream() ? countCommits('@{u}..HEAD') : countCommits(`origin/${MAIN}..HEAD`);
  if (unpushed === 0) fail('올릴 새 내용이 없어요. 이미 다 올라가 있어요!');

  const merged = mergeLatestMain();

  say('\n⬆️  GitHub 에 올리는 중... (처음이면 GitHub 로그인 창이 뜰 수 있어요. 로그인해주세요)');
  if (!gitLive(['push', '-u', 'origin', branch])) {
    fail('올리기에 실패했어요.\n' +
         '   - 인터넷 연결을 확인하세요\n' +
         '   - GitHub 초대 메일에서 "Accept invitation" 을 눌렀는지 확인하세요\n' +
         `   ${HELP}`);
  }

  done(`"${branch}" 작업 공간에 올렸어요!`);
  if (!merged) {
    warn('다른 친구가 같은 부분을 고쳐서 자동으로 합치지 못했어요 (충돌).\n' +
         '   올리기는 됐지만, 합치기 전에 정리가 필요해요. 단톡방에 도움을 요청하세요.');
  }
  const web = repoWebUrl();
  if (web) {
    say('\n👉 브라우저가 열리면 초록색 "Create pull request" 버튼을 눌러주세요.\n' +
        '   (이미 요청을 만들었다면 그냥 닫아도 돼요. 올린 내용이 자동으로 추가돼요)');
    openBrowser(`${web}/compare/${MAIN}...${encodeURI(branch)}?expand=1`);
  }
}

async function sync() {
  checkGit();
  const branch = currentBranch();
  if (isDirty()) {
    printChanges();
    fail('아직 올리지 않은 수정 내용이 있어요.\n' +
         '   먼저 "올리기"를 실행하세요. 올리기를 하면 최신 코드도 같이 합쳐져요.');
  }
  fetchLatest();
  if (branch === MAIN) {
    updateMainBranch();
  } else {
    git(['fetch', 'origin', `${MAIN}:${MAIN}`], { allowFail: true });
    if (!mergeLatestMain()) {
      fail('다른 친구가 같은 부분을 고쳐서 자동으로 합치지 못했어요 (충돌).\n' +
           `   내 작업은 그대로 있으니 걱정 마세요. ${HELP}`);
    }
  }
  done(`최신 코드를 받았어요! (지금 작업 공간: ${branch})\n` +
       '   실행 중인 창이 있다면 닫고 "실행하기"를 다시 해주세요.');
}

function run() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const isVite = /vite/.test(pkg.scripts?.dev || '');

  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile) && fs.existsSync(path.join(ROOT, '.env.example'))) {
    fs.copyFileSync(path.join(ROOT, '.env.example'), envFile);
    say('🔑 .env 파일을 새로 만들었어요. 단톡방에서 받은 키값을 넣어주세요.');
  }

  // package-lock.json 이 바뀌었을 때만 설치 (npm ci 는 lock 파일을 수정하지 않음)
  const lockFile = path.join(ROOT, 'package-lock.json');
  const stampFile = path.join(ROOT, 'node_modules', '.team-installed');
  const lockHash = fs.existsSync(lockFile)
    ? crypto.createHash('sha1').update(fs.readFileSync(lockFile)).digest('hex')
    : 'no-lock';
  const installed = fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') === lockHash;
  if (!installed) {
    say('📦 필요한 파일을 설치하는 중... (처음이나 친구가 새 라이브러리를 추가했을 때만, 1~2분 걸려요)');
    const r = spawnSync('npm', [fs.existsSync(lockFile) ? 'ci' : 'install', '--no-fund', '--no-audit', '--loglevel=error'], {
      cwd: ROOT, stdio: 'inherit', shell: IS_WIN
    });
    if (r.status !== 0) fail(`설치에 실패했어요. ${HELP}`);
    fs.writeFileSync(stampFile, lockHash);
  }

  say('\n==================================================');
  say(isVite
    ? ' 🖥  잠시 후 브라우저가 자동으로 열려요 (http://localhost:5173)'
    : ' 🖥  서버 실행 중! 확인: http://localhost:8080/api/test');
  say(' 끄려면 이 창을 닫으세요. (코드를 고치면 자동으로 반영돼요)');
  say('==================================================\n');
  rl.close();
  spawnSync('npm', ['run', 'dev', ...(isVite ? ['--', '--open'] : [])], { cwd: ROOT, stdio: 'inherit', shell: IS_WIN });
}

// ───────── 시작 ─────────

const commands = { start, save, sync, run };
const command = commands[process.argv[2]];

(async () => {
  try {
    if (!command) fail(`사용법: node scripts/team.cjs <${Object.keys(commands).join('|')}>`);
    await command();
  } catch (err) {
    if (err instanceof FriendlyError) console.log(`\n❌ ${err.message}`);
    else console.log(`\n❌ 예상하지 못한 문제가 생겼어요: ${err.message}\n${HELP}`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
})();
