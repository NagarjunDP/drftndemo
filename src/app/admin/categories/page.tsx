'use client';

import React, { useEffect, useState } from 'react';
import { dbService as db } from '@/lib/db';
import { Category } from '@/types';
import { Plus, Edit2, Trash2, Search, CheckCircle2, XCircle, CornerDownRight } from 'lucide-react';
import { useToast } from '@/components/ToastContainer';
import { useRouter } from 'next/navigation';

export default function AdminCategories() {
  const { addToast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const data = await db.getAllCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load categories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCategoryActive = async (category: Category) => {
    try {
      await db.updateCategory(category.id, { is_active: !category.is_active });
      addToast(`${category.name} is now ${!category.is_active ? 'Active' : 'Draft'}`, 'success');
      fetchCategories();
    } catch (error) {
      addToast('Failed to update category', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?\n\nThis will block if there are assigned subcategories or products.`)) return;
    try {
      await db.deleteCategory(id);
      addToast(`Category "${name}" deleted successfully`, 'success');
      fetchCategories();
    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'Failed to delete category', 'error');
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedItem = categories.find(c => c.id === draggedId);
    const targetItem = categories.find(c => c.id === targetId);
    if (!draggedItem || !targetItem) return;

    // Only allow drag-to-reorder between categories on the exact same hierarchical level
    if (draggedItem.parent_id !== targetItem.parent_id) {
      addToast('Can only reorder items at the same hierarchical level', 'error');
      return;
    }

    const sameLevelItems = categories.filter(c => c.parent_id === draggedItem.parent_id);
    const sortedSameLevel = [...sameLevelItems].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    const draggedIdx = sortedSameLevel.findIndex(c => c.id === draggedId);
    const targetIdx = sortedSameLevel.findIndex(c => c.id === targetId);

    const reorderedList = [...sortedSameLevel];
    reorderedList.splice(draggedIdx, 1);
    reorderedList.splice(targetIdx, 0, draggedItem);

    try {
      setIsLoading(true);
      await Promise.all(
        reorderedList.map((item, idx) => 
          db.updateCategory(item.id, { display_order: idx })
        )
      );
      addToast('Order updated successfully', 'success');
      await fetchCategories();
    } catch (err) {
      console.error(err);
      addToast('Failed to update category order', 'error');
    } finally {
      setIsLoading(false);
      setDraggedId(null);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group categories into tree structure
  const sortedCategories = [...categories].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const parents = sortedCategories.filter(c => !c.parent_id);
  const subcategoriesByParent = sortedCategories.reduce((acc, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {} as Record<string, Category[]>);

  const renderRow = (category: Category, isSub = false) => {
    return (
      <tr 
        key={category.id} 
        draggable
        onDragStart={() => handleDragStart(category.id)}
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(category.id)}
        className={`border-b border-zinc-100 hover:bg-zinc-50/40 transition-all duration-200 cursor-move ${
          isSub ? 'bg-zinc-50/60 font-medium' : 'bg-white font-bold'
        }`}
      >
        <td className="p-4">
          <div className={`flex items-center gap-2 ${isSub ? 'pl-8' : ''}`}>
            {isSub && <CornerDownRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
            <div className="w-16 h-12 bg-zinc-100 border border-zinc-200 overflow-hidden rounded flex-shrink-0">
              {category.image_url ? (
                <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-[10px] font-bold uppercase font-mono">No Img</div>
              )}
            </div>
          </div>
        </td>
        <td className="p-4">
          <span className={`text-sm font-semibold ${isSub ? 'text-zinc-600' : 'text-zinc-900'}`}>
            {category.name}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-zinc-400 font-mono">/{category.slug}</span>
            {category.description && (
              <span className="text-[10px] text-zinc-500 truncate max-w-xs">— {category.description}</span>
            )}
          </div>
        </td>
        <td className="p-4">
          <span className="text-xs font-mono text-zinc-500">
            {category.display_order || 0}
          </span>
        </td>
        <td className="p-4">
          <button 
            onClick={() => toggleCategoryActive(category)}
            className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
            category.is_active ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100' : 'bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-zinc-200'
          }`}>
            {category.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {category.is_active ? 'Active' : 'Draft'}
          </button>
        </td>
        <td className="p-4 text-right">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => router.push(`/admin/categories/${category.id}/edit`)}
              className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors border border-zinc-200 hover:border-zinc-400 rounded bg-white"
              title="Edit Category"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category.id, category.name)}
              className="p-2 text-zinc-500 hover:text-red-600 transition-colors border border-zinc-200 hover:border-red-200 rounded bg-white"
              title="Delete Category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-widest uppercase text-zinc-900">Categories</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage nested collections and display order. Drag items vertically to sort them.</p>
        </div>
        <button
          onClick={() => router.push('/admin/categories/new')}
          className="bg-zinc-900 hover:bg-zinc-700 text-white px-6 py-3 font-bold uppercase tracking-widest text-xs transition-colors flex items-center gap-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="bg-white border border-zinc-200/60 rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search categories by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50/50 border border-zinc-200 text-zinc-900 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-900 transition-colors rounded-lg"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Loading categories...</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400 w-16">Image</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Details</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Order</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-zinc-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {searchTerm ? (
                  filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500 text-sm">No categories found matching &quot;{searchTerm}&quot;.</td>
                    </tr>
                  ) : (
                    filteredCategories.map(cat => renderRow(cat))
                  )
                ) : (
                  parents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500 text-sm">No categories found.</td>
                    </tr>
                  ) : (
                    parents.map(parent => (
                      <React.Fragment key={parent.id}>
                        {renderRow(parent)}
                        {subcategoriesByParent[parent.id]?.map(sub => renderRow(sub, true))}
                      </React.Fragment>
                    ))
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
