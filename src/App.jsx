import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Building2, Map as MapIcon, MapPin, Tent, Trees, Home, 
  X, Plus, ChevronDown, Image as ImageIcon, 
  Send, Calendar, Clock, CheckCircle2, FileText, Loader2, AlertTriangle, HelpCircle,
  Edit3, Trash2, Paperclip, Download, User, Users, Folder, Star
} from 'lucide-react';

// --- FIREBASE IMPORTS (Storage Removed) ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxL8ejtFBr7m7OJ8gYgd1NpyluwGpiZgA",
  authDomain: "tanur-project-tracker.firebaseapp.com",
  projectId: "tanur-project-tracker",
  storageBucket: "tanur-project-tracker.firebasestorage.app",
  messagingSenderId: "1033537596014",
  appId: "1:1033537596014:web:88d2ea52b4ff5f08a9947f"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init failed:", e);
}

// Derive a safe App ID for Canvas environments
const CANVAS_APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'tanur-tracker-default';

// --- CLOUDINARY UPLOAD FUNCTION ---
const uploadToCloudinary = async (fileData) => {
  const cloudName = 'davoje7p5'; 
  const uploadPreset = 'tanur_preset'; // You must create this Unsigned preset in Cloudinary settings

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const formData = new FormData();
  
  formData.append('file', fileData);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Cloudinary Error:", errorData);
    throw new Error(errorData.error?.message || 'Upload to Cloudinary failed');
  }

  const data = await response.json();
  return data.secure_url; // Returns the permanent Cloudinary URL
};

const ICON_MAP = {
  Building2, Map: MapIcon, MapPin, Tent, Trees, Home, User, Users, AlertTriangle, Star, FileText, Folder
};

const INITIAL_LOCAL_BODIES = [
  { id: 'priority', name: 'Priority Files', color: 'from-red-500 to-rose-700', theme: 'rose', icon: AlertTriangle },
  { id: 'tanur', name: 'Tanur Municipality', color: 'from-indigo-500 to-purple-600', theme: 'indigo', icon: Building2 },
  { id: 'ozhur', name: 'Ozhur', color: 'from-emerald-400 to-green-600', theme: 'emerald', icon: Trees },
  { id: 'cheriyamundam', name: 'Cheriyamundam', color: 'from-blue-400 to-cyan-600', theme: 'blue', icon: MapIcon },
  { id: 'ponmundam', name: 'Ponmundam', color: 'from-amber-400 to-orange-500', theme: 'amber', icon: Tent },
  { id: 'tanalur', name: 'Tanalur', color: 'from-rose-400 to-pink-600', theme: 'rose', icon: Home },
  { id: 'niramaruthur', name: 'Niramaruthur', color: 'from-teal-400 to-emerald-500', theme: 'teal', icon: MapPin },
  { id: 'personal', name: 'Personal', color: 'from-violet-500 to-fuchsia-600', theme: 'fuchsia', icon: User },
  { id: 'common', name: 'Common', color: 'from-slate-500 to-slate-700', theme: 'slate', icon: Users },
  { id: 'trivandrum', name: 'Trivandrum Office', color: 'from-cyan-500 to-blue-700', theme: 'blue', icon: Building2 },
];

const THEME_MAP = {
  indigo: { light: 'bg-indigo-50 border-indigo-100', dark: 'bg-indigo-100/60 border-indigo-200', text: 'text-indigo-800' },
  emerald: { light: 'bg-emerald-50 border-emerald-100', dark: 'bg-emerald-100/60 border-emerald-200', text: 'text-emerald-800' },
  blue: { light: 'bg-blue-50 border-blue-100', dark: 'bg-blue-100/60 border-blue-200', text: 'text-blue-800' },
  amber: { light: 'bg-amber-50 border-amber-100', dark: 'bg-amber-100/60 border-amber-200', text: 'text-amber-800' },
  rose: { light: 'bg-rose-50 border-rose-100', dark: 'bg-rose-100/60 border-rose-200', text: 'text-rose-800' },
  teal: { light: 'bg-teal-50 border-teal-100', dark: 'bg-teal-100/60 border-teal-200', text: 'text-teal-800' },
  fuchsia: { light: 'bg-fuchsia-50 border-fuchsia-100', dark: 'bg-fuchsia-100/60 border-fuchsia-200', text: 'text-fuchsia-800' },
  slate: { light: 'bg-slate-50 border-slate-100', dark: 'bg-slate-100/60 border-slate-200', text: 'text-slate-800' },
};

const getRandomStyle = () => {
  const styles = [
    { color: 'from-indigo-500 to-purple-600', theme: 'indigo' },
    { color: 'from-emerald-400 to-green-600', theme: 'emerald' },
    { color: 'from-blue-500 to-cyan-600', theme: 'blue' },
    { color: 'from-amber-400 to-orange-500', theme: 'amber' },
    { color: 'from-rose-400 to-pink-600', theme: 'rose' },
    { color: 'from-teal-400 to-emerald-500', theme: 'teal' },
    { color: 'from-violet-500 to-fuchsia-600', theme: 'fuchsia' }
  ];
  return styles[Math.floor(Math.random() * styles.length)];
};

const useLongPress = (callback, ms = 600) => {
  const timerRef = useRef();
  const isLongPress = useRef(false);

  const start = useCallback((e) => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      callback(e);
    }, ms);
  }, [callback, ms]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const onClickHandler = useCallback((e, defaultClick) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (defaultClick) defaultClick(e);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onClickHandler
  };
};

const LongPressable = ({ onLongPress, onClick, delay = 600, children, className, as: Component = 'div', ...props }) => {
  const longPressEvent = useLongPress(onLongPress, delay);
  return (
    <Component
      {...props}
      onMouseDown={longPressEvent.onMouseDown}
      onMouseUp={longPressEvent.onMouseUp}
      onMouseLeave={longPressEvent.onMouseLeave}
      onTouchStart={longPressEvent.onTouchStart}
      onTouchEnd={longPressEvent.onTouchEnd}
      onClick={(e) => longPressEvent.onClickHandler(e, onClick)}
      className={className}
    >
      {children}
    </Component>
  );
};

// Faster Uploads: Reduced MAX_WIDTH to 1280px to significantly reduce upload time while maintaining good quality
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280; 
        const MAX_HEIGHT = 1280; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.80)); 
      };
    };
  });
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

export default function App() {
  const [activeBody, setActiveBody] = useState(null);
  
  // Firebase & State Handlers
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Fallback Local Memory State
  const [allProjects, setAllProjects] = useState([]); 
  const [localUpdates, setLocalUpdates] = useState([]); 
  const [customCategories, setCustomCategories] = useState([]);

  // Modals for new Categories & Actions
  const [isAddingCategoryModalOpen, setIsAddingCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [homeActionMenu, setHomeActionMenu] = useState(null); 
  const [homePromptDialog, setHomePromptDialog] = useState(null);
  const [typeToDeleteDialog, setTypeToDeleteDialog] = useState(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600;700&family=Sora:wght@300;400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    if (!auth) {
      setAuthError("Firebase not initialized correctly.");
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            console.warn("Custom token failed, falling back to Anonymous Auth:", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
        setAuthError(null);
      } catch (error) {
        console.error("Auth Error:", error);
        setAuthError(error.code || error.message);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (usr) => {
      if (usr) setUser(usr);
      else setUser(null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || authError) return;

    // Fetch Projects
    const projectsRef = collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects');
    const unsubscribeProjects = onSnapshot(projectsRef, (snapshot) => {
      const projectsData = [];
      snapshot.forEach(doc => projectsData.push({ id: doc.id, ...doc.data() }));
      projectsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllProjects(projectsData);
    }, (error) => console.error("Error fetching projects:", error));

    // Fetch Custom Categories
    const categoriesRef = collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'categories');
    const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
      const cats = [];
      snapshot.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
      cats.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setCustomCategories(cats);
    }, (error) => console.error("Error fetching categories:", error));

    return () => {
      unsubscribeProjects();
      unsubscribeCategories();
    };
  }, [user, authError]);

  const handleOpenBody = (body) => setActiveBody(body);
  const handleCloseBody = () => setActiveBody(null);

  const handleAddProject = async (bodyId, projectName) => {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const projectData = {
      id: projectId,
      localBodyId: bodyId,
      name: projectName,
      createdAt: new Date().toISOString(),
      updateCount: 0
    };

    setAllProjects(prev => [projectData, ...prev]);

    if (user && !authError) {
      try {
        const firebaseTask = setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', projectId), projectData);
        await Promise.race([firebaseTask, new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 8000))]);
      } catch (err) {
        console.warn("Failed to sync project to cloud, but saved locally:", err);
      }
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const style = getRandomStyle();
    const newCat = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: newCategoryName.trim(),
      color: style.color,
      theme: style.theme,
      iconName: 'Folder', // Default icon for custom categories
      createdAt: new Date().toISOString(),
      deleted: false
    };

    setCustomCategories(prev => [...prev, newCat]);
    setIsAddingCategoryModalOpen(false);
    setNewCategoryName('');

    if (user && !authError) {
      try {
        await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'categories', newCat.id), newCat);
      } catch(err) {
        console.warn("Failed to sync category to cloud, saved locally.", err);
      }
    }
  };

  // Action Menu Handlers for Boxes
  const handleBoxLongPress = (body) => {
    setHomeActionMenu({
       title: "Box Options",
       options: [
         { label: "Rename Box", icon: <Edit3 className="w-4 h-4"/>, onClick: () => handleRenameBox(body) },
         { label: "Delete Box", icon: <Trash2 className="w-4 h-4"/>, danger: true, onClick: () => handleDeleteBoxRequest(body) }
       ]
    });
  };

  const handleRenameBox = (body) => {
    setHomePromptDialog({
       title: "Rename Box",
       defaultValue: body.name,
       onConfirm: async (newName) => {
          const categoryDataToSave = {
              id: body.id,
              name: newName,
              color: body.color,
              theme: body.theme,
              iconName: body.iconName || Object.keys(ICON_MAP).find(k => ICON_MAP[k] === body.icon) || 'Folder',
              deleted: false
          };
          if (user && !authError) {
             try { await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'categories', body.id), categoryDataToSave, { merge: true }); }
             catch (err) { console.error("Rename failed", err); }
          } else {
             // Local Fallback
             setCustomCategories(prev => {
                const existingIdx = prev.findIndex(c => c.id === body.id);
                if(existingIdx >= 0) {
                   const newCats = [...prev];
                   newCats[existingIdx] = { ...newCats[existingIdx], name: newName };
                   return newCats;
                }
                return [...prev, categoryDataToSave];
             });
          }
       }
    });
  };

  const handleDeleteBoxRequest = (body) => {
    setTypeToDeleteDialog({
       title: "Delete Box",
       message: `To confirm deletion of "${body.name}", please type "delete" below.`,
       onConfirm: async () => {
          if (user && !authError) {
             try { await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'categories', body.id), { deleted: true }, { merge: true }); }
             catch (err) { console.error("Delete failed", err); }
          } else {
             // Local Fallback
             setCustomCategories(prev => {
                const existingIdx = prev.findIndex(c => c.id === body.id);
                if(existingIdx >= 0) {
                   const newCats = [...prev];
                   newCats[existingIdx] = { ...newCats[existingIdx], deleted: true };
                   return newCats;
                }
                return [...prev, { id: body.id, deleted: true }];
             });
          }
       }
    });
  };

  const getProjectCount = (bodyId) => allProjects.filter(p => p.localBodyId === bodyId).length;

  // Combine static initial bodies with dynamically created/modified ones from Firestore
  const displayBodiesMap = new Map();
  INITIAL_LOCAL_BODIES.forEach(b => displayBodiesMap.set(b.id, b));
  
  customCategories.forEach(cat => {
    if (cat.deleted) {
       displayBodiesMap.delete(cat.id);
    } else {
       const existing = displayBodiesMap.get(cat.id);
       displayBodiesMap.set(cat.id, { 
           ...(existing || {}), 
           ...cat, 
           icon: ICON_MAP[cat.iconName] || existing?.icon || Folder 
       });
    }
  });
  
  const displayBodies = Array.from(displayBodiesMap.values());

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col overflow-hidden" style={{ fontFamily: "'Sora', 'Noto Serif Malayalam', sans-serif" }}>
      <header className="bg-white shadow-sm shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 sm:gap-3">
            <MapIcon className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-600" />
            Tanur Projects Tracker
          </h1>
          
          {authError ? (
            <button 
              onClick={() => setShowSetupGuide(true)}
              className="flex items-center gap-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1.5 rounded-full shadow-sm animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Setup Needed
            </button>
          ) : (
            <span className="text-[10px] sm:text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-800 px-2.5 py-1.5 rounded-full">
              Connected to Cloud DB
            </span>
          )}
        </div>
      </header>

      {/* Auth Setup Guide Overlay */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowSetupGuide(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <div className="text-amber-500 mb-4"><AlertTriangle className="w-12 h-12" /></div>
            <h3 className="text-lg font-bold text-slate-900">Enable Anonymous Sign-In</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">Your Firebase Auth settings are blocking guest logins.</p>
            <ol className="mt-4 space-y-3 text-xs text-slate-700 list-decimal pl-5 font-medium">
              <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold">Firebase Console</a>.</li>
              <li>Go to Authentication &gt; Sign-in method tab.</li>
              <li>Add <strong>Anonymous</strong> provider and Enable it.</li>
            </ol>
            <button onClick={() => setShowSetupGuide(false)} className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm">Got it!</button>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddingCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsAddingCategoryModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Folder className="w-5 h-5 text-indigo-600"/> Add New Box</h3>
            <form onSubmit={handleCreateCategory}>
              <input
                type="text"
                autoFocus
                placeholder="e.g., Ernakulam Office, Meetings..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 text-sm sm:text-base font-medium"
              />
              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors shadow-sm active:scale-[0.98]"
              >
                Create Box
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Home Action Menu (Rename/Delete Box) */}
      {homeActionMenu && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setHomeActionMenu(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">{homeActionMenu.title}</h3>
              <button onClick={() => setHomeActionMenu(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {homeActionMenu.options.map((opt, i) => (
                <button key={i} onClick={() => { setHomeActionMenu(null); opt.onClick(); }} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${opt.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Home Prompt Dialog (Rename Box) */}
      {homePromptDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setHomePromptDialog(null)}>
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{homePromptDialog.title}</h3>
            <input autoFocus type="text" className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4" defaultValue={homePromptDialog.defaultValue} id="homePromptInput"/>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setHomePromptDialog(null)} className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 text-sm">Cancel</button>
              <button onClick={() => { const val = document.getElementById('homePromptInput').value; if(val.trim()) { homePromptDialog.onConfirm(val.trim()); setHomePromptDialog(null); } }} className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Type to Delete Dialog */}
      {typeToDeleteDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setTypeToDeleteDialog(null)}>
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-red-500 mb-4"><AlertTriangle className="w-10 h-10" /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{typeToDeleteDialog.title}</h3>
            <p className="text-sm text-slate-600 mb-4">{typeToDeleteDialog.message}</p>
            <input 
              autoFocus
              type="text"
              placeholder="Type 'delete' here..."
              onChange={(e) => {
                const btn = document.getElementById('confirmTypeDeleteBtn');
                if (btn) btn.disabled = e.target.value.toLowerCase() !== 'delete';
              }}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setTypeToDeleteDialog(null)} className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 text-sm">Cancel</button>
              <button 
                id="confirmTypeDeleteBtn"
                disabled
                onClick={() => { typeToDeleteDialog.onConfirm(); setTypeToDeleteDialog(null); }} 
                className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col items-center">
        {authError && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl max-w-7xl w-full flex justify-between items-center">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span><strong>Connected Anonymously:</strong> A custom token error occurred, running in local fallback.</span>
            </span>
          </div>
        )}

        <div className="max-w-7xl w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 pb-6">
          {displayBodies.map((body) => {
            const IconComponent = body.icon;
            return (
              <LongPressable 
                as="div"
                key={body.id} 
                delay={4000}
                onLongPress={() => handleBoxLongPress(body)}
                onClick={() => handleOpenBody(body)} 
                className={`relative overflow-hidden rounded-xl cursor-pointer group bg-gradient-to-br ${body.color} p-3 sm:p-5 text-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between min-h-[110px] sm:min-h-[140px]`}
              >
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start">
                    <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                      <IconComponent className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] sm:text-xs font-semibold">
                        {getProjectCount(body.id)} Projects
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-5">
                    <h2 className="text-sm sm:text-lg lg:text-xl font-bold leading-tight line-clamp-2">{body.name}</h2>
                  </div>
                </div>
              </LongPressable>
            );
          })}
        </div>

        {/* Minimal Add Box Button */}
        <button 
          onClick={() => setIsAddingCategoryModalOpen(true)} 
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-full shadow-sm hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md transition-all text-xs sm:text-sm font-semibold mb-6 group"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" /> Add New Box
        </button>

      </main>

      <footer className="shrink-0 pb-2 text-center text-[9px] sm:text-[10px] font-light text-slate-400/50 pointer-events-none select-none bg-slate-50">
        DB: imbrushanartslab@gmail.com &nbsp;|&nbsp; Img: Claudinary_pathinanchamathemail@gmail.com
      </footer>

      {activeBody && (
        <ProjectModal 
          body={activeBody} 
          onClose={handleCloseBody}
          projects={allProjects.filter(p => p.localBodyId === activeBody.id)}
          onAddProject={(name) => handleAddProject(activeBody.id, name)}
          user={user}
          authError={authError}
          localUpdates={localUpdates}
          setLocalUpdates={setLocalUpdates}
          setAllProjects={setAllProjects}
        />
      )}
    </div>
  );
}

function ProjectModal({ body, onClose, projects, onAddProject, user, authError, localUpdates, setLocalUpdates, setAllProjects }) {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [allUpdates, setAllUpdates] = useState([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false);

  const [actionMenu, setActionMenu] = useState(null); 
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!user || authError) {
      setAllUpdates(localUpdates);
      return;
    }

    setIsLoadingUpdates(true);
    const updatesRef = collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates');
    
    const unsubscribe = onSnapshot(updatesRef, (snapshot) => {
      const updatesData = [];
      snapshot.forEach(doc => {
        updatesData.push({ id: doc.id, ...doc.data() });
      });
      setAllUpdates(updatesData);
      setIsLoadingUpdates(false);
    }, (error) => {
      console.error("Error fetching updates:", error);
      setIsLoadingUpdates(false);
    });

    return () => unsubscribe();
  }, [user, authError, localUpdates]);

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onAddProject(newProjectName);
    setNewProjectName('');
    setIsAddingProject(false);
  };

  const IconComponent = body.icon || Folder;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className={`p-4 sm:p-6 bg-gradient-to-r ${body.color} text-white flex justify-between items-center shrink-0`}>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
              <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 opacity-80" />
              {body.name}
            </h2>
            <p className="mt-1 text-white/80 font-medium text-xs sm:text-sm">Manage and track local development projects.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setIsAddingProject(!isAddingProject)} className="p-2 sm:p-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-full transition-transform hover:scale-105 shadow-md">
              <Plus className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${isAddingProject ? 'rotate-45' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 sm:p-2.5 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-sm">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          {isAddingProject && (
            <div className="mb-5 sm:mb-6 animate-in slide-in-from-top-2">
              <form onSubmit={handleCreateProject} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
                <input type="text" autoFocus placeholder="Enter project name..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm sm:text-base"/>
                <button type="submit" disabled={!newProjectName.trim()} className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm sm:text-base">Create</button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-base sm:text-lg">No projects added yet.</p>
              </div>
            ) : (
              projects.map((project, index) => (
                <ProjectAccordion 
                  key={project.id} project={project} theme={body.theme} index={index} user={user} authError={authError}
                  allUpdates={allUpdates.filter(u => u.projectId === project.id)} localUpdates={localUpdates.filter(u => u.projectId === project.id)}
                  isLoadingUpdates={isLoadingUpdates} setLocalUpdates={setLocalUpdates} setAllProjects={setAllProjects}
                  setActionMenu={setActionMenu} setConfirmDialog={setConfirmDialog} setPromptDialog={setPromptDialog}
                />
              ))
            )}
          </div>
        </div>

        {actionMenu && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setActionMenu(null)}>
            <div className="bg-white w-full sm:max-w-sm rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">{actionMenu.title}</h3>
                <button onClick={() => setActionMenu(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500"><X className="w-4 h-4"/></button>
              </div>
              <div className="p-2 flex flex-col gap-1">
                {actionMenu.options.map((opt, i) => (
                  <button key={i} onClick={() => { setActionMenu(null); opt.onClick(); }} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${opt.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {confirmDialog && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setConfirmDialog(null)}>
            <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-red-500 mb-4"><AlertTriangle className="w-10 h-10" /></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-600 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 text-sm">Cancel</button>
                <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white text-sm">Confirm</button>
              </div>
            </div>
          </div>
        )}

        {promptDialog && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setPromptDialog(null)}>
            <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900 mb-4">{promptDialog.title}</h3>
              <textarea autoFocus className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[100px]" defaultValue={promptDialog.defaultValue} id="promptInput"/>
              <div className="flex gap-3 justify-end mt-4">
                <button onClick={() => setPromptDialog(null)} className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 text-sm">Cancel</button>
                <button onClick={() => { const val = document.getElementById('promptInput').value; if(val.trim()) { promptDialog.onConfirm(val.trim()); setPromptDialog(null); } }} className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectAccordion({ project, theme, index, user, authError, allUpdates, localUpdates, isLoadingUpdates, setLocalUpdates, setAllProjects, setActionMenu, setConfirmDialog, setPromptDialog }) {
  const [isOpen, setIsOpen] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  // States specifically for Full Editing an Update
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [editUpdateText, setEditUpdateText] = useState('');
  const [editAttachments, setEditAttachments] = useState([]);
  const [isEditUploading, setIsEditUploading] = useState(false);
  const editFileInputRef = useRef(null);

  const fileInputRef = useRef(null);
  const isSavingRef = useRef(false);

  const themeStyles = THEME_MAP[theme] || THEME_MAP.indigo;
  const cardColorClass = index % 2 === 0 ? themeStyles.light : themeStyles.dark;

  const toggleAccordion = () => setIsOpen(!isOpen);

  // --- Handlers for ADDING NEW updates ---
  const handleFileChange = async (e) => {
    setUploadError(null);
    const files = Array.from(e.target.files);
    let newFiles = [];
    let errorDetected = null;
    
    for (const file of files) {
      try {
        if (file.type === 'application/pdf') {
          if (file.size > 2097152) {
            errorDetected = `The PDF "${file.name}" is larger than 2MB. Please upload a smaller file.`;
            continue;
          }
          const base64Data = await fileToBase64(file);
          newFiles.push({ type: 'pdf', data: base64Data, name: file.name });
        } else if (file.type.startsWith('image/')) {
          const compressedBase64 = await compressImage(file);
          newFiles.push({ type: 'image', data: compressedBase64, name: file.name });
        } else {
          errorDetected = `Unsupported file type: ${file.name}`;
        }
      } catch (err) {
        console.error("Failed to process file", err);
      }
    }

    if (errorDetected) setUploadError(errorDetected);
    setAttachments(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (indexToRemove) => setAttachments(prev => prev.filter((_, i) => i !== indexToRemove));

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if ((!updateText.trim() && attachments.length === 0) || isSavingRef.current) return;
    
    isSavingRef.current = true;
    setIsUploading(true);
    setUploadError(null);
    
    const updateId = `upd_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;

    try {
      let finalAttachments = [];
      if (user && !authError) {
        if (attachments.length > 0) {
          const uploadPromises = attachments.map((att) => 
            uploadToCloudinary(att.data).then(url => ({
               type: att.type,
               url: url,
               name: att.name
            })).catch(err => {
              console.warn("Cloudinary upload failed, falling back to base64", err);
              return { type: att.type, url: att.data, name: att.name }; 
            })
          );
          finalAttachments = await Promise.all(uploadPromises);
        }

        const newUpdate = {
          id: updateId,
          projectId: project.id,
          text: updateText,
          attachments: finalAttachments,
          timestamp: new Date().toISOString()
        };

        const updateDocRef = doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', updateId);
        const projectMetaRef = doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id);

        await Promise.all([
          setDoc(updateDocRef, newUpdate),
          updateDoc(projectMetaRef, { updateCount: (project.updateCount || 0) + 1 })
        ]);

      } else {
        throw new Error("No Auth, bypassing to local storage.");
      }
    } catch (err) {
      console.warn("Cloud sync failed/timed-out, saved data locally instead:", err);
      const newUpdate = {
        id: updateId, projectId: project.id, text: updateText,
        attachments: attachments.map(att => ({ type: att.type, url: att.data, name: att.name })), 
        timestamp: new Date().toISOString()
      };
      setLocalUpdates(prev => [newUpdate, ...prev]);
      setAllProjects(prev => prev.map(p => p.id === project.id ? { ...p, updateCount: (p.updateCount || 0) + 1 } : p));
    } finally {
      setUpdateText('');
      setAttachments([]);
      isSavingRef.current = false;
      setIsUploading(false);
    }
  };

  // --- Handlers for FULL EDITING existing updates ---
  const startEditing = (update) => {
    setEditingUpdateId(update.id);
    setEditUpdateText(update.text || '');
    
    let existingAtts = [];
    if (update.images) {
      existingAtts = [...existingAtts, ...update.images.map(url => ({ type: 'image', url: url, isExisting: true }))];
    }
    if (update.attachments) {
      existingAtts = [...existingAtts, ...update.attachments.map(att => ({ ...att, isExisting: true }))];
    }
    setEditAttachments(existingAtts);
  };

  const cancelEditing = () => {
    setEditingUpdateId(null);
    setEditUpdateText('');
    setEditAttachments([]);
  };

  const handleEditFileChange = async (e) => {
    const files = Array.from(e.target.files);
    let newFiles = [];
    
    for (const file of files) {
      try {
        if (file.type === 'application/pdf') {
          if (file.size > 2097152) continue; // skip large PDFs
          const base64Data = await fileToBase64(file);
          newFiles.push({ type: 'pdf', data: base64Data, name: file.name, isExisting: false });
        } else if (file.type.startsWith('image/')) {
          const compressedBase64 = await compressImage(file);
          newFiles.push({ type: 'image', data: compressedBase64, name: file.name, isExisting: false });
        }
      } catch (err) {
        console.error("Failed to process edit file", err);
      }
    }
    setEditAttachments(prev => [...prev, ...newFiles]);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const removeEditAttachment = (indexToRemove) => setEditAttachments(prev => prev.filter((_, i) => i !== indexToRemove));

  const submitEdit = async (e) => {
    e.preventDefault();
    if ((!editUpdateText.trim() && editAttachments.length === 0) || isEditUploading) return;
    setIsEditUploading(true);

    try {
      let finalAttachments = [];
      if (user && !authError) {
        const uploadPromises = editAttachments.map(att => {
          if (att.isExisting) return Promise.resolve({ type: att.type, url: att.url, name: att.name });
          return uploadToCloudinary(att.data).then(url => ({ type: att.type, url: url, name: att.name }))
            .catch(err => ({ type: att.type, url: att.data, name: att.name }));
        });
        finalAttachments = await Promise.all(uploadPromises);

        await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', editingUpdateId), {
          text: editUpdateText,
          attachments: finalAttachments,
          images: [] // Wipe legacy images array as they are now in attachments
        });
      } else {
        // Local fallback
        finalAttachments = editAttachments.map(att => att.isExisting ? att : { type: att.type, url: att.data, name: att.name });
        setLocalUpdates(prev => prev.map(u => u.id === editingUpdateId ? { ...u, text: editUpdateText, attachments: finalAttachments, images: [] } : u));
      }
    } catch (e) {
      console.error("Full edit failed:", e);
    } finally {
      setIsEditUploading(false);
      setEditingUpdateId(null);
    }
  };

  // --- Utility actions ---
  const handleEditProject = () => {
    setPromptDialog({
      title: "Edit Project Name",
      defaultValue: project.name,
      onConfirm: async (newName) => {
        setAllProjects(prev => prev.map(p => p.id === project.id ? { ...p, name: newName } : p));
        if (user && !authError) {
          try { await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id), { name: newName }); } 
          catch (e) { console.error("Edit failed:", e); }
        }
      }
    });
  };

  const handleDeleteProject = () => {
    setConfirmDialog({
      title: "Delete Project",
      message: "Are you sure you want to delete this project? This will permanently hide it.",
      onConfirm: async () => {
        setAllProjects(prev => prev.filter(p => p.id !== project.id));
        if (user && !authError) {
          try { await deleteDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id)); } 
          catch (e) { console.error("Delete failed:", e); }
        }
      }
    });
  };

  const handleDeleteUpdate = (update) => {
    setConfirmDialog({
      title: "Delete Update",
      message: "Are you sure you want to delete this timeline update from the database?",
      onConfirm: async () => {
        setLocalUpdates(prev => prev.filter(u => u.id !== update.id));
        setAllProjects(prev => prev.map(p => p.id === project.id ? { ...p, updateCount: Math.max(0, (p.updateCount || 0) - 1) } : p));

        if (user && !authError) {
          try {
            await deleteDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', update.id));
            await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id), {
              updateCount: Math.max(0, (project.updateCount || 0) - 1)
            });
          } catch (e) { console.error("Delete update failed:", e); }
        }
      }
    });
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const combinedUpdates = [...allUpdates];
  if (localUpdates && localUpdates.length > 0) {
    localUpdates.forEach(localUpd => {
      if (!combinedUpdates.some(u => u.id === localUpd.id)) combinedUpdates.push(localUpd);
    });
  }
  const sortedUpdates = combinedUpdates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${cardColorClass}`}>
      <LongPressable 
        as="button"
        onLongPress={() => setActionMenu({ title: "Project Options", options: [{ label: "Edit Project Name", icon: <Edit3 className="w-4 h-4"/>, onClick: handleEditProject }, { label: "Delete Project", icon: <Trash2 className="w-4 h-4"/>, danger: true, onClick: handleDeleteProject }]})}
        onClick={toggleAccordion}
        className="w-full px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between bg-transparent hover:bg-black/5 transition-colors text-left select-none touch-manipulation cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/60 shadow-sm hidden sm:block"><FileText className={`w-5 h-5 ${themeStyles.text}`} /></div>
          <div>
            <h3 className={`text-sm sm:text-base font-bold ${themeStyles.text}`}>{project.name}</h3>
            <p className="text-[10px] sm:text-xs opacity-70 font-medium mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(project.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-[10px] sm:text-xs font-semibold bg-white/70 px-2 py-1 rounded-full shadow-sm">{project.updateCount || 0} Updates</span>
          <div className={`p-1 rounded-full bg-white/70 shadow-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}><ChevronDown className="w-4 h-4" /></div>
        </div>
      </LongPressable>

      {isOpen && (
        <div className="border-t border-black/5 bg-white/60 backdrop-blur-sm p-3 sm:p-5 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm mb-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Add Update</h4>
            {uploadError && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{uploadError}</span></div>}
            <form onSubmit={handleSaveUpdate}>
              <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-y text-sm text-slate-700" placeholder="What's the latest update?" value={updateText} onChange={(e) => setUpdateText(e.target.value)} disabled={isUploading}/>
              {attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((file, i) => (
                    <div key={i} className="relative inline-block rounded-md overflow-hidden border border-slate-200 shadow-sm group">
                      {file.type === 'pdf' ? <div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-100 flex items-center justify-center"><FileText className="w-6 h-6 text-red-500" /></div> : <img src={file.data} alt={`Preview ${i}`} className="h-10 w-10 sm:h-12 sm:w-12 object-cover bg-slate-100" />}
                      <button type="button" onClick={() => removeAttachment(i)} disabled={isUploading} className="absolute top-0.5 right-0.5 bg-slate-900/60 text-white p-0.5 rounded-full hover:bg-red-500 disabled:opacity-50"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div>
                  <input type="file" accept="image/*,application/pdf" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} disabled={isUploading} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-2 rounded-md disabled:opacity-50"><Paperclip className="w-3.5 h-3.5" /> Attach Images / PDF</button>
                </div>
                <button type="submit" disabled={(!updateText.trim() && attachments.length === 0) || isUploading} className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-md font-semibold text-xs sm:text-sm">
                  {isUploading ? <>Uploading... <Loader2 className="w-3.5 h-3.5 animate-spin" /></> : <>Save <Send className="w-3.5 h-3.5" /></>}
                </button>
              </div>
            </form>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> History</h4>
            {isLoadingUpdates ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /><span className="text-xs font-medium">Loading timeline...</span></div>
            ) : sortedUpdates.length === 0 ? (
              <p className="text-slate-500 italic text-xs text-center py-3">No updates yet.</p>
            ) : (
              <div className="relative border-l-2 border-slate-300 ml-2 md:ml-3 space-y-4 sm:space-y-6 pb-2">
                {sortedUpdates.map((update) => (
                  <div key={update.id} className="relative pl-5 sm:pl-8">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm z-10 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div></div>
                    
                    {/* Full Edit Mode Inline Form */}
                    {editingUpdateId === update.id ? (
                      <div className="bg-indigo-50/60 p-3 sm:p-4 rounded-xl shadow-inner border border-indigo-100 animate-in fade-in zoom-in-95">
                        <h5 className="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1"><Edit3 className="w-3.5 h-3.5"/> Edit Update</h5>
                        <form onSubmit={submitEdit}>
                          <textarea 
                            className="w-full bg-white border border-indigo-200 rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y text-sm text-slate-700" 
                            value={editUpdateText} 
                            onChange={(e) => setEditUpdateText(e.target.value)} 
                            disabled={isEditUploading}
                          />
                          {editAttachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {editAttachments.map((file, i) => (
                                <div key={i} className="relative inline-block rounded-md overflow-hidden border border-indigo-200 shadow-sm group">
                                  {file.type === 'pdf' ? (
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white flex items-center justify-center"><FileText className="w-6 h-6 text-red-500" /></div>
                                  ) : (
                                    <img src={file.url || file.data} alt={`Edit Preview ${i}`} className="h-10 w-10 sm:h-12 sm:w-12 object-cover bg-white" />
                                  )}
                                  <button type="button" onClick={() => removeEditAttachment(i)} disabled={isEditUploading} className="absolute top-0.5 right-0.5 bg-slate-900/60 text-white p-0.5 rounded-full hover:bg-red-500 disabled:opacity-50"><X className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <input type="file" accept="image/*,application/pdf" multiple className="hidden" ref={editFileInputRef} onChange={handleEditFileChange} disabled={isEditUploading} />
                              <button type="button" onClick={() => editFileInputRef.current?.click()} disabled={isEditUploading} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-md transition-colors"><Paperclip className="w-3.5 h-3.5" /> Add Files</button>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <button type="button" onClick={cancelEditing} disabled={isEditUploading} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-2">Cancel</button>
                              <button type="submit" disabled={isEditUploading} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-semibold text-xs transition-colors">
                                {isEditUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <LongPressable
                        onLongPress={() => setActionMenu({ title: "Update Options", options: [
                          { label: "Edit Update", icon: <Edit3 className="w-4 h-4"/>, onClick: () => startEditing(update) }, 
                          { label: "Delete Update", icon: <Trash2 className="w-4 h-4"/>, danger: true, onClick: () => handleDeleteUpdate(update) }
                        ]})}
                        className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 select-none touch-manipulation hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded flex-shrink-0"><CheckCircle2 className="w-3 h-3" /> Published</span>
                          <span className="text-[10px] sm:text-xs font-medium text-slate-400">{formatDate(update.timestamp)} • {formatTime(update.timestamp)}</span>
                        </div>
                        {update.text && <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">{update.text}</div>}
                        {( (update.images && update.images.length > 0) || (update.attachments && update.attachments.length > 0) ) && (
                          <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                            {update.images && update.images.map((imgUrl, i) => (
                              <button key={`legacy-${i}`} onClick={() => setExpandedImage(imgUrl)} className="relative group flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md overflow-hidden shadow-sm hover:shadow-md h-10 w-10 sm:h-14 sm:w-14">
                                <img src={imgUrl} alt={`Attachment ${i}`} className="w-full h-full object-cover pointer-events-none" />
                              </button>
                            ))}
                            {update.attachments && update.attachments.map((att, i) => {
                              if (att.type === 'pdf') {
                                return (
                                  <div key={`att-${i}`} className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-2 rounded-lg group max-w-full">
                                    <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-semibold text-red-700 hover:text-red-800 underline truncate max-w-[150px] sm:max-w-[200px]" onClick={e => e.stopPropagation()}>{att.name || "Document.pdf"}</a>
                                  </div>
                                );
                              } else {
                                return (
                                  <button key={`att-${i}`} onClick={() => setExpandedImage(att.url)} className="relative group flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md overflow-hidden shadow-sm hover:shadow-md h-10 w-10 sm:h-14 sm:w-14">
                                    <img src={att.url} alt={`Attachment ${i}`} className="w-full h-full object-cover pointer-events-none" />
                                  </button>
                                );
                              }
                            })}
                          </div>
                        )}
                      </LongPressable>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FIXED IMAGE POPUP WITH EXPLICIT CLOSE BUTTON */}
      {expandedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setExpandedImage(null)}>
          <button 
            onClick={() => setExpandedImage(null)} 
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[110] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors shadow-lg"
            title="Close Image"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-5xl w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={expandedImage} alt="Expanded Attachment" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
