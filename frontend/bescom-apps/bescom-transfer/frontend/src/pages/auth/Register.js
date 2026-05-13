import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  getZones, getCircles, getDivisions, getSubDivisions, getSections
} from '../../utils/hierarchy';

const DESIGNATIONS_C = ['Junior Engineer','Assistant Engineer','Senior Assistant Engineer','Executive Engineer'];
const DESIGNATIONS_D = ['Junior Lineman','Lineman','Senior Lineman','Meter Reader','Helper'];

const inp = {
  width:'100%', padding:'10px 12px', border:'1.5px solid #D3D1C7',
  borderRadius:'8px', fontSize:'14px', outline:'none',
  boxSizing:'border-box', color:'#2c2c2a', background:'#fff',
};
const lbl = {
  display:'block', fontSize:'13px', fontWeight:'500',
  color:'#5F5E5A', marginBottom:'5px',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    employeeId:'', name:'', email:'', phone:'',
    password:'', confirmPassword:'',
    dateOfBirth:'', joiningDate:'',
    designation:'', group:'C',
    zone:'', circle:'', division:'', subDivision:'', section:'', postingSince:''
  });

  // useCallback keeps this reference stable across renders
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  // Cascade helpers — also stable
  const handleGroupChange = useCallback((e) => {
    setForm(prev => ({ ...prev, group: e.target.value, designation: '' }));
  }, []);
  const handleZone = useCallback((e) => {
    setForm(prev => ({ ...prev, zone: e.target.value, circle:'', division:'', subDivision:'', section:'' }));
  }, []);
  const handleCircle = useCallback((e) => {
    setForm(prev => ({ ...prev, circle: e.target.value, division:'', subDivision:'', section:'' }));
  }, []);
  const handleDivision = useCallback((e) => {
    setForm(prev => ({ ...prev, division: e.target.value, subDivision:'', section:'' }));
  }, []);
  const handleSubDiv = useCallback((e) => {
    setForm(prev => ({ ...prev, subDivision: e.target.value, section:'' }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register({
        employeeId: form.employeeId,
        username: form.employeeId.toLowerCase(),   // login username = lowercase employeeId
        name: form.name, email: form.email,
        phone: form.phone, password: form.password,
        dateOfBirth: form.dateOfBirth, joiningDate: form.joiningDate,
        designation: form.designation, group: form.group,
        currentPosting: {
          zone: form.zone, circle: form.circle, division: form.division,
          subDivision: form.subDivision, section: form.section,
          postingSince: form.postingSince,
        }
      });
      toast.success('Registration successful! Welcome.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const F = ({ label, name, type, required }) => (
    <div style={{ marginBottom:'14px' }}>
      <label style={lbl}>{label}{required && <span style={{ color:'#A32D2D' }}> *</span>}</label>
      <input
        type={type || 'text'}
        name={name}
        value={form[name]}
        onChange={handleChange}
        required={required}
        style={inp}
      />
    </div>
  );

  const S = ({ label, name, options, required, onChange: customOnChange }) => (
    <div style={{ marginBottom:'14px' }}>
      <label style={lbl}>{label}{required && <span style={{ color:'#A32D2D' }}> *</span>}</label>
      <select
        name={name}
        value={form[name]}
        onChange={customOnChange || handleChange}
        required={required}
        style={{ ...inp, background:'#fff' }}
      >
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#534AB7 0%,#3C3489 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#fff', borderRadius:'16px', padding:'36px', width:'100%', maxWidth:'540px', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>

        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 4px' }}>Employee Registration</h1>
          <p style={{ fontSize:'13px', color:'#888780', marginTop:'4px' }}>
            Step {step} of 2 — {step === 1 ? 'Personal Details' : 'Current Posting'}
          </p>
          <div style={{ display:'flex', gap:'6px', marginTop:'12px', justifyContent:'center' }}>
            {[1,2].map(s => (
              <div key={s} style={{ height:'4px', width:'60px', borderRadius:'2px', background: s<=step ? '#534AB7' : '#D3D1C7', transition:'background 0.2s' }} />
            ))}
          </div>
        </div>

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit}>
          {step === 1 && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
                <F label="Employee ID"            name="employeeId"    required />
                <F label="Full Name"              name="name"          required />
                <F label="Email Address"          name="email"  type="email"  required />
                <F label="Phone Number"           name="phone"  type="tel"    required />
                <F label="Date of Birth"          name="dateOfBirth" type="date" required />
                <F label="Date of Joining BESCOM" name="joiningDate" type="date" required />
              </div>
              <S label="Employee Group" name="group" required options={['C','D']} onChange={handleGroupChange} />
              <S label="Designation"   name="designation" required
                options={form.group === 'C' ? DESIGNATIONS_C : DESIGNATIONS_D} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
                <F label="Password"         name="password"        type="password" required />
                <F label="Confirm Password" name="confirmPassword"  type="password" required />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ background:'#E6F1FB', borderRadius:'8px', padding:'10px 14px', marginBottom:'16px', fontSize:'13px', color:'#0C447C' }}>
                Select your <strong>current posting</strong> location from the hierarchy below.
              </div>
              <S label="Zone"         name="zone"        required options={getZones()}                                                     onChange={handleZone} />
              <S label="Circle"       name="circle"      required options={getCircles(form.zone)}                                          onChange={handleCircle} />
              <S label="Division"     name="division"    required options={getDivisions(form.zone, form.circle)}                           onChange={handleDivision} />
              <S label="Sub-Division" name="subDivision"          options={getSubDivisions(form.zone, form.circle, form.division)}         onChange={handleSubDiv} />
              <S label="Section"      name="section"              options={getSections(form.zone, form.circle, form.division, form.subDivision)} />
              <F label="Posting Since" name="postingSince" type="date" required />
            </>
          )}

          <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)}
                style={{ flex:1, padding:'11px', border:'1.5px solid #534AB7', borderRadius:'8px', color:'#534AB7', background:'#fff', fontSize:'14px', fontWeight:'500', cursor:'pointer' }}>
                ← Back
              </button>
            )}
            <button type="submit" disabled={loading}
              style={{ flex:2, padding:'11px', background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'600', cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
              {step === 1 ? 'Next →' : (loading ? 'Registering...' : 'Complete Registration')}
            </button>
          </div>
        </form>

        <p style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:'#5F5E5A' }}>
          Already registered? <Link to="/login" style={{ color:'#534AB7', fontWeight:'500' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
