import React from 'react';
const styles = {
  submitted:       { bg:'#E6F1FB', color:'#0C447C' },
  under_review:    { bg:'#FAEEDA', color:'#633806' },
  merit_generated: { bg:'#EEEDFE', color:'#3C3489' },
  approved:        { bg:'#EAF3DE', color:'#27500A' },
  waitlisted:      { bg:'#FAEEDA', color:'#633806' },
  rejected:        { bg:'#FCEBEB', color:'#791F1F' },
  C:               { bg:'#EEEDFE', color:'#3C3489' },
  D:               { bg:'#E6F1FB', color:'#0C447C' },
  draft:           { bg:'#F1EFE8', color:'#5F5E5A' },
  open:            { bg:'#EAF3DE', color:'#27500A' },
  closed:          { bg:'#FCEBEB', color:'#791F1F' },
  default:         { bg:'#F1EFE8', color:'#5F5E5A' }
};
export default function Badge({ label, type }) {
  const s = styles[type] || styles.default;
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'500', background:s.bg, color:s.color }}>
      {label || type}
    </span>
  );
}
