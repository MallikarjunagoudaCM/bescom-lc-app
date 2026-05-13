import React from 'react';
import Navbar from './Navbar';
import { Toaster } from 'react-hot-toast';

export default function Layout({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f0' }}>
      <Navbar />
      <main style={{ maxWidth:'1200px', margin:'0 auto', padding:'28px 20px' }}>
        {children}
      </main>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius:'10px', fontSize:'14px' } }} />
    </div>
  );
}
