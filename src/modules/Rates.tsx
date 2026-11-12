import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Category = { id:string; category_name:string; sort_order:number }
type Rule = { id:string; rate_category_id:string; rule_name:string; rule_type:'weekday'|'weekend'|'peak_season'|'festival'; amount:number; start_date:string|null; end_date:string|null; priority:number; active:boolean; notes:string|null; created_at:string }
const money=(n:number)=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})
const types:Rule['rule_type'][]=['weekday','weekend','peak_season','festival']
const priority:Record<Rule['rule_type'],number>={weekday:100,weekend:200,peak_season:300,festival:400}
const label=(s:string)=>s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export function Rates(){
 const [categories,setCategories]=useState<Category[]>([])
 const [rules,setRules]=useState<Rule[]>([])
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [category,setCategory]=useState(''),[type,setType]=useState<Rule['rule_type']>('weekday'),[name,setName]=useState(''),[amount,setAmount]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[notes,setNotes]=useState('')
 const [filter,setFilter]=useState('all')
 const load=useCallback(async()=>{
  if(!supabase)return
  setLoading(true);setError('')
  const [c,r]=await Promise.all([
   supabase.from('resort_rate_categories').select('id,category_name,sort_order').eq('active',true).order('sort_order'),
   supabase.from('rate_rules').select('*').order('priority',{ascending:false}).order('start_date',{ascending:true}).order('created_at',{ascending:false})
  ])
  if(c.error)setError(c.error.message);else{setCategories((c.data||[]) as Category[]);if(!category&&c.data?.length)setCategory(c.data[0].id)}
  if(r.error)setError(r.error.message);else setRules((r.data||[]) as Rule[])
  setLoading(false)
 },[])
 useEffect(()=>{void load()},[load])
 const reset=()=>{setName('');setAmount('');setStart('');setEnd('');setNotes('')}
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(!supabase)return
  setSaving(true);setError('');setNotice('')
  const user=(await supabase.auth.getUser()).data.user
  if(!user){setError('Please sign in again.');setSaving(false);return}
  const payload={rate_category_id:category,rule_name:name.trim()||label(type),rule_type:type,amount:Number(amount),start_date:type==='peak_season'||type==='festival'?start:null,end_date:type==='peak_season'||type==='festival'?end:null,priority:priority[type],notes:notes.trim()||null,created_by:user.id,updated_by:user.id}
  const result=await supabase.from('rate_rules').insert(payload)
  if(result.error)setError(result.error.message)
  else{setNotice('Rate rule saved.');reset();await load()}
  setSaving(false)
 }
 const toggle=async(rule:Rule)=>{
  if(!supabase)return
  const user=(await supabase.auth.getUser()).data.user
  const result=await supabase.from('rate_rules').update({active:!rule.active,updated_by:user?.id}).eq('id',rule.id)
  if(result.error)setError(result.error.message);else{setNotice(rule.active?'Rate rule deactivated.':'Rate rule activated.');await load()}
 }
 const shown=rules.filter(r=>(filter==='all'||r.rule_type===filter))
 const categoryName=(id:string)=>categories.find(c=>c.id===id)?.category_name||'Unknown category'
 return <section className="module rates-module">
  <div className="eyebrow">MIHRA MIST · REVENUE MANAGEMENT</div><h1>Rate Management</h1>
  <p className="intro">Configure category-wise weekday, weekend, peak-season and festival rates. The quote engine will use the most specific active rule for each night.</p>
  <div className="crm-summary"><div><small>Rate categories</small><b>{categories.length}</b></div><div><small>Active rules</small><b>{rules.filter(r=>r.active).length}</b></div><div><small>Festival rules</small><b>{rules.filter(r=>r.active&&r.rule_type==='festival').length}</b></div><div><small>Peak-season rules</small><b>{rules.filter(r=>r.active&&r.rule_type==='peak_season').length}</b></div></div>
  {error&&<div className="alert errorbox">{error}</div>}{notice&&<div className="alert successbox">{notice}</div>}
  <div className="rates-layout">
   <form className="panel rates-form" onSubmit={save}>
    <h2>Add rate rule</h2>
    <label>Room category<select required value={category} onChange={e=>setCategory(e.target.value)}><option value="">Select category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.category_name}</option>)}</select></label>
    <label>Rate type<select value={type} onChange={e=>setType(e.target.value as Rule['rule_type'])}>{types.map(t=><option key={t} value={t}>{label(t)}</option>)}</select></label>
    <label>Rule name<input value={name} onChange={e=>setName(e.target.value)} placeholder={type==='festival'?'New Year Eve':type==='peak_season'?'Christmas / New Year':'Optional label'}/></label>
    <label>Rate per room / night (₹)<input type="number" min="0" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter approved rate"/></label>
    {(type==='peak_season'||type==='festival')&&<div className="form-row"><label>Start date<input type="date" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>End date<input type="date" min={start} required value={end} onChange={e=>setEnd(e.target.value)}/></label></div>}
    <label>Notes (optional)<textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Conditions or approval reference"/></label>
    <button className="primary" disabled={saving||!category||!amount||Number(amount)<0||((type==='peak_season'||type==='festival')&&(!start||!end||end<start))}>{saving?'Saving…':'Save rate rule'}</button>
    <p className="rates-help">Priority is automatic: Festival → Peak season → Weekend → Weekday. If no active rule matches a date, the quote engine will flag the rate as missing rather than guess.</p>
   </form>
   <div className="rates-list">
    <div className="rates-list-head"><h2>Configured rates</h2><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All rule types</option>{types.map(t=><option key={t} value={t}>{label(t)}</option>)}</select></div>
    {loading?<p className="muted">Loading rate rules…</p>:shown.length===0?<div className="crm-empty">No rate rules configured yet. Add approved weekday and weekend rates for each category, then add peak and festival overrides.</div>:<div className="rates-table-wrap"><table className="crm-table"><thead><tr><th>Category / Rule</th><th>Type</th><th>Period</th><th>Rate</th><th>Status</th><th></th></tr></thead><tbody>{shown.map(r=><tr key={r.id}><td><b>{categoryName(r.rate_category_id)}</b><small>{r.rule_name}</small></td><td>{label(r.rule_type)}</td><td>{r.start_date? r.start_date+' → '+r.end_date:'Recurring'}</td><td><b>{money(r.amount)}</b></td><td><span className={'crm-status '+(r.active?'status-won':'status-lost')}>{r.active?'Active':'Inactive'}</span></td><td><button className="text-button" onClick={()=>void toggle(r)}>{r.active?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table></div>}
   </div>
  </div>
  <div className="notice"><b>Pricing safeguards</b><p>These are configuration rules only; no rates have been assumed or pre-filled. Festival dates override peak-season dates, peak-season overrides weekend and weekday rates. The same rate category is used to map the relevant physical rooms. Existing reservations and the live ERP are not changed.</p></div>
 </section>
}
