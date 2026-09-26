import React, { useState } from 'react';
import { Logo } from './components/common/Logo';
import { 
  Building2, 
  Sparkles, 
  BarChart3, 
  Database, 
  Cloud, 
  Layers, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

export const App: React.FC = () => {
  const [activePortal, setActivePortal] = useState<'front-desk' | 'housekeeping' | 'manager'>('front-desk');

  const portals = [
    {
      id: 'front-desk' as const,
      name: 'Front Desk & Cashier',
      lead: 'เดียร์ (ธีรภัทร)',
      desc: 'Room Matrix, Check-in/out, Folio & Cashiering, Minibar, Invoices',
      icon: Building2,
      badge: '40 APIs',
      color: 'border-blue-500/20 bg-blue-50/50 text-blue-700',
    },
    {
      id: 'housekeeping' as const,
      name: 'Housekeeping Portal',
      lead: 'บุญ (ปวริศ)',
      desc: 'Kanban Task Board, Room Clean Cycles, Inspection, Issues Reporting',
      icon: Sparkles,
      badge: '34 APIs',
      color: 'border-amber-500/20 bg-amber-50/50 text-amber-700',
    },
    {
      id: 'manager' as const,
      name: 'Manager & Admin',
      lead: 'เขต (เขตโสภณ)',
      desc: 'KPI Dashboard, Occupancy & Revenue Analytics, User Access Control',
      icon: BarChart3,
      badge: '26 APIs',
      color: 'border-orange-500/20 bg-orange-50/50 text-orange-700',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-color-base-bg">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-color-surface border-b border-color-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand: [ img KEYSTAY ] */}
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-accent border border-orange-200">
              Hotel Management System
            </span>
          </div>

          {/* Quick Environment & Status Badges */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 text-color-text-muted border border-color-border">
              <Cloud className="w-3.5 h-3.5 text-accent" />
              <span className="hidden md:inline">Cloudflare Workers + R2</span>
              <span className="md:hidden">Cloudflare</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Setup Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <section className="bg-color-surface rounded-xl border border-color-border p-6 sm:p-8 mb-8 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-2 text-sm text-color-text-muted">
                <Layers className="w-4 h-4 text-accent" />
                <span>Monorepo Scaffolding & Architecture</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-color-text-primary tracking-tight">
                KEYSTAY Project Architecture
              </h1>
              <p className="mt-2 text-sm text-color-text-muted max-w-2xl leading-relaxed">
                ระบบจัดการโรงแรมมาตรฐานสูง แบ่งสถาปัตยกรรม Microservices 6 เซอร์วิส + API Gateway บน Cloudflare Workers, 
                Cloudflare D1 Database (Database-per-service), Cloudflare R2 สำหรับจัดเก็บรูปภาพ, และ Upstash QStash สำหรับ Event Pub/Sub
              </p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <div className="p-3 rounded-lg bg-stone-50 border border-color-border text-xs">
                <span className="font-semibold block text-color-text-primary mb-1">Architecture Ready:</span>
                <ul className="space-y-1 text-color-text-muted">
                  <li>• Cloudflare Workers + D1 (×6)</li>
                  <li>• Cloudflare R2 Asset Storage</li>
                  <li>• Turborepo + pnpm Workspaces</li>
                  <li>• GitHub Actions CI/CD Deploy</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Portal Selectors */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-color-text-primary mb-3">
            Frontend Portals (โครงสร้าง 3 หน้าจอสำหรับ 3 สมาชิก)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {portals.map((p) => {
              const Icon = p.icon;
              const isSelected = activePortal === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setActivePortal(p.id)}
                  className={`cursor-pointer rounded-xl border p-5 transition-all duration-200 ${
                    isSelected
                      ? 'border-accent bg-orange-50/20 shadow-md ring-1 ring-accent'
                      : 'border-color-border bg-color-surface hover:border-stone-300 shadow-card'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-stone-100 text-color-text-primary">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${p.color}`}>
                      {p.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-color-text-primary text-base mb-1">{p.name}</h3>
                  <p className="text-xs text-accent font-medium mb-2">เจ้าของ: {p.lead}</p>
                  <p className="text-xs text-color-text-muted leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Infrastructure Checklist Panel */}
        <section className="bg-color-surface rounded-xl border border-color-border p-6 shadow-card">
          <h3 className="text-base font-semibold text-color-text-primary mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            Infrastructure & Services Readiness
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-color-border bg-stone-50">
              <span className="font-medium text-color-text-primary block mb-1">API Gateway</span>
              <span className="text-color-text-muted">Cloudflare Worker, JWT Guard, CORS, RBAC (4 Roles)</span>
            </div>
            <div className="p-3 rounded-lg border border-color-border bg-stone-50">
              <span className="font-medium text-color-text-primary block mb-1">Asset Storage (R2)</span>
              <span className="text-color-text-muted">Bucket <code>keystay-assets</code> ผูกกับ Room & Housekeeping</span>
            </div>
            <div className="p-3 rounded-lg border border-color-border bg-stone-50">
              <span className="font-medium text-color-text-primary block mb-1">Database D1 (×6)</span>
              <span className="text-color-text-muted">Database-per-service, Outbox Pattern ด้วย <code>db.batch()</code></span>
            </div>
            <div className="p-3 rounded-lg border border-color-border bg-stone-50">
              <span className="font-medium text-color-text-primary block mb-1">Pub/Sub Message Bus</span>
              <span className="text-color-text-muted">Upstash QStash 1:N Fan-out Webhooks, Retry & DLQ</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-color-border bg-color-surface py-4 text-center text-xs text-color-text-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>KEYSTAY &copy; 2026 Hotel Management System — Built for High Operational Clarity</span>
          <span>Designed with Tailwind CSS + Cloudflare Workers</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
