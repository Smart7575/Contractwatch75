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
import { CashflowPage } from './components/cashflow/CashflowPage';
import { ImportExportModal } from './components/settings/ImportExportModal';
import { AuthModal } from './components/auth/AuthModal';
import { LoginPage } from './components/auth/LoginPage';
import { UndoToast } from './components/common/UndoToast';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { Loader2 } from 'lucide-react';

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
    <div className="h-dvh flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Top 3-zone Header */}
      <Header />

      {/* Main Workspace with Sidebar & Viewport */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto overflow-hidden min-h-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {/* Desktop & iPad Sidebar */}
        <Sidebar />

        {/* Main Content Area - Independently scrollable */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-[calc(6.25rem+env(safe-area-inset-bottom))] md:pb-[calc(2rem+env(safe-area-inset-bottom))] overflow-y-auto w-full min-h-0">
          {currentPage === 'settings' ? (
            <SettingsPage />
          ) : currentPage === 'reports' ? (
            <ReportsPage />
          ) : currentPage === 'cashflow' ? (
            <CashflowPage />
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

const AppNavigation: React.FC = () => {
  const { isFirebaseAuthenticated, isLoadingAuth } = useApp();

  if (isLoadingAuth) {
    return (
      <div className="min-h-dvh w-full flex flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-600/30">
            CW
          </div>
          <span className="text-xl font-bold tracking-tight">ContractWatch75</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span>Verifying authentication session...</span>
        </div>
      </div>
    );
  }

  if (!isFirebaseAuthenticated) {
    return <LoginPage />;
  }

  return <DashboardContent />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppNavigation />
      </AppProvider>
    </ThemeProvider>
  );
}
