import React, { useState, useEffect } from 'react';
import { vacancyAPI, hrAPI } from '../../services/api';
import { getAllDivisions } from '../../utils/hierarchy';
import Badge from '../../components/common/Badge';

export default function VacanciesView() {
  const [vacancies, setVacancies] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [filters, setFilters] = useState({ cycleId:'', group:'', division:'' });
  const [loading, setLoading] = useState(false);
  const divisions = getAllDivisions();

  useEffect(() => { hrAPI.getCycles().then(r => setCycles(r.data.cycles||[])); }, []);

  const load = () => {
    if (!filters.cycleId) return;
    setLoading(true);
    vacancyAPI.getAll(filters).then(r => setVacancies(r.data.vacancies||[])).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const totalVac    = vacancies.reduce((s,v) => s + v.totalVacancies, 0);
  const totalFilled = vacancies.reduce((s,v) => s + v.filledVacancies, 0);

  return (
    <div>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 4px' }}>Vacancy Pool</h1>
        <p style={{ color:'#888780', fontSize:'14px' }}>Consolidated vacancies submitted by all offices.</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
        <select value={filters.cycleId} onChange={e=>setFilters(f=>({...f,cycleId:e.target.value}))}
          style={{ padding:'8px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'13px', background:'#fff', minWidth:'220px' }}>
          <option value="">— Select cycle —</option>
          {cycles.map(c=><option key={c._id} value={c._id}>{c.name} ({c.financialYear})</option>)}
        </select>
        <select value={filters.group} onChange={e=>setFilters(f=>({...f,group:e.target.value}))}
          style={{ padding:'8px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'13px', background:'#fff' }}>
          <option value="">All Groups</option>
          <option value="C">Group C</option>
          <option value="D">Group D</option>
        </select>
        <select value={filters.division} onChange={e=>setFilters(f=>({...f,division:e.target.value}))}
          style={{ padding:'8px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'13px', background:'#fff', minWidth:'200px' }}>
          <option value="">All Divisions</option>
          {divisions.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      {filters.cycleId && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', marginBottom:'20px' }}>
          {[
            ['Total Vacancies', totalVac, '#534AB7'],
            ['Filled', totalFilled, '#3B6D11'],
            ['Available', totalVac - totalFilled, '#0F6E56']
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'16px 20px' }}>
              <p style={{ fontSize:'12px', color:'#888780', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{l}</p>
              <p style={{ fontSize:'26px', fontWeight:'700', color:c, margin:0 }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', overflow:'auto' }}>
        {!filters.cycleId ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888780' }}>Select a cycle to view vacancies.</div>
        ) : loading ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888780' }}>Loading...</div>
        ) : vacancies.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888780' }}>
            <p style={{ fontSize:'28px', marginBottom:'8px' }}>📋</p>
            <p style={{ fontWeight:'500' }}>No vacancies submitted yet</p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'700px' }}>
            <thead><tr style={{ background:'#f9f8f5' }}>
              {['Unit Type','Location','Post Designation','Group','Total','Filled','Available'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#888780', textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {vacancies.map((v,i) => (
                <tr key={v._id} style={{ borderTop:'1px solid #f1efe8', background:i%2===0?'#fff':'#fafaf8' }}>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ padding:'2px 8px', background:'#EEEDFE', color:'#3C3489', borderRadius:'4px', fontSize:'11px', fontWeight:'500', textTransform:'capitalize' }}>{v.unitType}</span>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:'13px', color:'#5F5E5A' }}>
                    <p style={{ margin:'0 0 2px', fontWeight:'500', color:'#2c2c2a', fontSize:'13px' }}>{v.section||v.subDivision||v.division}</p>
                    <p style={{ margin:0, fontSize:'11px', color:'#888780' }}>{[v.division,v.circle,v.zone].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:'13px', color:'#2c2c2a', fontWeight:'500' }}>{v.postDesignation}</td>
                  <td style={{ padding:'12px 14px' }}><Badge type={v.group} label={`Group ${v.group}`} /></td>
                  <td style={{ padding:'12px 14px', fontWeight:'600', color:'#2c2c2a' }}>{v.totalVacancies}</td>
                  <td style={{ padding:'12px 14px', color:'#3B6D11', fontWeight:'500' }}>{v.filledVacancies}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontWeight:'700', color: (v.totalVacancies-v.filledVacancies)>0?'#534AB7':'#A32D2D', fontSize:'15px' }}>
                      {v.totalVacancies - v.filledVacancies}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
