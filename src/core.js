const MODES = ['Auto', 'DSA', 'System Design', 'JavaScript', 'React', 'Machine Coding'];
const DEMO = [
  {mode:'DSA', question:'How would you find the first non-repeating character in a string?'},
  {mode:'System Design', question:'Design a webhook processing system that handles bursts of over 1,000 requests per second.'},
  {mode:'JavaScript', question:'What is the output of Promise.resolve().then(() => console.log(1)); console.log(2);?'},
  {mode:'React', question:'How do you avoid an unnecessary fetch when a React search input changes rapidly?'},
  {mode:'Machine Coding', question:'Build a small searchable list with loading, empty, and error states in React.'},
  {mode:'Auto', question:'What did you personally own in the AI calling platform, and how did you handle webhook retries?'},
  {mode:'Auto', question:'What does the error in this screenshot mean, and what would you check first?', screenshot:true}
];
function cleanText(value, max=20000) {
  if (typeof value !== 'string') throw new Error('Expected text');
  return value.replace(/\0/g,'').trim().slice(0,max);
}
function validMode(value) { if (!MODES.includes(value)) throw new Error('Invalid mode'); return value; }
function looksLikeQuestion(text) {
  const q = text.trim();
  return q.endsWith('?') || /^(how|what|why|when|where|which|explain|describe|design|implement|build|write|compare|tell me|walk me through|can you|could you|is |are )\b/i.test(q);
}
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b)=>a-b);
  return Math.round(sorted[Math.ceil(p*sorted.length)-1]);
}
function stats(values) {return {n:values.length, median:percentile(values,.5), p95:percentile(values,.95)};}
function markdownReview(session, turns) {
  const lines = [`# Interview review — ${session.created_at}`, '', `Mode: ${session.mode}`, ''];
  for (const t of turns) lines.push(`## ${t.role === 'question' ? 'Question' : t.role === 'answer' ? 'Answer' : t.role === 'feedback' ? 'Feedback' : 'Transcript'} (${t.source || 'manual'})`, '', t.text || '', '');
  return lines.join('\n');
}
module.exports={MODES,DEMO,cleanText,validMode,looksLikeQuestion,stats,markdownReview};
