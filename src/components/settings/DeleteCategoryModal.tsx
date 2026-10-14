import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';
import { AlertTriangle, Trash2, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { getCategoryIconComponent } from '../../lib/categoryIcons';
import { formatCurrency } from '../../lib/dateUtils';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToDelete: Category | null;
  onDeleted?: (message: string) => void;
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  onClose,
  categoryToDelete,
  onDeleted,
}) => {
  const { categories, contracts, deleteCategory, user } = useApp();

  const [reassignToCatId, setReassignToCatId] = useState<string>('');

  if (!isOpen || !categoryToDelete) return null;

  const affectedContracts = contracts.filter((c) => c.categoryId === categoryToDelete.id);
  const remainingCategories = categories.filter((c) => c.id !== categoryToDelete.id);

  // Default target category if not selected
  const defaultTargetId =
    reassignToCatId ||
    remainingCategories.find((c) => c.id === 'other')?.id ||
    remainingCategories[0]?.id ||
    '';

  const selectedTargetCategory = remainingCategories.find((c) => c.id === defaultTargetId);

  const handleDelete = () => {
    const catName = categoryToDelete.name;
    const targetCatName = selectedTargetCategory?.name || 'Overig';
    const result = deleteCategory(categoryToDelete.id, defaultTargetId);

    const msg =
      result.reassignedCount > 0
        ? `Categorie "${catName}" verwijderd. ${result.reassignedCount} contract(en) overgezet naar "${targetCatName}".`
        : `Categorie "${catName}" succesvol verwijderd.`;

    onDeleted?.(msg);
    onClose();
  };

  const IconComp = getCategoryIconComponent(categoryToDelete.icon);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Categorie Verwijderen
              </h3>
              <p className="text-[11px] text-slate-500">
                "{categoryToDelete.name}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {affectedContracts.length > 0 ? (
            <>
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Let op: {affectedContracts.length} contract(en) gekoppeld
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Er zijn nog actieve of gearchiveerde contracten die deze categorie gebruiken.
                    Kies een doellocatie om deze contracten veilig naartoe over te zetten.
                  </p>
                </div>
              </div>

              {/* List of Affected Contracts */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                  Getroffen Contracten ({affectedContracts.length})
                </label>
                <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2">
                  {affectedContracts.map((c) => (
                    <div
                      key={c.id}
                      className="py-1.5 px-1 flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {c.name}
                        </span>{' '}
                        <span className="text-slate-400">({c.supplier})</span>
                      </div>
                      <span className="font-mono text-slate-600 dark:text-slate-400 shrink-0">
                        {formatCurrency(c.annualCost, user.settings.currency)}/jr
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reassignment Dropdown */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Zet deze contracten over naar categorie:
                </label>
                <select
                  value={defaultTargetId}
                  onChange={(e) => setReassignToCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {remainingCategories.map((rc) => (
                    <option key={rc.id} value={rc.id}>
                      {rc.name} ({rc.subcategories.length} subcategorieën)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  De contracten worden automatisch gekoppeld aan subcategorie "
                  <strong>{selectedTargetCategory?.subcategories[0] || 'Algemeen'}</strong>".
                </p>
              </div>
            </>
          ) : (
            <div className="py-2 text-slate-600 dark:text-slate-300">
              <p>
                Weet u zeker dat u de categorie "<strong>{categoryToDelete.name}</strong>" wilt
                verwijderen? Er zijn momenteel geen contracten aan deze categorie gekoppeld.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl font-medium cursor-pointer transition text-xs"
          >
            Annuleren
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {affectedContracts.length > 0
                ? `Verwijderen & ${affectedContracts.length} Contract(en) Overzetten`
                : 'Categorie Verwijderen'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
