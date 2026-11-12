import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Room = { id: string; unit_code: string; unit_name: string; category: string; building: string; room_number: string; display_order: number }
type Booking = { id: string; reservation_code: string; guest_name: string; unit_id: string; check_in: string; check_out: string; status: string; adults: number; children: number }
type Block = { id: string; unit_id: string; check_in: string; check_out: string; block_type: string; reason: string | null; active: boolean }
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth()+n, 1)
const formatDay = (d: Date) => d.toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'})

export function Reservations() {
  const [rooms,setRooms] = useState<Room[]>([])
  const [bookings,setBookings] = useState<Booking[]>([])
  const [blocks,setBlocks] = useState<Block[]>([])
  const [month,setMonth] = useState(monthStart(new Date()))
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [showForm,setShowForm] = useState(false)
  const [guest,setGuest] = useState('')
  const [phone,setPhone] = useState('')
  const [roomId,setRoomId] = useState('')
  const [checkIn,setCheckIn] = useState(dateKey(new Date()))
  const [checkOut,setCheckOut] = useState(dateKey(new Date(Date.now()+86400000)))
  const [adults,setAdults] = useState(2)
  const [children,setChildren] = useState(0)
  const [source,setSource] = useState('Direct')
  const [status,setStatus] = useState('hold')
  const [saving,setSaving] = useState(false)
  const [showMaintenance,setShowMaintenance] = useState(false)
  const [maintenanceRoom,setMaintenanceRoom] = useState('')
  const [maintenanceStart,setMaintenanceStart] = useState(dateKey(new Date()))
  const [maintenanceEnd,setMaintenanceEnd] = useState(dateKey(new Date(Date.now()+86400000)))
  const [maintenanceReason,setMaintenanceReason] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError('')
    const start = dateKey(monthStart(month)); const end = dateKey(addMonths(month,1))
    const [roomRes,bookingRes,blockRes] = await Promise.all([
      supabase.from('resort_units').select('id,unit_code,unit_name,category,building,room_number,display_order').eq('active',true).order('display_order'),
      supabase.from('reservations').select('id,reservation_code,guest_name,unit_id,check_in,check_out,status,adults,children').lt('check_in',end).gt('check_out',start).neq('status','cancelled'),
      supabase.from('room_blocks').select('id,unit_id,check_in,check_out,block_type,reason,active').eq('active',true).lt('check_in',end).gt('check_out',start)
    ])
    if (roomRes.error) setError(roomRes.error.message)
    else { setRooms((roomRes.data ?? []) as Room[]); if (!roomId && roomRes.data?.[0]) setRoomId(roomRes.data[0].id) }
    if (bookingRes.error) setError(bookingRes.error.message)
    else setBookings((bookingRes.data ?? []) as Booking[])
    if (blockRes.error && !bookingRes.error) setError(blockRes.error.message)
    else setBlocks((blockRes.data ?? []) as Block[])
    setLoading(false)
  },[month,roomId])
  useEffect(()=>{ void load() },[load])

  const days = useMemo(()=>{ const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate(); return Array.from({length:count},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i+1)) },[month])
  const cellFor = (room:Room,day:Date) => {
    const key=dateKey(day)
    const booking=bookings.find(b=>b.unit_id===room.id && b.check_in<=key && b.check_out>key)
    if (booking) return {label:booking.guest_name,sub:booking.reservation_code,kind:booking.status==='hold'?'hold':'booked',booking}
    const block=blocks.find(b=>b.unit_id===room.id && b.check_in<=key && b.check_out>key && b.block_type==='maintenance')
    if (block) return {label:'Maintenance',sub:block.reason||'Blocked',kind:'maintenance' as const,booking:null}
    return null
  }
  const monthLabel=month.toLocaleDateString('en-IN',{month:'long',year:'numeric'})
  const submitBooking=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!supabase)return
    setSaving(true);setError('');setNotice('')
    const {error}=await supabase.rpc('create_reservation',{p_guest_name:guest,p_guest_phone:phone||null,p_guest_email:null,p_unit_id:roomId,p_check_in:checkIn,p_check_out:checkOut,p_adults:adults,p_children:children,p_booking_source:source,p_status:status,p_special_requests:null})
    if(error)setError(error.message)
    else {setNotice('Reservation created successfully.');setShowForm(false);setGuest('');setPhone('');await load()}
    setSaving(false)
  }
  const submitMaintenance=async(e:React.FormEvent)=>{
    e.preventDefault();if(!supabase)return
    const selectedRoom = maintenanceRoom || rooms[0]?.id
    if (!selectedRoom) { setError('No active rooms are available.'); return }
    setSaving(true);setError('');setNotice('')
    const {error}=await supabase.rpc('create_maintenance_block',{p_unit_id:selectedRoom,p_check_in:maintenanceStart,p_check_out:maintenanceEnd,p_reason:maintenanceReason})
    if(error)setError(error.message)
    else {setNotice('Maintenance block created.');setShowMaintenance(false);setMaintenanceReason('');await load()}
    setSaving(false)
  }
  const cancelBooking=async(id:string)=>{
    if(!supabase || !window.confirm('Cancel this reservation and release the room dates?'))return
    const {error}=await supabase.rpc('cancel_reservation',{p_reservation_id:id})
    if(error)setError(error.message);else{setNotice('Reservation cancelled and room released.');await load()}
  }
  return <section className="module calendar-module">
    <div className="eyebrow">MIHRA MIST · FRONT OFFICE</div><h1>Reservations & room calendar</h1>
    <p className="intro">One live calendar for all 17 physical rooms. Check-out dates are available for the next guest.</p>
    <div className="calendar-toolbar"><div className="month-switch"><button className="soft" onClick={()=>setMonth(addMonths(month,-1))}>‹</button><strong>{monthLabel}</strong><button className="soft" onClick={()=>setMonth(addMonths(month,1))}>›</button><button className="soft today" onClick={()=>setMonth(monthStart(new Date()))}>Today</button></div><div className="actions"><button className="soft" onClick={()=>setShowMaintenance(true)}>＋ Maintenance</button><button className="primary compact" onClick={()=>setShowForm(true)}>＋ New reservation</button></div></div>
    <div className="legend"><span><i className="dot confirmed"/> Confirmed / in-house</span><span><i className="dot tentative"/> Tentative hold</span><span><i className="dot maintenance-dot"/> Maintenance</span></div>
    {error&&<div className="alert errorbox">{error}{error.toLowerCase().includes('active staff')||error.toLowerCase().includes('permission')?' — an active employee profile must be provisioned for this login.':''}</div>}
    {notice&&<div className="alert successbox">{notice}</div>}
    {loading&&<div className="muted">Loading room calendar…</div>}
    <div className="calendar-scroll"><table className="calendar-table"><thead><tr><th className="date-head">Date</th>{rooms.map(r=><th key={r.id}><span>{r.building}</span><b>{r.room_number}</b><small>{r.unit_name} · {r.category}</small></th>)}</tr></thead><tbody>{days.map(day=><tr key={dateKey(day)}><th className="date-cell"><b>{formatDay(day)}</b><small>{day.toLocaleDateString('en-IN',{weekday:'long'})}</small></th>{rooms.map(room=>{const cell=cellFor(room,day);return <td key={room.id} className={cell?`cell-${cell.kind}`:''}>{cell?<button className="booking-chip" title={`${cell.label} · ${cell.sub}`} onClick={()=>cell.booking?cancelBooking(cell.booking.id):undefined}><b>{cell.label}</b><small>{cell.sub}</small></button>:<span className="free-dot">·</span>}</td>})}</tr>)}</tbody></table></div>
    <div className="calendar-foot"><span>{rooms.length} rooms · {days.length} dates · {bookings.length} reservations in this month view</span><button className="text-button" onClick={()=>void load()}>↻ Refresh</button></div>
    {showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><form className="modal" onSubmit={submitBooking} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">NEW BOOKING</span><h2>Create reservation</h2></div><button type="button" className="close" onClick={()=>setShowForm(false)}>×</button></div><label>Guest name<input value={guest} onChange={e=>setGuest(e.target.value)} required /></label><label>Phone number<input value={phone} onChange={e=>setPhone(e.target.value)} /></label><label>Room<select value={roomId} onChange={e=>setRoomId(e.target.value)}>{rooms.map(r=><option key={r.id} value={r.id}>{r.unit_name} · {r.category}</option>)}</select></label><div className="form-row"><label>Check-in<input type="date" value={checkIn} onChange={e=>setCheckIn(e.target.value)} required /></label><label>Check-out<input type="date" value={checkOut} min={checkIn} onChange={e=>setCheckOut(e.target.value)} required /></label></div><div className="form-row"><label>Adults<input type="number" min="1" value={adults} onChange={e=>setAdults(Number(e.target.value))}/></label><label>Children<input type="number" min="0" value={children} onChange={e=>setChildren(Number(e.target.value))}/></label></div><div className="form-row"><label>Booking source<select value={source} onChange={e=>setSource(e.target.value)}>{['Direct','Website','Phone','WhatsApp','Booking.com','Airbnb','Travel Agent','Other'].map(s=><option key={s}>{s}</option>)}</select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="hold">Tentative hold</option><option value="confirmed">Confirmed</option></select></label></div><p className="hint">Availability is validated by the database when you save. Overlapping bookings are rejected automatically.</p><button className="primary" disabled={saving}>{saving?'Saving…':'Save reservation'}</button></form></div>}
    {showMaintenance&&<div className="modal-backdrop" onClick={()=>setShowMaintenance(false)}><form className="modal" onSubmit={submitMaintenance} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ROOM OPERATIONS</span><h2>Block room for maintenance</h2></div><button type="button" className="close" onClick={()=>setShowMaintenance(false)}>×</button></div><label>Room<select value={maintenanceRoom||rooms[0]?.id||''} onChange={e=>setMaintenanceRoom(e.target.value)}>{rooms.map(r=><option key={r.id} value={r.id}>{r.unit_name}</option>)}</select></label><div className="form-row"><label>Start date<input type="date" value={maintenanceStart} onChange={e=>setMaintenanceStart(e.target.value)} required /></label><label>End date<input type="date" value={maintenanceEnd} min={maintenanceStart} onChange={e=>setMaintenanceEnd(e.target.value)} required /></label></div><label>Reason<input value={maintenanceReason} onChange={e=>setMaintenanceReason(e.target.value)} placeholder="Repairs, deep cleaning, etc." required /></label><button className="primary" disabled={saving}>{saving?'Saving…':'Create maintenance block'}</button></form></div>}
  </section>
}
