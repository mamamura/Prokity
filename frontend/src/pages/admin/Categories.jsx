import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Pencil, Trash2, X, FolderTree, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { compressImage } from '../../lib/image';

const emptyCat = { slug: '', name: '', icon: 'Leaf', image: '' };

const CatForm = ({ initial, onClose, onSaved }) => {
  const { toast } = useToast();
  const [f, setF] = useState({ ...emptyCat, ...(initial || {}) });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-');

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
      setF((s) => ({ ...s, image: dataUrl }));
    } catch (err) {
      toast({ title: 'ছবি পড়া যায়নি', description: err.message || 'অন্য ছবি চেষ্টা করুন', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.slug) { toast({ title: 'Name and slug required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (initial?.id) await api.put(`/admin/categories/${initial.id}`, f);
      else await api.post('/admin/categories', f);
      toast({ title: initial ? 'Category updated' : 'Category created' });
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.detail || 'Try again', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-5 py-3.5 flex items-center justify-between">
          <h2 className="font-extrabold text-lg">{initial ? 'Edit category' : 'Add category'}</h2>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full hover:bg-neutral-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {/* Image upload */}
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase">Category image</label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="w-24 h-24 rounded-xl bg-neutral-50 border border-neutral-200 grid place-items-center overflow-hidden">
                {f.image ? <img src={f.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-neutral-400" />}
              </div>
              <div className="flex-1 space-y-2">
                <label data-testid="cat-upload-btn" className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 w-fit">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload image'}
                  <input data-testid="cat-image-file" type="file" accept="image/*" onChange={onFile} className="hidden" />
                </label>
                {f.image && (
                  <button type="button" onClick={() => setF({ ...f, image: '' })} className="inline-flex items-center gap-1 text-[11px] text-red-600 font-semibold"><X className="w-3 h-3" /> ছবি সরান</button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase">Name *</label>
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-neutral-700 uppercase">Slug *</label>
            <input value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} className="mt-1 w-full h-11 px-3 rounded-xl bg-neutral-50 border border-neutral-200 outline-none focus:border-emerald-500 text-sm" />
            <div className="text-[10.5px] text-neutral-500 mt-1">URL-friendly identifier (auto from name).</div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full bg-neutral-100 text-neutral-700 font-semibold">Cancel</button>
            <button data-testid="cat-save-btn" disabled={saving} type="submit" className="flex-1 h-11 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60">{saving ? 'Saving…' : (initial ? 'Save changes' : 'Create')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminCategoriesPage = () => {
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => { setLoading(true); const { data } = await api.get('/categories'); setCats(data); setLoading(false); };
  useEffect(() => { load(); }, []);

  const del = async (id) => {
    try { await api.delete(`/admin/categories/${id}`); toast({ title: 'Category deleted' }); setConfirmDel(null); load(); }
    catch { toast({ title: 'Delete failed', variant: 'destructive' }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold">Categories</h1>
          <p className="text-sm text-neutral-500">{cats.length} categories — organise your catalogue.</p>
        </div>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 md:px-4 h-9 md:h-10 rounded-full text-xs md:text-sm font-semibold hover:bg-emerald-700"><Plus className="w-4 h-4" /> Add</button>
      </div>
      {loading ? <div className="p-10 text-center text-sm text-neutral-500">Loading…</div> : cats.length === 0 ? (
        <div className="rounded-2xl bg-white border border-neutral-100 p-10 text-center"><FolderTree className="w-8 h-8 text-neutral-300 mx-auto" /><div className="text-sm font-semibold mt-2">No categories yet</div></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cats.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white border border-neutral-100 overflow-hidden">
              <div className="aspect-[4/3] bg-emerald-50">
                {c.image && <img src={c.image} alt={c.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />}
              </div>
              <div className="p-3">
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-[10.5px] text-neutral-500 font-mono">/{c.slug}</div>
                <div className="flex items-center gap-1 mt-2">
                  <button onClick={() => { setEditing(c); setOpen(true); }} className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-700 hover:bg-neutral-200"><Pencil className="w-3 h-3" /> Edit</button>
                  <button onClick={() => setConfirmDel(c)} className="w-8 h-8 grid place-items-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <CatForm initial={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full">
            <div className="font-extrabold text-lg">Delete this category?</div>
            <div className="text-sm text-neutral-500 mt-1">“{confirmDel.name}” will be removed. Existing products keep their category slug.</div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmDel(null)} className="flex-1 h-11 rounded-full bg-neutral-100 font-semibold text-sm">Cancel</button>
              <button onClick={() => del(confirmDel.id)} className="flex-1 h-11 rounded-full bg-red-600 text-white font-semibold text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesPage;
