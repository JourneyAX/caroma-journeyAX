"use client";

import React, { useState } from 'react';
import { 
  BarChart3, 
  Settings, 
  Users, 
  Database, 
  MessageSquare, 
  Compass, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  UserCheck, 
  Plus, 
  Upload, 
  RefreshCw
} from 'lucide-react';
import { calculateTotals } from '@journeyax/configurator-core';

// Mock Data
const initialConversations = [
  {
    id: "CONV-4902",
    tenantId: "caroma",
    brand: "Caroma",
    title: "Bathroom Renovation Plan",
    status: "New",
    user: "Mahaveer",
    email: "mahaveer@journeyax.com",
    createdAt: "2026-07-05 11:20",
    transcript: [
      { sender: "ai", text: "Hi! I'm your Caroma assistant. What are you looking to design today?" },
      { sender: "user", text: "I am building a premium bathroom and need a matching tap and toilet." },
      { sender: "ai", text: "Great! I recommend the Liano II Sink Mixer in Matte Black, paired with the Urbane II Toilet Suite." },
      { sender: "user", text: "Can you add both in Matte Black to my quote?" }
    ],
    bom: [
      { sku: "96379C56AF", name: "Liano II Sink Mixer - Matte Black", price: 515.00, quantity: 1, category: "Tapware", isRequired: true },
      { sku: "99671C56AF", name: "Urbane II Toilet Suite - Matte Black", price: 1045.00, quantity: 1, category: "Toilet Suites", isRequired: true }
    ],
    installationSummary: "Wall mixer requires pre-tiling inwall body installation. Toilet suite is back-to-wall design.",
    notes: ""
  },
  {
    id: "CONV-4899",
    tenantId: "qzero",
    brand: "Q-Zero",
    title: "Executive Office Setup",
    status: "Assigned",
    user: "Sarah Jenkins",
    email: "sjenkins@officecore.com",
    createdAt: "2026-07-05 09:15",
    transcript: [
      { sender: "ai", text: "Welcome to Q-Zero. How can I optimize your office configuration?" },
      { sender: "user", text: "I need an ergonomic standing desk and an orthopaedic task chair." },
      { sender: "ai", text: "I've matched you to our Series-9 Electric Standing Desk and the Ergoflex Pro Task Chair." }
    ],
    bom: [
      { sku: "DSK-S9-WHT", name: "Q-Zero Series-9 Standing Desk", price: 1250.00, quantity: 1, category: "Desks", isRequired: true },
      { sku: "CHR-EF-BLK", name: "Ergoflex Pro Mesh Task Chair", price: 680.00, quantity: 1, category: "Chairs", isRequired: true }
    ],
    installationSummary: "Electric desk assembly required. Includes 5-year electronics warranty.",
    notes: "Follow up regarding custom wood finishes."
  },
  {
    id: "CONV-4890",
    tenantId: "rentacenter",
    brand: "Rent-A-Center",
    title: "Premium Lounge Package",
    status: "Abandoned",
    user: "Robert Miller",
    email: "rmiller@yahoo.com",
    createdAt: "2026-07-04 15:30",
    transcript: [
      { sender: "ai", text: "Hi Robert! Let's build your home entertainment lease package. What size room is this for?" },
      { sender: "user", text: "A medium sized living room, looking for a smart TV and soundbar." }
    ],
    bom: [
      { sku: "TV-OLED-65", name: "65-inch 4K OLED Smart TV", price: 2199.00, quantity: 1, category: "TVs", isRequired: true }
    ],
    installationSummary: "Wall-mount hardware not included by default.",
    notes: "User disconnected during soundbar recommendations."
  }
];

const mockCatalog = [
  { sku: "96379C56AF", name: "Liano II Sink Mixer", brand: "Caroma", category: "Tapware", price: 515.00, status: "Live" },
  { sku: "99671C56AF", name: "Urbane II Toilet Suite", brand: "Caroma", category: "Toilet Suites", price: 1045.00, status: "Live" },
  { sku: "DSK-S9-WHT", name: "Series-9 Standing Desk", brand: "Q-Zero", category: "Desks", price: 1250.00, status: "Live" },
  { sku: "CHR-EF-BLK", name: "Ergoflex Pro Task Chair", brand: "Q-Zero", category: "Chairs", price: 680.00, status: "Live" }
];

export default function BackOfficePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'builder' | 'catalog' | 'inbox' | 'roles'>('dashboard');
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedLeadId, setSelectedLeadId] = useState("CONV-4902");
  const [leadNotes, setLeadNotes] = useState("");
  const [assignee, setAssignee] = useState("Unassigned");

  const selectedLead = conversations.find(c => c.id === selectedLeadId) || conversations[0];
  
  // Calculate Totals using shared core calculation logic
  const totals = calculateTotals(selectedLead.bom, 0.10, 0.12);

  const handleSaveNotes = () => {
    setConversations(conversations.map(c => 
      c.id === selectedLead.id ? { ...c, notes: leadNotes } : c
    ));
    alert("Lead notes saved successfully!");
  };

  const handleConvertOrder = () => {
    setConversations(conversations.map(c => 
      c.id === selectedLead.id ? { ...c, status: "Converted" } : c
    ));
    alert(`Converted ${selectedLead.id} to Quote/Order!`);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#0A0A0A', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* ── PERSISTENT LEFT NAVIGATION ───────────────────────────────────── */}
      <aside style={{ width: '260px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', background: '#0F1214', flexShrink: 0 }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: '24px', height: '24px', background: '#FFD600', borderRadius: '0' }} />
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '18px', color: '#FFFFFF', letterSpacing: '0.12em' }}>JOURNEY<span style={{ color: '#FFD600' }}>AX</span></span>
        </div>

        {/* Links */}
        <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', border: 'none', background: activeTab === 'dashboard' ? '#FFD600' : 'transparent', color: activeTab === 'dashboard' ? '#0A0A0A' : '#999999', cursor: 'pointer', borderRadius: '0', textAlign: 'left', fontWeight: 600 }}
          >
            <BarChart3 size={18} /> Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('builder')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', border: 'none', background: activeTab === 'builder' ? '#FFD600' : 'transparent', color: activeTab === 'builder' ? '#0A0A0A' : '#999999', cursor: 'pointer', borderRadius: '0', textAlign: 'left', fontWeight: 600 }}
          >
            <Compass size={18} /> Journey Builder
          </button>
          
          <button 
            onClick={() => setActiveTab('catalog')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', border: 'none', background: activeTab === 'catalog' ? '#FFD600' : 'transparent', color: activeTab === 'catalog' ? '#0A0A0A' : '#999999', cursor: 'pointer', borderRadius: '0', textAlign: 'left', fontWeight: 600 }}
          >
            <Database size={18} /> Catalogue Manager
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('inbox');
              setLeadNotes(selectedLead.notes);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', border: 'none', background: activeTab === 'inbox' ? '#FFD600' : 'transparent', color: activeTab === 'inbox' ? '#0A0A0A' : '#999999', cursor: 'pointer', borderRadius: '0', textAlign: 'left', fontWeight: 600 }}
          >
            <MessageSquare size={18} /> Inbox & Leads
          </button>
          
          <button 
            onClick={() => setActiveTab('roles')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px', border: 'none', background: activeTab === 'roles' ? '#FFD600' : 'transparent', color: activeTab === 'roles' ? '#0A0A0A' : '#999999', cursor: 'pointer', borderRadius: '0', textAlign: 'left', fontWeight: 600 }}
          >
            <Users size={18} /> Users & Roles
          </button>
        </nav>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '32px', background: '#FFD600', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#0A0A0A' }}>M</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#FFFFFF' }}>Mahaveer</span>
            <span style={{ fontSize: '11px', color: '#999999' }}>Administrator</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE CONTENT ─────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0F1214' }}>
        
        {/* Header */}
        <header style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0A0A0A' }}>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: '22px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            {activeTab === 'dashboard' && 'Operations Dashboard'}
            {activeTab === 'builder' && 'Conversational Journey Builder'}
            {activeTab === 'catalog' && 'Product Catalogue compliance'}
            {activeTab === 'inbox' && 'Rosters & Completed Orders'}
            {activeTab === 'roles' && 'Access Control & Permissions'}
          </h1>
          <div style={{ fontSize: '12px', color: '#999999', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 12px', background: '#111111' }}>
            Environment: <strong style={{ color: '#FFD600' }}>Staging-Demo</strong>
          </div>
        </header>

        {/* Page Views */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* KPI Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#999999', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Conversations <MessageSquare size={16} style={{ color: '#FFD600' }} />
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: '28px', fontWeight: 800, color: '#FFFFFF' }}>1,248</div>
                  <div style={{ fontSize: '11px', color: '#1F8A4C', marginTop: '6px', fontWeight: 500 }}>+12.4% vs last week</div>
                </div>
                
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#999999', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Completion Rate <CheckCircle2 size={16} style={{ color: '#FFD600' }} />
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: '28px', fontWeight: 800, color: '#FFFFFF' }}>82.4%</div>
                  <div style={{ fontSize: '11px', color: '#1F8A4C', marginTop: '6px', fontWeight: 500 }}>+2.1% improvement</div>
                </div>

                <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#999999', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Cart Conversion <TrendingUp size={16} style={{ color: '#FFD600' }} />
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: '28px', fontWeight: 800, color: '#FFFFFF' }}>34.1%</div>
                  <div style={{ fontSize: '11px', color: '#D92D20', marginTop: '6px', fontWeight: 500 }}>-1.4% drop-off</div>
                </div>

                <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#999999', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Avg Kit Value <Clock size={16} style={{ color: '#FFD600' }} />
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk', fontSize: '28px', fontWeight: 800, color: '#FFFFFF' }}>$1,560.80</div>
                  <div style={{ fontSize: '11px', color: '#1F8A4C', marginTop: '6px', fontWeight: 500 }}>+$142.00 increase</div>
                </div>
              </div>

              {/* Conversational Funnel Summary */}
              <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', padding: '24px' }}>
                <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '20px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Guided Selling Funnel</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, background: '#FFD600', height: '24px', display: 'flex', alignItems: 'center', paddingLeft: '12px', fontWeight: 'bold', color: '#0A0A0A', fontSize: '11px' }}>Start Configurator (100%)</div>
                  <div style={{ flex: 0.8, background: 'rgba(255,214,0,0.8)', height: '24px', display: 'flex', alignItems: 'center', paddingLeft: '12px', fontWeight: 'bold', color: '#0A0A0A', fontSize: '11px' }}>Answered Intake (82%)</div>
                  <div style={{ flex: 0.4, background: 'rgba(255,214,0,0.5)', height: '24px', display: 'flex', alignItems: 'center', paddingLeft: '12px', fontWeight: 'bold', color: '#0A0A0A', fontSize: '11px' }}>Added to Cart (42%)</div>
                  <div style={{ flex: 0.3, background: 'rgba(255,214,0,0.3)', height: '24px', display: 'flex', alignItems: 'center', paddingLeft: '12px', fontWeight: 'bold', color: '#FFFFFF', fontSize: '11px' }}>Converted (34%)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JOURNEY BUILDER */}
          {activeTab === 'builder' && (
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0, textTransform: 'uppercase' }}>No-Code Flow Designer</h3>
                <button style={{ border: 'none', background: '#FFD600', color: '#0A0A0A', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={16} /> Add Question
                </button>
              </div>

              {/* Questions Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.1)', background: '#111111' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#FFD600', fontWeight: 'bold', textTransform: 'uppercase' }}>Question 1 (Grouped Form)</span>
                    <span style={{ fontSize: '12px', color: '#999999' }}>Type: Chip Select</span>
                  </div>
                  <h4 style={{ color: '#FFFFFF', margin: '0 0 12px', fontSize: '15px' }}>What is the main objective or goal for your space?</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '11px', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', color: '#CCCCCC' }}>Renovation</span>
                    <span style={{ fontSize: '11px', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', color: '#CCCCCC' }}>New Build</span>
                    <span style={{ fontSize: '11px', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', color: '#CCCCCC' }}>Quick Swap</span>
                  </div>
                </div>

                <div style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.1)', background: '#111111' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#FFD600', fontWeight: 'bold', textTransform: 'uppercase' }}>Question 2 (Conditional)</span>
                    <span style={{ fontSize: '12px', color: '#999999' }}>Type: Color Swatch</span>
                  </div>
                  <h4 style={{ color: '#FFFFFF', margin: '0 0 12px', fontSize: '15px' }}>Which tapware finish would you prefer?</h4>
                  <div style={{ fontSize: '12px', color: '#FFD600', background: 'rgba(255,214,0,0.1)', border: '1px dashed rgba(255,214,0,0.3)', padding: '8px 12px', display: 'inline-block' }}>
                    <strong>Logic Rule:</strong> IF Answer is 'Matte Black' {"->"} Include WELS water compliance filter
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATALOG */}
          {activeTab === 'catalog' && (
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0, textTransform: 'uppercase' }}>Active Products Sync</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#FFFFFF', padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={16} /> Import CSV
                  </button>
                  <button style={{ border: 'none', background: '#FFD600', color: '#0A0A0A', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} /> Sync from ERP
                  </button>
                </div>
              </div>

              {/* Product Grid Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', color: '#CCCCCC' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.08em' }}>
                    <th style={{ padding: '12px' }}>SKU</th>
                    <th style={{ padding: '12px' }}>Product Name</th>
                    <th style={{ padding: '12px' }}>Brand</th>
                    <th style={{ padding: '12px' }}>Category</th>
                    <th style={{ padding: '12px' }}>Standard Price</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockCatalog.map(p => (
                    <tr key={p.sku} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px 12px', fontFamily: 'monospace' }}>{p.sku}</td>
                      <td style={{ padding: '16px 12px', color: '#FFFFFF', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '16px 12px' }}>{p.brand}</td>
                      <td style={{ padding: '16px 12px' }}>{p.category}</td>
                      <td style={{ padding: '16px 12px', fontWeight: 'bold' }}>${p.price.toFixed(2)}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{ fontSize: '11px', background: '#F1F7F0', color: '#1F8A4C', padding: '2px 8px', fontWeight: 600 }}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: INBOX & LEADS */}
          {activeTab === 'inbox' && (
            <div style={{ display: 'flex', gap: '24px', height: '640px', overflow: 'hidden' }}>
              
              {/* Inbox Left Column */}
              <div style={{ width: '320px', border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#999999', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Leads & Abandoned Chats
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {conversations.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => {
                        setSelectedLeadId(c.id);
                        setLeadNotes(c.notes);
                      }}
                      style={{ 
                        padding: '16px', 
                        borderBottom: '1px solid rgba(255,255,255,0.05)', 
                        cursor: 'pointer', 
                        background: selectedLead.id === c.id ? '#1A1D20' : 'transparent',
                        borderLeft: selectedLead.id === c.id ? '4px solid #FFD600' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#999999', fontFamily: 'monospace' }}>{c.id}</span>
                        <span style={{ 
                          fontSize: '10px', 
                          padding: '2px 6px', 
                          fontWeight: 'bold',
                          background: c.status === 'New' ? 'rgba(255,214,0,0.15)' : c.status === 'Converted' ? '#F1F7F0' : 'rgba(217,45,32,0.1)',
                          color: c.status === 'New' ? '#FFD600' : c.status === 'Converted' ? '#1F8A4C' : '#D92D20'
                        }}>{c.status}</span>
                      </div>
                      <h4 style={{ color: '#FFFFFF', margin: '0 0 4px', fontSize: '14px' }}>{c.title}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999999' }}>
                        <span>{c.user}</span>
                        <span>{c.createdAt.split(' ')[1]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inbox Details Right Column */}
              <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#FFFFFF', fontSize: '16px' }}>{selectedLead.title} ({selectedLead.brand})</h3>
                    <span style={{ fontSize: '12px', color: '#999999' }}>Contact: {selectedLead.user} &lt;{selectedLead.email}&gt;</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select 
                      value={assignee} 
                      onChange={(e) => setAssignee(e.target.value)}
                      style={{ background: '#111111', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', fontSize: '12px' }}
                    >
                      <option>Unassigned</option>
                      <option>Assign to Plumber-Rep</option>
                      <option>Assign to Sales-CSR</option>
                    </select>
                    <button 
                      onClick={handleConvertOrder}
                      disabled={selectedLead.status === 'Converted'}
                      style={{ border: 'none', background: selectedLead.status === 'Converted' ? '#1F8A4C' : '#FFD600', color: selectedLead.status === 'Converted' ? '#FFFFFF' : '#0A0A0A', padding: '6px 16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                    >
                      {selectedLead.status === 'Converted' ? 'Converted ✓' : 'Convert to Quote'}
                    </button>
                  </div>
                </div>

                {/* Details Inner Scroll */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  
                  {/* Chat Transcript */}
                  <div style={{ flex: 1, padding: '24px', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#999999', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>Chat Transcript</div>
                    {selectedLead.transcript.map((t, idx) => (
                      <div key={idx} style={{ alignSelf: t.sender === 'ai' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                        <div style={{ 
                          padding: '10px 14px', 
                          borderRadius: '12px',
                          background: t.sender === 'ai' ? 'rgba(255,255,255,0.05)' : '#FFD600',
                          color: t.sender === 'ai' ? '#CCCCCC' : '#0A0A0A',
                          fontSize: '13.5px',
                          lineHeight: 1.4
                        }}>
                          {t.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* BOM & Action Panel */}
                  <div style={{ width: '320px', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
                    
                    {/* BOM Cart Summary */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#999999', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '12px' }}>Configured Cart items</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedLead.bom.map(b => (
                          <div key={b.sku} style={{ fontSize: '12px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                            <div style={{ color: '#FFFFFF', fontWeight: 500 }}>{b.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999999', marginTop: '2px' }}>
                              <span>SKU: {b.sku}</span>
                              <span>{b.quantity}x ${b.price.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Price Calculations */}
                      <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999999', marginBottom: '4px' }}>
                          <span>Subtotal:</span>
                          <span>${totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999999', marginBottom: '4px' }}>
                          <span>Applied Discount (12%):</span>
                          <span style={{ color: '#D92D20' }}>-${totals.discount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999999', marginBottom: '6px' }}>
                          <span>GST (10%):</span>
                          <span>${totals.gst.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#FFFFFF', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                          <span>Total Quote:</span>
                          <span style={{ color: '#FFD600' }}>${totals.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operator Notes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', color: '#999999', textTransform: 'uppercase', fontWeight: 'bold' }}>Operator Internal Notes</label>
                      <textarea 
                        value={leadNotes} 
                        onChange={(e) => setLeadNotes(e.target.value)}
                        placeholder="Add comments or specific request details..."
                        style={{ background: '#111111', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)', padding: '10px', height: '80px', resize: 'none', fontSize: '13px', outline: 'none' }}
                      />
                      <button 
                        onClick={handleSaveNotes}
                        style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#FFFFFF', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Save Notes
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: ROLES */}
          {activeTab === 'roles' && (
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0A0A0A', padding: '32px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '20px', textTransform: 'uppercase' }}>Access Control Permissions Matrix</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', color: '#CCCCCC' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.08em' }}>
                    <th style={{ padding: '12px' }}>Permission Level</th>
                    <th style={{ padding: '12px' }}>Administrator</th>
                    <th style={{ padding: '12px' }}>Account Manager</th>
                    <th style={{ padding: '12px' }}>Sales Rep</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px 12px', color: '#FFFFFF', fontWeight: 500 }}>Edit Journey Rules & Logic</td>
                    <td style={{ padding: '16px 12px', color: '#1F8A4C' }}>Allowed ✓</td>
                    <td style={{ padding: '16px 12px', color: '#1F8A4C' }}>Allowed ✓</td>
                    <td style={{ padding: '16px 12px', color: '#D92D20' }}>Denied ✕</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px 12px', color: '#FFFFFF', fontWeight: 500 }}>Modify Brand Catalog Prices</td>
                    <td style={{ padding: '16px 12px', color: '#1F8A4C' }}>Allowed ✓</td>
                    <td style={{ padding: '16px 12px', color: '#D92D20' }}>Denied ✕</td>
                    <td style={{ padding: '16px 12px', color: '#D92D20' }}>Denied ✕</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px 12px', color: '#FFFFFF', fontWeight: 500 }}>View Multi-Tenant Leads</td>
                    <td style={{ padding: '16px 12px', color: '#1F8A4C' }}>Allowed ✓</td>
                    <td style={{ padding: '16px 12px', color: '#999999' }}>Scope Restricted</td>
                    <td style={{ padding: '16px 12px', color: '#D92D20' }}>Denied ✕</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
