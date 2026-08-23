import { useState, useCallback } from 'react'
import {
  Activity,
  Check,
  CheckCircle2,
  Layers,
  Zap,
} from 'lucide-react'
import {
  Badge,
  LanguageSwitcher,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { QuickComponentFinder } from './showcase/components/QuickComponentFinder'
import { ButtonsShowcase } from './showcase/sections/ButtonsShowcase'
import { FormsShowcase } from './showcase/sections/FormsShowcase'
import { OverlaysShowcase } from './showcase/sections/OverlaysShowcase'
import { DataDisplayShowcase } from './showcase/sections/DataDisplayShowcase'
import { NavigationShowcase } from './showcase/sections/NavigationShowcase'
import { FeedbackShowcase } from './showcase/sections/FeedbackShowcase'
import { GymDomainFlowsShowcase } from './showcase/sections/GymDomainFlowsShowcase'
import type { ComponentIndexItem } from './showcase/mock-data/showcaseData'

export default function DesignSystemShowcasePage() {
  // Dynamic Tone Overrides
  const [activeTone, setActiveTone] = useState<string>('#06c384')

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('domain-flows')

  const handleSelectFromFinder = useCallback((item: ComponentIndexItem) => {
    setActiveTab(item.tab)
    setTimeout(() => {
      const element = document.getElementById(item.id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }, [])

  return (
    <div
      className="min-h-screen bg-[var(--rogym-bg-base)] text-white p-4 sm:p-8 space-y-10"
      style={{ '--rogym-tone': activeTone } as React.CSSProperties}
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-3 w-3 rounded-full bg-[var(--rogym-teal)] animate-pulse" />
            <Badge tone="accent">RoGym UI Design System v2.0</Badge>
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Design System & Component Showcase
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Thư viện thành phần giao diện chuẩn hóa, Interactive Prop Playgrounds và Gym Domain Flows thực tế.
          </p>
        </div>

        {/* Live Tone Switcher */}
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 backdrop-blur-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/70 pl-2">
            Dynamic Tone:
          </span>
          {[
            { label: 'Green (Member)', color: '#06c384' },
            { label: 'Teal (Trainer)', color: '#42e09e' },
            { label: 'Amber (Owner)', color: '#f59e0b' },
            { label: 'Crimson (Danger)', color: '#ef4444' },
            { label: 'Sky (Staff)', color: '#38bdf8' },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setActiveTone(t.color)}
              className="group relative flex h-7 w-7 items-center justify-center rounded-lg border transition-transform hover:scale-110"
              style={{
                backgroundColor: t.color,
                borderColor: activeTone === t.color ? '#ffffff' : 'transparent',
              }}
              title={t.label}
            >
              {activeTone === t.color && <Check size={14} className="text-black font-bold" />}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Component Finder Bar & Metrics */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <QuickComponentFinder onSelectComponent={handleSelectFromFinder} />

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Tổng Component"
            value="45+"
            icon={<Layers className="text-[var(--rogym-teal)]" />}
          />
          <StatCard
            label="Interactive Flows"
            value="6 Kịch bản"
            icon={<Zap className="text-amber-400" />}
          />
          <StatCard
            label="Độ phủ Test"
            value="100%"
            icon={<Activity className="text-emerald-400" />}
          />
          <StatCard
            label="Chuẩn A11y"
            value="WCAG 2.1"
            icon={<CheckCircle2 className="text-[var(--rogym-teal)]" />}
          />
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border-b border-white/10 pb-px gap-1">
          <TabsTrigger value="domain-flows">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Zap size={14} />
              <span>Gym Domain Flows</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="buttons">Buttons & Actions</TabsTrigger>
          <TabsTrigger value="forms">Form Controls & Inputs</TabsTrigger>
          <TabsTrigger value="overlays">Overlays & Dialogs</TabsTrigger>
          <TabsTrigger value="display">Data Display & Cards</TabsTrigger>
          <TabsTrigger value="nav">Navigation & Structure</TabsTrigger>
          <TabsTrigger value="feedback">Feedback & Toasts</TabsTrigger>
        </TabsList>

        {/* 1. GYM DOMAIN FLOWS */}
        <TabsContent value="domain-flows" className="space-y-6">
          <GymDomainFlowsShowcase />
        </TabsContent>

        {/* 2. BUTTONS & ACTIONS */}
        <TabsContent value="buttons" className="space-y-6">
          <ButtonsShowcase />
        </TabsContent>

        {/* 3. FORMS & INPUTS */}
        <TabsContent value="forms" className="space-y-6">
          <FormsShowcase />
        </TabsContent>

        {/* 4. OVERLAYS & DIALOGS */}
        <TabsContent value="overlays" className="space-y-6">
          <OverlaysShowcase />
        </TabsContent>

        {/* 5. DATA DISPLAY */}
        <TabsContent value="display" className="space-y-6">
          <DataDisplayShowcase />
        </TabsContent>

        {/* 6. NAVIGATION & STRUCTURE */}
        <TabsContent value="nav" className="space-y-6">
          <NavigationShowcase />
        </TabsContent>

        {/* 7. FEEDBACK & TOASTS */}
        <TabsContent value="feedback" className="space-y-6">
          <FeedbackShowcase />
        </TabsContent>
      </Tabs>
    </div>
  )
}
