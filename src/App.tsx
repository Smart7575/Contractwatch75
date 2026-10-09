/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { KPIBar } from './components/dashboard/KPIBar';
import { CancellationRadar } from './components/dashboard/CancellationRadar';
import { ContractFormModal } from './components/contracts/ContractFormModal';
import { ContractDossierModal } from './components/contracts/ContractDossierModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { SettingsPage } from './components/settings/SettingsPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { ImportExportModal } from './components/settings/ImportExportModal';
import { AuthModal } from './components/auth/AuthModal';
import { UndoToast } from './components/common/UndoToast';
import { OfflineIndicator } from './components/common/OfflineIndicator';

const DashboardContent: React.FC = () => {
  const {
    isAddModalOpen,
    setIsAddModalOpen,
    editingContract,
    setEditingContract,
    selectedContract,
    setSelectedContractId,
    isImportExportModalOpen,
    setIsImportExportModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    currentPage,
  } = useApp();

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Top 3-zone Header */}
      <Header />

      {/* Main Workspace with Sidebar & Viewport */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto overflow-hidden min-h-0">
        {/* Desktop & iPad Sidebar */}
        <Sidebar />

        {/* Main Content Area - Independently scrollable */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto w-full min-h-0">
          {currentPage === 'settings' ? (
            <SettingsPage />
          ) : currentPage === 'reports' ? (
            <ReportsPage />
          ) : (
            <>
              {/* 5-Second KPI Clarity Bar */}
              <KPIBar />

              {/* Cancellation Notice Radar (Cards, Table, Timeline, Kanban) */}
              <CancellationRadar />
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (iPhone) */}
      <MobileNav />

      {/* Modals & Drawers */}
      <ContractFormModal
        isOpen={isAddModalOpen || editingContract !== null}
        initialContract={editingContract}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingContract(null);
        }}
      />

      <ContractDossierModal
        contract={selectedContract}
        onClose={() => setSelectedContractId(null)}
      />

      <NotificationDrawer />

      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Feedback elements */}
      <UndoToast />
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <DashboardContent />
      </AppProvider>
    </ThemeProvider>
  );
}
