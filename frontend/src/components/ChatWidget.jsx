import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MessageCircle, X, Send, Leaf } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const ChatWidget = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef(null);

  const hideOn = ['/login', '/signup', '/messages', '/checkout'];
  const hidden = hideOn.some((p) => pathname === p || pathname.startsWith(p + '/')) || pathname.startsWith('/portal-');

  // Poll unread count
  useEffect(() => {
    if (!user || hidden) return;
    let alive = true;
    const tick = async () => {
      try { const { data } = await api.get('/messages/unread-count'); if (alive) setUnread(data.count); } catch (_) {}
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [user, hidden]);

  // Load on open
  const loadMessages = async () => {
    if (!user) return;
    try { const { data } = await api.get('/messages'); setMsgs(data); setUnread(0); } catch (_) {}
  };
  useEffect(() => { if (open) loadMessages(); /* eslint-disable-next-line */ }, [open]);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(loadMessages, 7000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [open]);
  useEffect(() => { const el = scrollerRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs.length, open]);

  if (hidden) return null;

  const send = async (e) => {
    e?.preventDefault?.();
    const t = text.trim(); if (!t || sending) return;
    setSending(true);
    const optimistic = { id: `tmp-${Date.now()}`, userId: user.id, text: t, fromAdmin: false, createdAt: new Date().toISOString() };
    setMsgs((m) => [...m, optimistic]);
    setText('');
    try {
      const { data } = await api.post('/messages', { text: t });
      setMsgs((m) => m.map((x) => x.id === optimistic.id ? data : x));
    } catch (_) {
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
      setText(t);
    } finally { setSending(false); }
  };

  const openChat = () => {
    if (!user) { nav('/login?next=/messages'); return; }
    setOpen(true);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={openChat}
        className="fixed right-4 bottom-[88px] lg:bottom-6 z-40 w-14 h-14 rounded-full bg-emerald-700 text-white shadow-lg hover:bg-emerald-800 grid place-items-center transition-transform hover:scale-105"
        aria-label="Chat with us"
      >
        <MessageCircle className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center border-2 border-white">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {/* Popup */}
      {open && (
        <div className="fixed inset-0 z-50 lg:inset-auto lg:right-6 lg:bottom-6 lg:w-[380px] lg:h-[560px] lg:rounded-2xl lg:shadow-2xl bg-white lg:border lg:border-neutral-200 overflow-hidden flex flex-col">
          <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-white/20 grid place-items-center"><Leaf className="w-4 h-4" /></div>
              <div className="leading-tight">
                <div className="font-extrabold text-[14px]">সাপোর্ট চ্যাট</div>
                <div className="text-[10.5px] opacity-80">আমরা সাধারণত কয়েক মিনিটে উত্তর দিই</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/15"><X className="w-5 h-5" /></button>
          </div>
          <div ref={scrollerRef} className="flex-1 overflow-y-auto bg-neutral-50 px-3 py-3 space-y-2">
            {msgs.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 grid place-items-center"><Leaf className="w-5 h-5 text-emerald-700" /></div>
                <div className="text-sm font-semibold mt-2">হ্যালো {user.name.split(' ')[0]} 👋</div>
                <div className="text-[12px] text-neutral-500 mt-1">পণ্য বা অর্ডার নিয়ে যেকোনো প্রশ্ন করুন।</div>
              </div>
            ) : msgs.map((m) => (
              <div key={m.id} className={`flex ${m.fromAdmin ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 ${m.fromAdmin ? 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-md' : 'bg-emerald-700 text-white rounded-br-md'}`}>
                  {m.fromAdmin && (<div className="text-[10px] font-semibold text-emerald-700 mb-0.5">সাপোর্ট</div>)}
                  <div className="text-[13px] whitespace-pre-wrap break-words">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex items-center gap-2 px-3 py-3 bg-white border-t border-neutral-200">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="বার্তা লিখুন…" className="flex-1 h-11 px-4 rounded-full bg-neutral-100 outline-none text-sm border border-transparent focus:bg-white focus:border-emerald-400" />
            <button type="submit" disabled={!text.trim() || sending} className="w-11 h-11 rounded-full bg-emerald-700 text-white grid place-items-center disabled:opacity-40 hover:bg-emerald-800">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
