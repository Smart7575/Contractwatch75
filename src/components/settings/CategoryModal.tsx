import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';
import { CATEGORY_ICON_OPTIONS, getCategoryIconComponent } from '../../lib/categoryIcons';
import {
  X,
  Plus,
  Check,
  Tag,
  AlertCircle,
  Pencil,
  Trash2,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
  onSaved?: (message: string) => void;
}

const COLOR_PRESETS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Slate', hex: '#64748b' },
  { name: 'Zinc', hex: '#71717a' },
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  onSaved,
}) => {
  const { addCategory, updateCategory, contracts, categories } = useApp();

  const isEditing = Boolean(categoryToEdit);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('Layers');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [newSubcatInput, setNewSubcatInput] = useState('');
  
  // Tracking renames: oldSubcat -> newSubcat
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});
  
  // Inline editing subcategory index
  const [editingSubcatIndex, setEditingSubcatIndex] = useState<number | null>(null);
  const [editingSubcatValue, setEditingSubcatValue] = useState('');

  const [error, setError] = useState<string | null>(null);

  // Reset or populate state on modal open
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setNewSubcatInput('');
    setEditingSubcatIndex(null);
    setRenameMap({});

    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setCategoryId(categoryToEdit.id);
      setColor(categoryToEdit.color || '#6366f1');
      setIcon(categoryToEdit.icon || 'Layers');
      setSubcategories([...(categoryToEdit.subcategories || [])]);
    } else {
      setName('');
      setCategoryId('');
      setColor('#6366f1');
      setIcon('Layers');
      setSubcategories(['Algemeen']);
    }
  }, [isOpen, categoryToEdit]);

  if (!isOpen) return null;

  // Contracts affected by this category
  const affectedContracts = isEditing && categoryToEdit
    ? contracts.filter((c) => c.categoryId === categoryToEdit.id)
    : [];

  // Count contracts per subcategory
  const getSubcategoryContractCount = (subName: string): number => {
    if (!isEditing || !categoryToEdit) return 0;
    return affectedContracts.filter(
      (c) => (c.subcategory || '').toLowerCase() === subName.toLowerCase()
    ).length;
  };

  const handleAddSubcat = () => {
    const trimmed = newSubcatInput.trim();
    if (!trimmed) return;
    if (subcategories.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Subcategorie "${trimmed}" bestaat al in deze categorie.`);
      return;
    }
    setSubcategories((prev) => [...prev, trimmed]);
    setNewSubcatInput('');
    setError(null);
  };

  const handleStartRenameSubcat = (index: number) => {
    setEditingSubcatIndex(index);
    setEditingSubcatValue(subcategories[index]);
  };

  const handleSaveRenameSubcat = (index: number) => {
    const oldName = subcategories[index];
    const newName = editingSubcatValue.trim();
    if (!newName) {
      setEditingSubcatIndex(null);
      return;
    }
    if (oldName.toLowerCase() === newName.toLowerCase()) {
      setEditingSubcatIndex(null);
      return;
    }
    if (
      subcategories.some(
        (s, idx) => idx !== index && s.toLowerCase() === newName.toLowerCase()
      )
    ) {
      setError(`Subcategorie "${newName}" bestaat al.`);
      return;
    }

    // Update subcategories list
    const updated = [...subcategories];
    updated[index] = newName;
    setSubcategories(updated);

    // Record rename mapping
    // If oldName was already renamed from something else, keep original source
    let originalOld = oldName;
    for (const [orig, curr] of Object.entries(renameMap)) {
      if (curr.toLowerCase() === oldName.toLowerCase()) {
        originalOld = orig;
        break;
      }
    }
    setRenameMap((prev) => ({
      ...prev,
      [originalOld]: newName,
    }));

    setEditingSubcatIndex(null);
    setError(null);
  };

  const handleRemoveSubcat = (index: number) => {
    if (subcategories.length <= 1) {
      setError('Een categorie moet minimaal 1 subcategorie bevatten.');
      return;
    }
    const removedName = subcategories[index];
    const updated = subcategories.filter((_, idx) => idx !== index);
    setSubcategories(updated);
    setError(null);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Vul een categorienaam in.');
      return;
    }

    if (subcategories.length === 0) {
      setError('Voeg ten minste één subcategorie toe.');
      return;
    }

    // Check duplicate name with other categories
    const duplicate = categories.find(
      (c) =>
        c.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!isEditing || c.id !== categoryToEdit?.id)
    );
    if (duplicate) {
      setError(`Er bestaat al een categorie met de naam "${trimmedName}".`);
      return;
    }

    if (isEditing && categoryToEdit) {
      // Update existing category and cascade to contracts
      const result = updateCategory(
        categoryToEdit.id,
        {
          name: trimmedName,
          color,
          icon,
          subcategories,
        },
        renameMap
      );

      const msg =
        result.updatedContractsCount > 0
          ? `Categorie "${trimmedName}" opgeslagen! ${result.updatedContractsCount} contract(en) automatisch bijgewerkt.`
          : `Categorie "${trimmedName}" succesvol opgeslagen!`;

      onSaved?.(msg);
    } else {
      // Create new category
      const created = addCategory({
        name: trimmedName,
        color,
        icon,
        subcategories,
      });

      onSaved?.(`Nieuwe categorie "${created.name}" succesvol aangemaakt!`);
    }

    onClose();
  };

  const SelectedIconComponent = getCategoryIconComponent(icon);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <SelectedIconComponent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Categorie & Subcategorieën Wijzigen' : 'Nieuwe Categorie Toevoegen'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isEditing
                  ? 'Wijzigingen werken direct door in gekoppelde contracten'
                  : 'Beheer contracttypes, iconen, kleuren en subcategorieën'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Category Name */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Categorienaam <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Bijv. Streaming & Media, Fitness, Zorg, Zakelijk..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              autoFocus
            />
          </div>

          {/* Section 2: Color Picker */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Themakleur
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = color.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setColor(preset.hex)}
                    title={preset.name}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                      isSelected ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                  </button>
                );
              })}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                  title="Aangepaste kleur kiezen"
                />
                <span className="font-mono text-[11px] text-slate-500">{color}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Icon Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Icoon
              </label>
              <span className="text-[11px] text-slate-400">
                Geselecteerd: {CATEGORY_ICON_OPTIONS.find((opt) => opt.id === icon)?.label || icon}
              </span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 max-h-32 overflow-y-auto">
              {CATEGORY_ICON_OPTIONS.map((opt) => {
                const IconComp = opt.icon;
                const isSelected = icon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIcon(opt.id)}
                    title={opt.label}
                    className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs scale-105'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Subcategories List & Management */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Subcategorieën ({subcategories.length})
              </label>
              <span className="text-[11px] text-slate-500">
                Klik op het potloodje om een subcategorie te hernoemen
              </span>
            </div>

            {/* Subcategory List with Inline Rename */}
            <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[48px]">
              {subcategories.map((sub, index) => {
                const count = getSubcategoryContractCount(sub);
                const isInlineEditing = editingSubcatIndex === index;

                if (isInlineEditing) {
                  return (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-lg shadow-xs animate-in fade-in"
                    >
                      <input
                        type="text"
                        value={editingSubcatValue}
                        onChange={(e) => setEditingSubcatValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveRenameSubcat(index);
                          } else if (e.key === 'Escape') {
                            setEditingSubcatIndex(null);
                          }
                        }}
                        autoFocus
                        className="px-1.5 py-0.5 text-xs bg-transparent text-slate-900 dark:text-white focus:outline-hidden w-28"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRenameSubcat(index)}
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 cursor-pointer"
                        title="Opslaan"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSubcatIndex(null)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Annuleren"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs group"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span className="font-medium">{sub}</span>

                    {/* Count badge */}
                    {count > 0 && (
                      <span
                        className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                        title={`${count} contract(en) gebruiken deze subcategorie`}
                      >
                        {count}
                      </span>
                    )}

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleStartRenameSubcat(index)}
                      className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                      title={`Hernoem "${sub}"`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {/* Delete button */}
                    {subcategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcat(index)}
                        className="p-0.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title={`Verwijder "${sub}"`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Subcategory Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubcatInput}
                onChange={(e) => setNewSubcatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubcat();
                  }
                }}
                placeholder="Nieuwe subcategorie toevoegen..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSubcat}
                disabled={!newSubcatInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Toevoegen</span>
              </button>
            </div>
          </div>

          {/* Section 5: Cascading & Affected Contracts Notice */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-900 dark:text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Automatische Doorwerking (Cascading)</span>
            </div>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
              {isEditing ? (
                <>
                  Er zijn momenteel{' '}
                  <strong>{affectedContracts.length} contract(en)</strong> gekoppeld aan deze
                  categorie. Als u de naam van de categorie of een subcategorie wijzigt, wordt dit
                  onmiddellijk doorgevoerd in al uw contractgegevens, overzichten en PDF-rapporten.
                </>
              ) : (
                <>
                  Zodra deze categorie is aangemaakt, is deze direct beschikbaar bij het toevoegen
                  of bewerken van contracten en in alle dashboards en filters.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl font-medium cursor-pointer transition"
          >
            Annuleren
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? 'Wijzigingen Opslaan' : 'Categorie Aanmaken'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
