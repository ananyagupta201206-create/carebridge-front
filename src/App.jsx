import React, { useEffect, useMemo, useState } from 'react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8081/api').replace(/\/$/, '');
const blankPatient = { patientCode: '', fullName: '', age: '', ward: '', diagnosis: '', status: 'Stable' };
const blankHandover = { patientName: '', shift: 'Morning', summary: '', pendingTasks: '', priority: 'Normal', createdBy: '' };

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const body = await response.json(); message = body.message || body.error || message; } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export default function App() {
  const [tab, setTab] = useState('overview');
  const [patients, setPatients] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [patientForm, setPatientForm] = useState(blankPatient);
  const [handoverForm, setHandoverForm] = useState(blankHandover);
  const [editingPatient, setEditingPatient] = useState(null);
  const [editingHandover, setEditingHandover] = useState(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError('');
    try {
      const [p, h] = await Promise.all([request('/patients'), request('/handovers')]);
      setPatients(p); setHandovers(h);
    } catch (e) {
      setError(`${e.message}. Check that Spring Boot is running and MySQL credentials are configured.`);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const filteredPatients = useMemo(() => patients.filter(p => `${p.patientCode} ${p.fullName} ${p.ward || ''}`.toLowerCase().includes(query.toLowerCase())), [patients, query]);

  function flash(text) { setMessage(text); setTimeout(() => setMessage(''), 3000); }
  async function savePatient(e) {
    e.preventDefault(); setError('');
    try {
      const payload = { ...patientForm, age: patientForm.age === '' ? null : Number(patientForm.age) };
      if (editingPatient) await request(`/patients/${editingPatient}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await request('/patients', { method: 'POST', body: JSON.stringify(payload) });
      setPatientForm(blankPatient); setEditingPatient(null); await load(); flash('Patient record saved.');
    } catch (e) { setError(e.message); }
  }
  function editPatient(p) { setEditingPatient(p.id); setPatientForm({ patientCode:p.patientCode, fullName:p.fullName, age:p.age ?? '', ward:p.ward ?? '', diagnosis:p.diagnosis ?? '', status:p.status || 'Stable' }); setTab('patients'); window.scrollTo({top:0,behavior:'smooth'}); }
  async function deletePatient(id) {
    if (!window.confirm('Delete this patient record?')) return;
    try { await request(`/patients/${id}`, { method: 'DELETE' }); await load(); flash('Patient record deleted.'); }
    catch(e) { setError(e.message); }
  }
  async function saveHandover(e) {
    e.preventDefault(); setError('');
    try {
      if (editingHandover) await request(`/handovers/${editingHandover}`, { method: 'PUT', body: JSON.stringify(handoverForm) });
      else await request('/handovers', { method: 'POST', body: JSON.stringify(handoverForm) });
      setHandoverForm(blankHandover); setEditingHandover(null); await load(); flash('Handover saved.');
    } catch(e) { setError(e.message); }
  }
  function editHandover(h) { setEditingHandover(h.id); setHandoverForm({patientName:h.patientName,shift:h.shift,summary:h.summary,pendingTasks:h.pendingTasks || '',priority:h.priority || 'Normal',createdBy:h.createdBy || ''}); setTab('handovers'); window.scrollTo({top:0,behavior:'smooth'}); }
  async function deleteHandover(id) {
    if (!window.confirm('Delete this handover?')) return;
    try { await request(`/handovers/${id}`, { method: 'DELETE' }); await load(); flash('Handover deleted.'); }
    catch(e) { setError(e.message); }
  }

  const nav = [['overview','Overview'],['patients','Patients'],['handovers','Handovers']];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">CH</div><div><b>CareBridge</b><small>Clinical handover</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(([id,label]) => <button key={id} className={`nav-item ${tab===id?'active':''}`} onClick={()=>setTab(id)}><span>{id==='overview'?'◫':id==='patients'?'♡':'⇄'}</span>{label}</button>)}
      <div className="sidebar-note"><span className="pulse" /> Demo workspace <small>Use fictional patient data only</small></div>
      <div className="sidebar-footer">Digital Clinical Handover<br/>System · Academic project</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">CARE TEAM WORKSPACE</div><h1>{tab==='overview'?'Overview':tab==='patients'?'Patient directory':'Shift handovers'}</h1></div><button className="refresh" onClick={load}>↻ Refresh data</button></header>
      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error"><b>Connection / application issue:</b> {error}</div>}
      {loading && <div className="notice">Connecting to backend…</div>}

      {tab==='overview' && <>
        <section className="welcome"><div><div className="welcome-tag">CONNECTED CARE, CLEAR COMMUNICATION</div><h2>Every shift starts<br/>with a clearer picture.</h2><p>Keep patient records and clinical handovers organized in one workspace.</p><button className="primary" onClick={()=>setTab('handovers')}>Create a handover <span>→</span></button></div><div className="welcome-art"><div className="art-circle circle-one"></div><div className="art-circle circle-two"></div><div className="clipboard"><div className="clip-top"></div><div className="clip-line long"></div><div className="clip-line"></div><div className="clip-line short"></div><div className="clip-check">✓</div></div><div className="floating-card"><span>✓</span><div><b>Shift ready</b><small>Information in one place</small></div></div></div></section>
        <section className="stat-grid">
          <div className="stat-card"><div className="stat-icon teal">♡</div><span>Total patients</span><strong>{patients.length}</strong><small>Patient records in system</small></div>
          <div className="stat-card"><div className="stat-icon violet">⇄</div><span>Handover records</span><strong>{handovers.length}</strong><small>Shift notes recorded</small></div>
          <div className="stat-card"><div className="stat-icon amber">!</div><span>High priority</span><strong>{handovers.filter(h=>h.priority==='High').length}</strong><small>Handover items flagged high</small></div>
        </section>
        <section className="panel"><div className="panel-head"><div><h3>Recent handovers</h3><p>Latest updates from the care team</p></div><button className="text-button" onClick={()=>setTab('handovers')}>View all →</button></div>
          {handovers.length===0?<div className="empty"><div>⇄</div><b>No handovers yet</b><p>Create the first handover to see it here.</p><button className="primary" onClick={()=>setTab('handovers')}>Create handover</button></div>:<div className="table-wrap"><table><thead><tr><th>Patient</th><th>Shift</th><th>Summary</th><th>Priority</th></tr></thead><tbody>{[...handovers].slice(-5).reverse().map(h=><tr key={h.id}><td><b>{h.patientName}</b></td><td>{h.shift}</td><td>{h.summary}</td><td><span className={`priority ${h.priority==='High'?'high':''}`}>{h.priority}</span></td></tr>)}</tbody></table></div>}
        </section>
      </>}

      {tab==='patients' && <div className="content-grid">
        <section className="panel form-panel"><div className="panel-head"><div><h3>{editingPatient?'Update patient':'Add a patient'}</h3><p>Enter the required patient details</p></div></div>
          <form onSubmit={savePatient} className="form">
            <label>Patient ID / Code *<input required value={patientForm.patientCode} onChange={e=>setPatientForm({...patientForm,patientCode:e.target.value})} placeholder="e.g. PT-1001"/></label>
            <label>Full name *<input required value={patientForm.fullName} onChange={e=>setPatientForm({...patientForm,fullName:e.target.value})} placeholder="Patient full name"/></label>
            <div className="two-fields"><label>Age<input type="number" min="0" max="130" value={patientForm.age} onChange={e=>setPatientForm({...patientForm,age:e.target.value})} placeholder="Age"/></label><label>Ward<input value={patientForm.ward} onChange={e=>setPatientForm({...patientForm,ward:e.target.value})} placeholder="e.g. Ward A"/></label></div>
            <label>Diagnosis / Notes<input value={patientForm.diagnosis} onChange={e=>setPatientForm({...patientForm,diagnosis:e.target.value})} placeholder="Brief note"/></label>
            <label>Status<select value={patientForm.status} onChange={e=>setPatientForm({...patientForm,status:e.target.value})}><option>Stable</option><option>Observation</option><option>Needs review</option></select></label>
            <button className="primary full" type="submit">{editingPatient?'Save changes':'Add patient'}</button>
            {editingPatient && <button className="secondary full" type="button" onClick={()=>{setEditingPatient(null);setPatientForm(blankPatient)}}>Cancel edit</button>}
          </form>
        </section>
        <section className="panel"><div className="panel-head"><div><h3>Patient directory</h3><p>{patients.length} record(s)</p></div></div>
          <input className="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name, ID or ward…"/>
          {filteredPatients.length===0?<div className="empty"><div>♡</div><b>No patient records</b><p>Add a patient using the form.</p></div>:<div className="table-wrap"><table><thead><tr><th>Patient</th><th>Ward</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredPatients.map(p=><tr key={p.id}><td><b>{p.fullName}</b><small className="sub-cell">{p.patientCode} · {p.age ?? 'Age n/a'}</small></td><td>{p.ward || '—'}</td><td><span className="status">{p.status}</span></td><td><div className="actions"><button onClick={()=>editPatient(p)}>Edit</button><button className="delete" onClick={()=>deletePatient(p.id)}>Delete</button></div></td></tr>)}</tbody></table></div>}
        </section>
      </div>}

      {tab==='handovers' && <div className="content-grid handover-grid">
        <section className="panel form-panel"><div className="panel-head"><div><h3>{editingHandover?'Update handover':'New handover'}</h3><p>Capture key details for the next shift</p></div></div>
          <form onSubmit={saveHandover} className="form">
            <label>Patient name *<input required value={handoverForm.patientName} onChange={e=>setHandoverForm({...handoverForm,patientName:e.target.value})} placeholder="Patient name or demo ID"/></label>
            <label>Shift<select value={handoverForm.shift} onChange={e=>setHandoverForm({...handoverForm,shift:e.target.value})}><option>Morning</option><option>Afternoon</option><option>Night</option></select></label>
            <label>Clinical summary *<textarea required rows="3" value={handoverForm.summary} onChange={e=>setHandoverForm({...handoverForm,summary:e.target.value})} placeholder="Relevant summary for the next shift"/></label>
            <label>Pending tasks<textarea rows="2" value={handoverForm.pendingTasks} onChange={e=>setHandoverForm({...handoverForm,pendingTasks:e.target.value})} placeholder="Tasks to follow up"/></label>
            <div className="two-fields"><label>Priority<select value={handoverForm.priority} onChange={e=>setHandoverForm({...handoverForm,priority:e.target.value})}><option>Normal</option><option>High</option><option>Low</option></select></label><label>Created by<input value={handoverForm.createdBy} onChange={e=>setHandoverForm({...handoverForm,createdBy:e.target.value})} placeholder="Staff name"/></label></div>
            <button className="primary full" type="submit">{editingHandover?'Save changes':'Save handover'}</button>
            {editingHandover && <button className="secondary full" type="button" onClick={()=>{setEditingHandover(null);setHandoverForm(blankHandover)}}>Cancel edit</button>}
          </form>
        </section>
        <section className="panel"><div className="panel-head"><div><h3>Handover history</h3><p>{handovers.length} record(s)</p></div></div>
          {handovers.length===0?<div className="empty"><div>⇄</div><b>No handovers recorded</b><p>New handovers will appear here.</p></div>:<div className="handover-list">{[...handovers].reverse().map(h=><article className="handover-card" key={h.id}><div className="handover-card-top"><div><span className="shift-pill">{h.shift}</span><h4>{h.patientName}</h4></div><span className={`priority ${h.priority==='High'?'high':''}`}>{h.priority}</span></div><p>{h.summary}</p>{h.pendingTasks&&<div className="task-note"><b>Pending:</b> {h.pendingTasks}</div>}<div className="handover-meta"><span>{h.createdBy || 'Staff not specified'}</span><div className="actions"><button onClick={()=>editHandover(h)}>Edit</button><button className="delete" onClick={()=>deleteHandover(h.id)}>Delete</button></div></div></article>)}</div>}
        </section>
      </div>}
      <footer className="footer">CareBridge · Academic demonstration · Not for real clinical decisions</footer>
    </main>
  </div>;
}
