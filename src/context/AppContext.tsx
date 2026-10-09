import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Category,
  Contract,
  ContractStatus,
  DocumentLink,
  FilterState,
  InAppNotification,
  PageRoute,
  PriceHistoryEntry,
  UrgencyLevel,
  User,
  UserSettings,
  ViewMode,
} from '../types';
import {
  calculateCancellationDeadline,
  getDaysRemaining,
  getTodayString,
  getUrgencyLevel,
} from '../lib/dateUtils';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_USER,
  loadCategories,
  loadContracts,
  loadUser,
  removeDemoContracts,
  restoreDemoContracts,
  isDemoContract,
  saveCategories,
  saveContracts,
  saveUser,
  wipeAllUserData,
} from '../lib/storage';
import { auth, db, testConnection } from '../lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import {
  syncUserProfile,
  updateFirestoreUserSettings,
  saveContractToFirestore,
  deleteContractFromFirestore,
  syncAllContractsToFirestore,
  seedDemoContractsInFirestore,
  removeDemoContractsFromFirestore,
  deleteUserAccountCompletely,
  logoutUser,
} from '../lib/firebaseService';

interface UndoToastData {
  id: string;
  message: string;
  onUndo: () => void;
}

interface AppContextType {
  user: User;
  contracts: Contract[];
  categories: Category[];
  notifications: InAppNotification[];
  unreadCount: number;
  filters: FilterState;
  viewMode: ViewMode;
  selectedContract: Contract | null;
  editingContract: Contract | null;
  undoToast: UndoToastData | null;
  isFirebaseAuthenticated: boolean;
  isLoadingAuth: boolean;
  isSyncingWithFirebase: boolean;
  lastSyncTime: string | null;
  syncWithFirebase: () => Promise<{ success: boolean; count: number; error?: string }>;
  
  // Modals visibility
  isAddModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isImportExportModalOpen: boolean;
  isNotificationDrawerOpen: boolean;
  isAuthModalOpen: boolean;
  
  // Setters
  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setSelectedContractId: (id: string | null) => void;
  setEditingContract: (contract: Contract | null) => void;
  setIsAddModalOpen: (open: boolean) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
  setIsImportExportModalOpen: (open: boolean) => void;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  dismissUndoToast: () => void;

  // Contract operations
  addContract: (data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => Contract;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  deleteContract: (id: string) => void;
  duplicateContract: (id: string) => void;
  markContractStatus: (id: string, status: ContractStatus, followedByContractId?: string) => void;
  snoozeContract: (id: string, days: number) => void;
  toggleFavorite: (id: string) => void;

  // Sub-items
  addDocumentLink: (contractId: string, link: Omit<DocumentLink, 'id' | 'contractId' | 'addedAt'>) => void;
  removeDocumentLink: (contractId: string, linkId: string) => void;
  addPriceHistory: (contractId: string, entry: Omit<PriceHistoryEntry, 'id'>) => void;
  toggleChecklistItem: (contractId: string, itemId: string) => void;
  addChecklistItem: (contractId: string, text: string) => void;

  // Categories
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  addSubcategory: (categoryId: string, subcategoryName: string) => void;
  removeSubcategory: (categoryId: string, subcategoryName: string) => void;

  // Demo data & System
  handleRemoveDemoData: () => Promise<{ success: boolean; count: number }>;
  handleRestoreDemoData: () => Promise<{ success: boolean; count: number }>;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  
  // Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  snoozeNotification: (id: string, days: number) => void;
  dismissNotification: (id: string) => void;

  // Auth & Account
  login: (email: string, provider: 'email' | 'google' | 'apple', name?: string) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;

  // Import / Export
  importJSON: (data: any, mode: 'merge' | 'replace') => { success: boolean; count: number; error?: string };
  importCSVContracts: (imported: Contract[], mode: 'merge' | 'replace') => void;

  // Page Routing
  currentPage: PageRoute;
  setCurrentPage: (page: PageRoute) => void;
}

const initialFilters: FilterState = {
  search: '',
  categoryId: 'all',
  urgency: 'all',
  status: 'active',
  supplier: 'all',
  tag: 'all',
  sortBy: 'deadline',
  sortOrder: 'asc',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => loadUser());
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [categories, setCategories] = useState<Category[]>(() => loadCategories());
  const [filters, setFiltersState] = useState<FilterState>(initialFilters);
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('contractwatch_view_mode');
      if (saved === 'cards' || saved === 'table' || saved === 'timeline' || saved === 'kanban') {
        return saved as ViewMode;
      }
    } catch {
      // Ignore
    }
    return 'table';
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('contractwatch_view_mode', mode);
    } catch {
      // Ignore
    }
  };
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToastData | null>(null);

  // Routing
  const [currentPage, setCurrentPageState] = useState<PageRoute>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#settings') return 'settings';
      if (window.location.hash === '#reports') return 'reports';
    }
    return 'dashboard';
  });

  const setCurrentPage = (page: PageRoute) => {
    setCurrentPageState(page);
    if (typeof window !== 'undefined') {
      if (page === 'settings') {
        window.location.hash = '#settings';
      } else if (page === 'reports') {
        window.location.hash = '#reports';
      } else {
        if (window.location.hash === '#settings' || window.location.hash === '#reports') {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    }
  };

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#settings') {
        setCurrentPageState('settings');
      } else if (window.location.hash === '#reports') {
        setCurrentPageState('reports');
      } else {
        setCurrentPageState('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [isSyncingWithFirebase, setIsSyncingWithFirebase] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // 1. Initial Firebase connection test & auth listener
  useEffect(() => {
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoadingAuth(false);
      if (fbUser) {
        setIsFirebaseAuthenticated(true);
        try {
          const providerId = fbUser.providerData[0]?.providerId;
          const provider =
            providerId === 'google.com'
              ? 'google'
              : providerId === 'apple.com'
              ? 'apple'
              : 'email';
          const synced = await syncUserProfile(fbUser, provider as any);
          setUser(synced);

          // Proactively synchronize any existing local non-demo contracts to Firestore
          const currentLocal = loadContracts().filter((c) => !isDemoContract(c));
          if (currentLocal.length > 0) {
            syncAllContractsToFirestore(fbUser.uid, currentLocal)
              .then((res) => {
                setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                console.log(`Synced ${res.count} contracts to Firestore for user ${fbUser.uid}`);
              })
              .catch((err) => {
                console.warn('Initial background sync notice:', err);
              });
          }
        } catch (e) {
          console.error('Failed to sync profile on auth state change:', e);
        }
      } else {
        setIsFirebaseAuthenticated(false);
        setUser(DEFAULT_USER);
        setContracts([]);
        saveContracts([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore sync for authenticated user contracts
  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const contractsPath = `users/${userId}/contracts`;
    const contractsRef = collection(db, 'users', userId, 'contracts');

    const unsubscribeSnapshot = onSnapshot(
      contractsRef,
      async (snapshot) => {
        // If 0 documents in Firestore, keep clean state (user has no contracts yet)
        if (snapshot.empty) {
          setContracts([]);
          saveContracts([]);
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          return;
        }

        const loaded: Contract[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push(docSnap.data() as Contract);
        });

        const isDemoDismissed = localStorage.getItem('contractwatch_demo_dismissed') === 'true';
        const finalLoaded = isDemoDismissed
          ? loaded.filter((c) => !isDemoContract(c))
          : loaded;

        // If local contracts has any new created real contract that isn't in Firestore yet, sync it!
        const currentLocal = loadContracts();
        const missingInRemote = currentLocal.filter(
          (lc) =>
            !finalLoaded.some((rc) => rc.id === lc.id) &&
            !isDemoContract(lc)
        );
        if (missingInRemote.length > 0) {
          syncAllContractsToFirestore(userId, missingInRemote)
            .then(() => {
              setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            })
            .catch(console.error);
        }

        setContracts(finalLoaded);
        saveContracts(finalLoaded);
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      },
      (error) => {
        console.warn('Firestore snapshot listener notice (offline or reconnecting):', error?.message || error);
      }
    );

    return () => unsubscribeSnapshot();
  }, [isFirebaseAuthenticated, user.id]);

  // Sync to localStorage as local fallback
  useEffect(() => {
    saveContracts(contracts);
  }, [contracts]);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveUser(user);
  }, [user]);

  // Derive notifications from contracts and lead times
  const notifications = useMemo<InAppNotification[]>(() => {
    const list: InAppNotification[] = [];
    const leadTimes = user.settings.defaultReminders || [90, 60, 30, 14, 7, 0];

    for (const contract of contracts) {
      if (contract.status !== 'active' || !contract.cancellationDeadline) continue;

      const days = getDaysRemaining(contract.cancellationDeadline);
      const urgency = getUrgencyLevel(contract.cancellationDeadline, contract.status);

      // Check if overdue
      if (days < 0) {
        list.push({
          id: `notif_od_${contract.id}`,
          userId: user.id,
          contractId: contract.id,
          contractName: contract.name,
          supplier: contract.supplier,
          triggerDate: contract.cancellationDeadline,
          daysRemaining: days,
          title: `Deadline passed: ${contract.name}`,
          message: `The notice deadline was ${Math.abs(days)} day(s) ago (${contract.cancellationDeadline}). Action is required immediately.`,
          urgency: 'overdue',
          status: 'unread',
          createdAt: new Date().toISOString(),
        });
        continue;
      }

      // Check trigger windows
      for (const lt of leadTimes) {
        if (days <= lt && days >= lt - 3) {
          let title = '';
          if (days === 0) {
            title = `⚠️ Notice deadline is TODAY: ${contract.name}`;
          } else if (days <= 7) {
            title = `Urgent: ${days} days left for ${contract.name}`;
          } else if (days <= 30) {
            title = `30-Day Notice Window: ${contract.name}`;
          } else {
            title = `Upcoming Renewal Notice: ${contract.name}`;
          }

          list.push({
            id: `notif_${contract.id}_${lt}`,
            userId: user.id,
            contractId: contract.id,
            contractName: contract.name,
            supplier: contract.supplier,
            triggerDate: contract.cancellationDeadline,
            daysRemaining: days,
            title,
            message: `Cancellation deadline is ${contract.cancellationDeadline} (${days} day${days === 1 ? '' : 's'} remaining). Annual spend: €${contract.annualCost}.`,
            urgency,
            status: 'unread',
            createdAt: new Date().toISOString(),
          });
          break; // only create one alert per contract
        }
      }
    }

    // Sort: overdue first, then lowest daysRemaining
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [contracts, user.id, user.settings.defaultReminders]);

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  const selectedContract = useMemo(() => {
    if (!selectedContractId) return null;
    return contracts.find((c) => c.id === selectedContractId) || null;
  }, [contracts, selectedContractId]);

  const setFilters = (newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFiltersState(initialFilters);
  };

  const dismissUndoToast = () => {
    setUndoToast(null);
  };

  // Add contract
  const addContract = (data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Contract => {
    const id = `cw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const currentUid = auth.currentUser?.uid;
    
    // Ensure deadline is calculated if not provided
    const deadline = data.cancellationDeadline || calculateCancellationDeadline(data.endDate, data.noticePeriod);

    const newContract: Contract = {
      ...data,
      id,
      userId: currentUid || user.id,
      isDemo: false,
      cancellationDeadline: deadline,
      documentLinks: data.documentLinks || [],
      tags: data.tags || [],
      priceHistory: data.priceHistory || [
        {
          id: `ph_${Date.now()}`,
          date: data.startDate || getTodayString(),
          annualCost: data.annualCost,
          monthlyCost: data.monthlyCost,
          note: 'Initial contract baseline',
        },
      ],
      checklist: data.checklist || [
        { id: 'cl_1', text: 'Compare market alternatives', done: false },
        { id: 'cl_2', text: 'Request quotation or check retention offer', done: false },
        { id: 'cl_3', text: 'Choose new provider or confirm renewal', done: false },
        { id: 'cl_4', text: 'Send formal cancellation notice', done: false },
        { id: 'cl_5', text: 'Confirm termination letter received', done: false },
      ],
      createdAt: now,
      updatedAt: now,
    };

    setContracts((prev) => [newContract, ...prev]);

    // Persist to Firestore if authenticated
    if (currentUid) {
      saveContractToFirestore(currentUid, newContract)
        .then(() => {
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch((err) => {
          console.error('Failed to save contract to Firestore:', err);
        });
    }

    return newContract;
  };

  // Update contract
  const updateContract = (id: string, updates: Partial<Contract>) => {
    const currentUid = auth.currentUser?.uid;
    let updatedContract: Contract | null = null;
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const merged = {
          ...c,
          ...updates,
          userId: currentUid || c.userId || user.id,
          updatedAt: new Date().toISOString(),
        };
        
        // Recalculate deadline if endDate or noticePeriod changed and not manually overridden
        if (
          (updates.endDate !== undefined || updates.noticePeriod !== undefined) &&
          !merged.isDeadlineOverridden
        ) {
          merged.cancellationDeadline = calculateCancellationDeadline(
            merged.endDate,
            merged.noticePeriod
          );
        }
        updatedContract = merged;
        return merged;
      })
    );

    // Persist to Firestore if authenticated
    if (currentUid && updatedContract) {
      saveContractToFirestore(currentUid, updatedContract)
        .then(() => {
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch((err) => {
          console.error('Failed to update contract in Firestore:', err);
        });
    }
  };

  // Delete contract with Undo
  const deleteContract = (id: string) => {
    const target = contracts.find((c) => c.id === id);
    if (!target) return;

    setContracts((prev) => prev.filter((c) => c.id !== id));
    if (selectedContractId === id) setSelectedContractId(null);

    const currentUid = auth.currentUser?.uid;
    // Remove from Firestore
    if (currentUid) {
      deleteContractFromFirestore(currentUid, id)
        .then(() => {
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch((err) => {
          console.error('Failed to delete contract from Firestore:', err);
        });
    }

    setUndoToast({
      id: `undo_${Date.now()}`,
      message: `Deleted "${target.name}".`,
      onUndo: () => {
        setContracts((prev) => [target, ...prev]);
        if (currentUid) {
          saveContractToFirestore(currentUid, target).catch(() => {});
        }
        setUndoToast(null);
      },
    });
  };

  // Duplicate contract
  const duplicateContract = (id: string) => {
    const source = contracts.find((c) => c.id === id);
    if (!source) return;

    const currentUid = auth.currentUser?.uid;
    const copy: Contract = {
      ...source,
      id: `cw_copy_${Date.now()}`,
      userId: currentUid || source.userId || user.id,
      name: `${source.name} (Copy)`,
      contractNumber: source.contractNumber ? `${source.contractNumber}-COPY` : undefined,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setContracts((prev) => [copy, ...prev]);

    if (currentUid) {
      saveContractToFirestore(currentUid, copy)
        .then(() => {
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch(() => {});
    }
  };

  // Explicit manual or programmatic sync with Firebase
  const syncWithFirebase = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!auth.currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, count: 0, error: 'Please sign in to sync with Firebase.' };
    }
    setIsSyncingWithFirebase(true);
    try {
      const uid = auth.currentUser.uid;
      const res = await syncAllContractsToFirestore(uid, contracts);
      setContracts(res.contracts);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return { success: true, count: res.count };
    } catch (err: any) {
      console.error('Manual sync failed:', err);
      return { success: false, count: 0, error: err?.message || 'Sync failed' };
    } finally {
      setIsSyncingWithFirebase(false);
    }
  };

  // Mark contract status
  const markContractStatus = (id: string, status: ContractStatus, followedByContractId?: string) => {
    updateContract(id, {
      status,
      followedByContractId: followedByContractId || undefined,
    });
  };

  // Snooze contract
  const snoozeContract = (id: string, days: number) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);
    updateContract(id, {
      snoozedUntil: snoozeDate.toISOString(),
    });
  };

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    const target = contracts.find((c) => c.id === id);
    if (target) {
      updateContract(id, { isFavorite: !target.isFavorite });
    }
  };

  // Sub-items
  const addDocumentLink = (contractId: string, link: Omit<DocumentLink, 'id' | 'contractId' | 'addedAt'>) => {
    const newDoc: DocumentLink = {
      ...link,
      id: `doc_${Date.now()}`,
      contractId,
      addedAt: new Date().toISOString(),
    };
    const target = contracts.find((c) => c.id === contractId);
    if (target) {
      updateContract(contractId, {
        documentLinks: [...(target.documentLinks || []), newDoc],
      });
    }
  };

  const removeDocumentLink = (contractId: string, linkId: string) => {
    const target = contracts.find((c) => c.id === contractId);
    if (target) {
      updateContract(contractId, {
        documentLinks: (target.documentLinks || []).filter((d) => d.id !== linkId),
      });
    }
  };

  const addPriceHistory = (contractId: string, entry: Omit<PriceHistoryEntry, 'id'>) => {
    const newEntry: PriceHistoryEntry = {
      ...entry,
      id: `ph_${Date.now()}`,
    };
    const target = contracts.find((c) => c.id === contractId);
    if (target) {
      updateContract(contractId, {
        priceHistory: [newEntry, ...(target.priceHistory || [])],
        annualCost: newEntry.annualCost,
        monthlyCost: newEntry.monthlyCost,
      });
    }
  };

  const toggleChecklistItem = (contractId: string, itemId: string) => {
    const target = contracts.find((c) => c.id === contractId);
    if (target && target.checklist) {
      const updatedList = target.checklist.map((item) =>
        item.id === itemId
          ? { ...item, done: !item.done, completedAt: !item.done ? new Date().toISOString() : undefined }
          : item
      );
      updateContract(contractId, { checklist: updatedList });
    }
  };

  const addChecklistItem = (contractId: string, text: string) => {
    const target = contracts.find((c) => c.id === contractId);
    if (target) {
      const newItem = {
        id: `cl_${Date.now()}`,
        text,
        done: false,
      };
      updateContract(contractId, {
        checklist: [...(target.checklist || []), newItem],
      });
    }
  };

  // Categories
  const addCategory = (category: Omit<Category, 'id'>) => {
    const id = `cat_${Date.now()}`;
    const newCat: Category = { ...category, id, isDefault: false };
    setCategories((prev) => [...prev, newCat]);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addSubcategory = (categoryId: string, subcategoryName: string) => {
    const trimmed = subcategoryName.trim();
    if (!trimmed) return;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === categoryId) {
          const subs = Array.isArray(c.subcategories) ? c.subcategories : [];
          if (!subs.includes(trimmed)) {
            return {
              ...c,
              subcategories: [...subs, trimmed],
            };
          }
        }
        return c;
      })
    );
  };

  const removeSubcategory = (categoryId: string, subcategoryName: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === categoryId && Array.isArray(c.subcategories)) {
          return {
            ...c,
            subcategories: c.subcategories.filter((s) => s !== subcategoryName),
          };
        }
        return c;
      })
    );
  };

  // Demo contracts management (both local and Firestore)
  const handleRemoveDemoData = async (): Promise<{ success: boolean; count: number }> => {
    localStorage.setItem('contractwatch_demo_dismissed', 'true');
    const demoItems = contracts.filter(isDemoContract);
    const demoCount = demoItems.length;

    if (auth.currentUser) {
      try {
        await removeDemoContractsFromFirestore(auth.currentUser.uid);
      } catch (err) {
        console.error('Failed to remove demo data from Firestore:', err);
      }
    }

    const filtered = contracts.filter((c) => !isDemoContract(c));
    setContracts(filtered);
    saveContracts(filtered);

    if (selectedContract && isDemoContract(selectedContract)) {
      setSelectedContractId(null);
    }
    return { success: true, count: demoCount };
  };

  const handleRestoreDemoData = async (): Promise<{ success: boolean; count: number }> => {
    localStorage.removeItem('contractwatch_demo_dismissed');

    if (auth.currentUser) {
      try {
        const seeded = await seedDemoContractsInFirestore(auth.currentUser.uid);
        // Preserve user's existing real non-demo contracts
        const nonDemoContracts = contracts.filter((c) => !isDemoContract(c));
        const combined = [...nonDemoContracts, ...seeded];
        setContracts(combined);
        saveContracts(combined);
        return { success: true, count: seeded.length };
      } catch (err) {
        console.error('Failed to restore demo contracts in Firestore:', err);
      }
    }
    const nonDemo = contracts.filter((c) => !isDemoContract(c));
    const restored = restoreDemoContracts(nonDemo, user.id);
    setContracts(restored);
    saveContracts(restored);
    const count = restored.filter(isDemoContract).length;
    return { success: true, count };
  };

  // User settings
  const updateUserSettings = (newSettings: Partial<UserSettings>) => {
    setUser((prev) => {
      const updated = {
        ...prev,
        settings: { ...prev.settings, ...newSettings },
      };
      saveUser(updated);
      return updated;
    });

    if (auth.currentUser) {
      updateFirestoreUserSettings(auth.currentUser.uid, newSettings).catch((err) => {
        console.error('Failed to update Firestore user settings:', err);
      });
    }
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    // Handled in local state / dismissed
  };

  const markAllNotificationsAsRead = () => {
    // Handled
  };

  const snoozeNotification = (id: string, days: number) => {
    //
  };

  const dismissNotification = (id: string) => {
    //
  };

  // Auth
  const login = (email: string, provider: 'email' | 'google' | 'apple', name?: string) => {
    const updated: User = {
      id: `usr_${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      provider,
      settings: user.settings,
      createdAt: new Date().toISOString(),
    };
    setUser(updated);
    saveUser(updated);
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    await logoutUser();
    setIsFirebaseAuthenticated(false);
    setUser(DEFAULT_USER);
    saveUser(DEFAULT_USER);
    setContracts([]);
    saveContracts([]);
    setSelectedContractId(null);
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (auth.currentUser) {
        await deleteUserAccountCompletely(auth.currentUser.uid);
      }
      wipeAllUserData();
      setIsFirebaseAuthenticated(false);
      setUser(DEFAULT_USER);
      setContracts([]);
      setCategories(DEFAULT_CATEGORIES);
      setSelectedContractId(null);
      setIsSettingsModalOpen(false);
      return { success: true };
    } catch (err: any) {
      console.error('Account deletion failed:', err);
      if (err?.code === 'auth/requires-recent-login') {
        return {
          success: false,
          error: 'For security reasons, please sign in again before deleting your account.',
        };
      }
      return {
        success: false,
        error: err?.message || 'An error occurred while deleting your account.',
      };
    }
  };

  // Import / Export
  const importJSON = (data: any, mode: 'merge' | 'replace') => {
    try {
      if (!data || !Array.isArray(data.contracts)) {
        return { success: false, count: 0, error: 'Invalid JSON format: missing "contracts" array.' };
      }

      if (mode === 'replace') {
        setContracts(data.contracts);
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
        if (data.user?.settings) {
          updateUserSettings(data.user.settings);
        }
      } else {
        // Merge
        const currentIds = new Set(contracts.map((c) => c.id));
        const newContracts = data.contracts.filter((c: Contract) => !currentIds.has(c.id));
        setContracts((prev) => [...prev, ...newContracts]);
      }

      return { success: true, count: data.contracts.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Import failed.' };
    }
  };

  const importCSVContracts = (imported: Contract[], mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      setContracts(imported);
    } else {
      const currentIds = new Set(contracts.map((c) => c.id));
      const toAdd = imported.filter((c) => !currentIds.has(c.id));
      setContracts((prev) => [...prev, ...toAdd]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        contracts,
        categories,
        notifications,
        unreadCount,
        filters,
        viewMode,
        selectedContract,
        editingContract,
        undoToast,
        isFirebaseAuthenticated,
        isLoadingAuth,
        isSyncingWithFirebase,
        lastSyncTime,
        syncWithFirebase,
        isAddModalOpen,
        isSettingsModalOpen,
        isImportExportModalOpen,
        isNotificationDrawerOpen,
        isAuthModalOpen,
        setViewMode,
        setFilters,
        resetFilters,
        setSelectedContractId,
        setEditingContract,
        setIsAddModalOpen,
        setIsSettingsModalOpen,
        setIsImportExportModalOpen,
        setIsNotificationDrawerOpen,
        setIsAuthModalOpen,
        dismissUndoToast,
        addContract,
        updateContract,
        deleteContract,
        duplicateContract,
        markContractStatus,
        snoozeContract,
        toggleFavorite,
        addDocumentLink,
        removeDocumentLink,
        addPriceHistory,
        toggleChecklistItem,
        addChecklistItem,
        addCategory,
        updateCategory,
        addSubcategory,
        removeSubcategory,
        handleRemoveDemoData,
        handleRestoreDemoData,
        updateUserSettings,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        snoozeNotification,
        dismissNotification,
        login,
        logout,
        deleteAccount,
        importJSON,
        importCSVContracts,
        currentPage,
        setCurrentPage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
