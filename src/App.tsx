import { useState } from 'react'
import { LogOut, Menu, Mountain, ChevronRight } from 'lucide-react'
import { AuthGate } from './components/AuthGate'
import { modules, type ModuleId } from './lib/modules'
import { ModuleView } from './modules/ModuleView'
import { supabase } from './lib/supabase'

function Workspace() {
  const [active,setActive] = useState<ModuleId>('dashboard')
  const [open,setOpen] = useState(false)
  const current = modules.find(m=>m.id===active)!
  return <div className="app"><aside className={open?'sidebar open':'sidebar'}><div className="brand"><div className="brandmark"><Mountain size={22}/></div><div><b>Mihra Mist</b><small>ERP 2.0 · WAYANAD</small></div></div><div className="navlabel">WORKSPACE</div>{modules.map(m=><button key={m.id} className={active===m.id?'nav active':'nav'} onClick={()=>{setActive(m.id);setOpen(false)}}><span>{m.label}</span><ChevronRight size={15}/></button>)}<div className="sidefoot">CLOUD-FIRST OPERATIONS<br/>Build 2.0 foundation</div></aside><main className="main"><header className="topbar"><button className="menubtn" onClick={()=>setOpen(!open)}><Menu/></button><div><span className="crumb">Workspace</span><b>{current.label}</b></div><button className="logout" onClick={()=>supabase?.auth.signOut()}><LogOut size={16}/> Sign out</button></header><ModuleView id={active}/></main></div>
}
export default function App(){return <AuthGate><Workspace/></AuthGate>}