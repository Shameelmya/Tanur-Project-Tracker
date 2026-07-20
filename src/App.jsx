import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Building2, Map as MapIcon, MapPin, Tent, Trees, Home, 
  X, Plus, ChevronDown, Image as ImageIcon, 
  Send, Calendar, Clock, CheckCircle2, FileText, Loader2, AlertTriangle, HelpCircle,
  Edit3, Trash2, Paperclip, User, Users, Folder, Star, Zap, CheckSquare,
  ArrowLeft, MoveRight, Briefcase, FolderTree, Settings, Download, Upload, Copy
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, getDocs } from "firebase/firestore";

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

const CANVAS_APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'tanur-tracker-default';

// --- CLOUDINARY UPLOAD FUNCTION ---
const uploadToCloudinary = async (fileData) => {
  const cloudName = 'davoje7p5'; 
  const uploadPreset = 'tanur_preset'; 
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const formData = new FormData();
  formData.append('file', fileData);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(url, { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Upload to Cloudinary failed');
  const data = await response.json();
  return data.secure_url; 
};

const ICON_MAP = {
  Building2, Map: MapIcon, MapPin, Tent, Trees, Home, User, Users, AlertTriangle, Star, FileText, Folder, Briefcase, FolderTree
};

// --- DATA STRUCTURES ---
const INITIAL_MAIN_FOLDERS = [
  { id: 'mf_local_bodies', name: 'Local Bodies', color: 'from-indigo-500 to-purple-600', theme: 'indigo', iconName: 'Building2' },
  { id: 'mf_trivandrum', name: 'Trivandrum', color: 'from-cyan-500 to-blue-700', theme: 'blue', iconName: 'MapPin' },
  { id: 'mf_departments', name: 'Departments', color: 'from-emerald-400 to-green-600', theme: 'emerald', iconName: 'Briefcase' },
  { id: 'mf_priority', name: 'Priority', color: 'from-red-500 to-rose-700', theme: 'rose', iconName: 'AlertTriangle' },
  { id: 'mf_personal', name: 'Personal', color: 'from-violet-500 to-fuchsia-600', theme: 'fuchsia', iconName: 'User' },
  { id: 'mf_common', name: 'Common', color: 'from-slate-500 to-slate-700', theme: 'slate', iconName: 'Users' },
];

const INITIAL_SUB_FOLDERS = [
  // All default assigned to Local Bodies as requested
  { id: 'priority', mainFolderId: 'mf_local_bodies', name: 'Priority Files', color: 'from-red-500 to-rose-700', theme: 'rose', iconName: 'AlertTriangle' },
  { id: 'tanur', mainFolderId: 'mf_local_bodies', name: 'Tanur Municipality', color: 'from-indigo-500 to-purple-600', theme: 'indigo', iconName: 'Building2' },
  { id: 'ozhur', mainFolderId: 'mf_local_bodies', name: 'Ozhur', color: 'from-emerald-400 to-green-600', theme: 'emerald', iconName: 'Trees' },
  { id: 'cheriyamundam', mainFolderId: 'mf_local_bodies', name: 'Cheriyamundam', color: 'from-blue-400 to-cyan-600', theme: 'blue', iconName: 'MapIcon' },
  { id: 'ponmundam', mainFolderId: 'mf_local_bodies', name: 'Ponmundam', color: 'from-amber-400 to-orange-500', theme: 'amber', iconName: 'Tent' },
  { id: 'tanalur', mainFolderId: 'mf_local_bodies', name: 'Tanalur', color: 'from-rose-400 to-pink-600', theme: 'rose', iconName: 'Home' },
  { id: 'niramaruthur', mainFolderId: 'mf_local_bodies', name: 'Niramaruthur', color: 'from-teal-400 to-emerald-500', theme: 'teal', iconName: 'MapPin' },
  { id: 'personal', mainFolderId: 'mf_local_bodies', name: 'Personal', color: 'from-violet-500 to-fuchsia-600', theme: 'fuchsia', iconName: 'User' },
  { id: 'common', mainFolderId: 'mf_local_bodies', name: 'Common', color: 'from-slate-500 to-slate-700', theme: 'slate', iconName: 'Users' },
  { id: 'trivandrum', mainFolderId: 'mf_local_bodies', name: 'Trivandrum Office', color: 'from-blue-500 to-cyan-600', theme: 'blue', iconName: 'Building2' },
  { id: 'pwd_bridges', mainFolderId: 'mf_local_bodies', name: 'PWD Bridges', color: 'from-amber-400 to-orange-500', theme: 'amber', iconName: 'Folder' },
  { id: 'mla_sdf_a', mainFolderId: 'mf_local_bodies', name: 'MLA SDF A', color: 'from-violet-500 to-fuchsia-600', theme: 'fuchsia', iconName: 'Folder' },
  { id: 'pwd_building', mainFolderId: 'mf_local_bodies', name: 'PWD Building', color: 'from-blue-500 to-cyan-600', theme: 'blue', iconName: 'Folder' },
  { id: 'pwd_roads', mainFolderId: 'mf_local_bodies', name: 'PWD Roads', color: 'from-blue-500 to-cyan-600', theme: 'blue', iconName: 'Folder' },
  { id: 'kifbi', mainFolderId: 'mf_local_bodies', name: 'KIFBI', color: 'from-amber-400 to-orange-500', theme: 'amber', iconName: 'Folder' },
  { id: 'harbour_work', mainFolderId: 'mf_local_bodies', name: 'Harbour Work', color: 'from-violet-500 to-fuchsia-600', theme: 'fuchsia', iconName: 'Folder' },
  { id: 'irrigation_work', mainFolderId: 'mf_local_bodies', name: 'Irrigation Work', color: 'from-amber-400 to-orange-500', theme: 'amber', iconName: 'Folder' },
  { id: 'sports_foundation_kerala', mainFolderId: 'mf_local_bodies', name: 'Sports Foundation Kerala', color: 'from-violet-500 to-fuchsia-600', theme: 'fuchsia', iconName: 'Folder' },
  { id: 'kscadc', mainFolderId: 'mf_local_bodies', name: 'KSCADC', color: 'from-amber-400 to-orange-500', theme: 'amber', iconName: 'Folder' },
  { id: 'frw_flood_work', mainFolderId: 'mf_local_bodies', name: 'FRW (FLOOD WORK)', color: 'from-amber-400 to-orange-500', theme: 'amber', iconName: 'Folder' },
  { id: 'cmlrrp', mainFolderId: 'mf_local_bodies', name: 'CMLRRP', color: 'from-rose-400 to-pink-600', theme: 'rose', iconName: 'Folder' },
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

// --- UPDATED LONG PRESS HOOK WITH SCROLL CANCELLATION ---
const useLongPress = (callback, ms = 2500) => {
  const timerRef = useRef();
  const isLongPress = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const start = useCallback((e) => {
    isLongPress.current = false;
    
    // Track where the press started
    if (e.touches && e.touches.length > 0) {
      startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.clientX !== undefined) {
      startPos.current = { x: e.clientX, y: e.clientY };
    }

    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      callback(e);
    }, ms);
  }, [callback, ms]);

  const move = useCallback((e) => {
    if (timerRef.current) {
      let currentPos = { x: 0, y: 0 };
      
      // Calculate current position during movement
      if (e.touches && e.touches.length > 0) {
        currentPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.clientX !== undefined) {
        currentPos = { x: e.clientX, y: e.clientY };
      } else {
        return; // Exit if we can't get coordinates
      }
      
      // Calculate distance moved from original touch point
      const dx = currentPos.x - startPos.current.x;
      const dy = currentPos.y - startPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If user moved finger more than 15px (e.g. they are scrolling), cancel the long press
      if (distance > 15) {
         clearTimeout(timerRef.current);
         timerRef.current = null;
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
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
    onMouseDown: start, onMouseUp: stop, onMouseLeave: stop, onMouseMove: move,
    onTouchStart: start, onTouchEnd: stop, onTouchMove: move,
    onClickHandler
  };
};

const LongPressable = ({ onLongPress, onClick, delay = 2000, children, className, as: Component = 'div', ...props }) => {
  const longPressEvent = useLongPress(onLongPress, delay);
  return (
    <Component
      {...props}
      onMouseDown={longPressEvent.onMouseDown} onMouseUp={longPressEvent.onMouseUp} onMouseLeave={longPressEvent.onMouseLeave} onMouseMove={longPressEvent.onMouseMove}
      onTouchStart={longPressEvent.onTouchStart} onTouchEnd={longPressEvent.onTouchEnd} onTouchMove={longPressEvent.onTouchMove}
      onClick={(e) => longPressEvent.onClickHandler(e, onClick)}
      className={className}
    >
      {children}
    </Component>
  );
};

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280; const MAX_HEIGHT = 1280; 
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
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

// --- HELPER COMPONENTS FOR DIALOGS ---
function PromptDialog({ dialog, onClose }) {
  const [val, setVal] = useState(dialog.defaultValue || '');
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900 mb-4">{dialog.title}</h3>
        <input 
          autoFocus type="text" 
          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4" 
          value={val} onChange={(e) => setVal(e.target.value)} 
        />
        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 text-sm">Cancel</button>
          <button onClick={() => { if(val.trim()) { dialog.onConfirm(val.trim()); onClose(); } }} className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Save</button>
        </div>
      </div>
    </div>
  );
}

function TypeToDeleteDialog({ dialog, onClose }) {
  const [text, setText] = useState('');
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-red-500 mb-4"><AlertTriangle className="w-10 h-10" /></div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{dialog.title}</h3>
        <p className="text-sm text-slate-600 mb-4">{dialog.message}</p>
        <input
          autoFocus type="text" placeholder="Type 'delete' here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none mb-6"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 text-sm">Cancel</button>
          <button 
            disabled={text.toLowerCase() !== 'delete'} 
            onClick={() => { dialog.onConfirm(); onClose(); }} 
            className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm shadow-sm transition-colors"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Navigation State
  const [activeMainFolder, setActiveMainFolder] = useState(null);
  const [activeSubFolder, setActiveSubFolder] = useState(null);
  
  // Firebase & Auth State
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Data State
  const [allProjects, setAllProjects] = useState([]); 
  const [localUpdates, setLocalUpdates] = useState([]); 
  const [customMainFolders, setCustomMainFolders] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);

  // Modals & Dialogs
  const [isAddingMainFolderModalOpen, setIsAddingMainFolderModalOpen] = useState(false);
  const [isAddingCategoryModalOpen, setIsAddingCategoryModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  
  const [actionMenu, setActionMenu] = useState(null); 
  const [promptDialog, setPromptDialog] = useState(null);
  const [typeToDeleteDialog, setTypeToDeleteDialog] = useState(null);
  const [moveToDialog, setMoveToDialog] = useState(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [linkProjectData, setLinkProjectData] = useState(null);
  const [wuDayFolder, setWuDayFolder] = useState(null);

  const handleExportJSON = async () => {
    try {
      let updates = [];
      if (user && !authError) {
        const updatesSnap = await getDocs(collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates'));
        updatesSnap.forEach(document => updates.push({ id: document.id, ...document.data() }));
      } else {
        updates = localUpdates;
      }
      
      const exportData = {
        main_folders: customMainFolders,
        categories: customCategories,
        projects: allProjects,
        project_updates: updates
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "tanur_tracker_backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      setIsSettingsOpen(false);
    } catch (e) {
      console.error("Export failed", e);
      alert("Failed to export backup.");
    }
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (user && !authError) {
          if (importedData.main_folders) {
            for (const mf of importedData.main_folders) {
              await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'main_folders', mf.id), mf);
            }
          }
          if (importedData.categories) {
            for (const cat of importedData.categories) {
              await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'categories', cat.id), cat);
            }
          }
          if (importedData.projects) {
            for (const proj of importedData.projects) {
              await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', proj.id), proj);
            }
          }
          if (importedData.project_updates) {
            for (const upd of importedData.project_updates) {
              await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', upd.id), upd);
            }
          }
          alert("Import successful!");
        } else {
          if (importedData.main_folders) setCustomMainFolders(importedData.main_folders);
          if (importedData.categories) setCustomCategories(importedData.categories);
          if (importedData.projects) setAllProjects(importedData.projects);
          if (importedData.project_updates) setLocalUpdates(importedData.project_updates);
          alert("Local Import successful!");
        }
      } catch (err) {
        console.error(err);
        alert("Invalid JSON or import failed.");
      }
      e.target.value = '';
      setIsSettingsOpen(false);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600;700&family=Sora:wght@300;400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    if (!auth) { setAuthError("Firebase not initialized"); return; }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } 
          catch (e) { await signInAnonymously(auth); }
        } else { await signInAnonymously(auth); }
        setAuthError(null);
      } catch (error) { setAuthError(error.code || error.message); }
    };
    initAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (usr) => setUser(usr ? usr : null));
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || authError) return;

    const mainFoldersRef = collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'main_folders');
    const unsubMain = onSnapshot(mainFoldersRef, (snap) => {
      const data = []; snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setCustomMainFolders(data);
    });

    const categoriesRef = collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'categories');
    const unsubCat = onSnapshot(categoriesRef, (snap) => {
      const data = []; snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setCustomCategories(data);
    });

    const projectsRef = collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects');
    const unsubProj = onSnapshot(projectsRef, (snap) => {
      const data = []; snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllProjects(data);
    });

    return () => { unsubMain(); unsubCat(); unsubProj(); };
  }, [user, authError]);

  // Merge Default & Custom Data
  const displayMainFoldersMap = new Map();
  INITIAL_MAIN_FOLDERS.forEach(b => displayMainFoldersMap.set(b.id, b));
  customMainFolders.forEach(mf => {
    if (mf.deleted) displayMainFoldersMap.delete(mf.id);
    else displayMainFoldersMap.set(mf.id, { ...(displayMainFoldersMap.get(mf.id) || {}), ...mf, icon: ICON_MAP[mf.iconName] || FolderTree });
  });
  const displayMainFolders = Array.from(displayMainFoldersMap.values()).map(mf => ({ ...mf, icon: mf.icon || ICON_MAP[mf.iconName] || FolderTree }));

  // --- CRITICAL FIX FOR BACKWARD COMPATIBILITY ---
  const displayBodiesMap = new Map();
  INITIAL_SUB_FOLDERS.forEach(b => displayBodiesMap.set(b.id, b));
  customCategories.forEach(cat => {
    if (cat.deleted) displayBodiesMap.delete(cat.id);
    else {
      displayBodiesMap.set(cat.id, { 
        ...(displayBodiesMap.get(cat.id) || {}), 
        ...cat, 
        mainFolderId: cat.mainFolderId || 'mf_local_bodies', // Forces missing parents into Local Bodies
        icon: ICON_MAP[cat.iconName] || Folder 
      });
    }
  });
  const allSubFolders = Array.from(displayBodiesMap.values()).map(sb => ({ 
    ...sb, 
    mainFolderId: sb.mainFolderId || 'mf_local_bodies', // Double safety check
    icon: sb.icon || ICON_MAP[sb.iconName] || Folder 
  }));

  // Filter SubFolders based on active Main Folder
  const activeSubFolders = activeMainFolder ? allSubFolders.filter(f => f.mainFolderId === activeMainFolder.id) : [];

  const getProjectCountForSubFolder = (subId) => allProjects.filter(p => p.localBodyIds?.includes(subId)).length;
  const getProjectCountForMainFolder = (mainId) => {
    const subFolderIds = allSubFolders.filter(sf => sf.mainFolderId === mainId).map(sf => sf.id);
    return allProjects.filter(p => p.localBodyIds?.some(id => subFolderIds.includes(id))).length;
  };

  // --- ACTIONS ---
  const handleCreateMainFolder = async (e) => {
    e.preventDefault();
    if (!newNameInput.trim()) return;
    const style = getRandomStyle();
    const newMF = {
      id: `mf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: newNameInput.trim(), color: style.color, theme: style.theme, iconName: 'FolderTree',
      createdAt: new Date().toISOString(), deleted: false
    };
    setCustomMainFolders(prev => [...prev, newMF]);
    setIsAddingMainFolderModalOpen(false); setNewNameInput('');
    if (user && !authError) {
      try { await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'main_folders', newMF.id), newMF); } catch(err) { console.warn(err); }
    }
  };

  const handleCreateSubFolder = async (e) => {
    e.preventDefault();
    if (!newNameInput.trim() || !activeMainFolder) return;
    const style = getRandomStyle();
    const newSub = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      mainFolderId: activeMainFolder.id, name: newNameInput.trim(), color: style.color, theme: style.theme, iconName: 'Folder',
      createdAt: new Date().toISOString(), deleted: false
    };
    setCustomCategories(prev => [...prev, newSub]);
    setIsAddingCategoryModalOpen(false); setNewNameInput('');
    if (user && !authError) {
      try { await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'categories', newSub.id), newSub); } catch(err) { console.warn(err); }
    }
  };

  const handleAddProject = async (bodyIds, projectName) => {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const projectData = { id: projectId, localBodyIds: Array.isArray(bodyIds) ? bodyIds : [bodyIds], name: projectName, createdAt: new Date().toISOString(), updateCount: 0 };
    setAllProjects(prev => [projectData, ...prev]);
    if (user && !authError) {
      try { await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', projectId), projectData); } catch (err) { console.warn(err); }
    }
  };

  const executeMoveSubFolder = async (subFolderId, newMainFolderId) => {
    if (user && !authError) {
      try { await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'categories', subFolderId), { mainFolderId: newMainFolderId }, { merge: true }); }
      catch (err) { console.error("Move failed", err); }
    } else {
      setCustomCategories(prev => {
        const existingIdx = prev.findIndex(c => c.id === subFolderId);
        if(existingIdx >= 0) {
          const newCats = [...prev];
          newCats[existingIdx] = { ...newCats[existingIdx], mainFolderId: newMainFolderId };
          return newCats;
        }
        const initialMatch = INITIAL_SUB_FOLDERS.find(s => s.id === subFolderId);
        if (initialMatch) return [...prev, { ...initialMatch, mainFolderId: newMainFolderId }];
        return prev;
      });
    }
    setMoveToDialog(null);
  };

  // Generic Rename & Delete Logic
  const handleRename = (item, collectionName, localSetter) => {
    setPromptDialog({
       title: `Rename ${collectionName === 'main_folders' ? 'Main Folder' : 'Sub Folder'}`,
       defaultValue: item.name,
       onConfirm: async (newName) => {
          if (user && !authError) {
             try { await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', collectionName, item.id), { name: newName }, { merge: true }); } catch (err) { console.error(err); }
          } else {
             localSetter(prev => {
                const idx = prev.findIndex(c => c.id === item.id);
                if(idx >= 0) { const arr = [...prev]; arr[idx] = { ...arr[idx], name: newName }; return arr; }
                return [...prev, { ...item, name: newName }];
             });
          }
       }
    });
  };

  const handleSaveWuDay = async (folder, dayValue) => {
    const isMain = INITIAL_MAIN_FOLDERS.some(m => m.id === folder.id) || customMainFolders.some(m => m.id === folder.id);
    const collectionName = isMain ? 'main_folders' : 'categories';
    const setter = isMain ? setCustomMainFolders : setCustomCategories;
    
    setter(prev => {
      const idx = prev.findIndex(c => c.id === folder.id);
      if(idx >= 0) { const arr = [...prev]; arr[idx] = { ...arr[idx], wuDay: dayValue }; return arr; }
      return [...prev, { ...folder, wuDay: dayValue }];
    });

    if (user && !authError) {
      try { await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', collectionName, folder.id), { wuDay: dayValue }, { merge: true }); } catch (err) { console.error(err); }
    }
  };

  const handleDelete = (item, collectionName, localSetter) => {
    setTypeToDeleteDialog({
       title: `Delete ${collectionName === 'main_folders' ? 'Main Folder' : 'Sub Folder'}`,
       message: `Type "delete" below to confirm deletion of "${item.name}".`,
       onConfirm: async () => {
          if (user && !authError) {
             try { await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', collectionName, item.id), { deleted: true }, { merge: true }); } catch (err) { console.error(err); }
          } else {
             localSetter(prev => {
                const idx = prev.findIndex(c => c.id === item.id);
                if(idx >= 0) { const arr = [...prev]; arr[idx] = { ...arr[idx], deleted: true }; return arr; }
                return [...prev, { id: item.id, deleted: true }];
             });
          }
       }
    });
  };

  // Component Building Blocks
  const renderCard = (item, isMainFolder) => {
    const IconCmp = item.icon;
    const projectCount = isMainFolder ? getProjectCountForMainFolder(item.id) : getProjectCountForSubFolder(item.id);
    
    return (
      <LongPressable 
        as="div" key={item.id} delay={2000}
        onLongPress={() => {
          const options = [
            { label: "Rename", icon: <Edit3 className="w-4 h-4"/>, onClick: () => handleRename(item, isMainFolder ? 'main_folders' : 'categories', isMainFolder ? setCustomMainFolders : setCustomCategories) },
            { label: "Weekly Update Day", icon: <Calendar className="w-4 h-4"/>, onClick: () => setWuDayFolder(item) },
            { label: "Delete", icon: <Trash2 className="w-4 h-4"/>, danger: true, onClick: () => handleDelete(item, isMainFolder ? 'main_folders' : 'categories', isMainFolder ? setCustomMainFolders : setCustomCategories) }
          ];
          if (!isMainFolder) {
            options.splice(1, 0, { label: "Move To...", icon: <MoveRight className="w-4 h-4"/>, onClick: () => setMoveToDialog(item) });
          }
          setActionMenu({ title: `${isMainFolder ? 'Main Folder' : 'Sub Folder'} Options`, options });
        }}
        onClick={() => isMainFolder ? setActiveMainFolder(item) : setActiveSubFolder(item)} 
        className={`relative overflow-hidden rounded-xl cursor-pointer group bg-gradient-to-br ${item.color} p-3 sm:p-5 text-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between min-h-[110px] sm:min-h-[140px]`}
      >
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
              <IconCmp className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="text-right">
              <span className="inline-flex items-center justify-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] sm:text-xs font-semibold">
                {projectCount} Projects
              </span>
            </div>
          </div>
          <div className="mt-3 sm:mt-5">
            <h2 className="text-sm sm:text-lg lg:text-xl font-bold leading-tight line-clamp-2">{item.name}</h2>
          </div>
        </div>
      </LongPressable>
    );
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col overflow-hidden" style={{ fontFamily: "'Sora', 'Noto Serif Malayalam', sans-serif" }}>
      {/* Header */}
      <header className="bg-white shadow-sm shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {activeMainFolder && (
              <button onClick={() => setActiveMainFolder(null)} className="p-1.5 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <MapIcon className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-600" />
              {activeMainFolder ? activeMainFolder.name : "Tanur Projects Tracker"}
              {!activeMainFolder && (
                <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs font-bold bg-indigo-100 text-indigo-800 px-2 sm:px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3"/> {allProjects.length} Projects Total
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3 relative">
            <span className="text-[10px] sm:text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-800 px-2.5 py-1.5 rounded-full hidden md:block">
              Connected to Cloud DB
            </span>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors relative">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                <button onClick={handleExportJSON} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 text-left">
                  <Download className="w-4 h-4" /> Export Backup (JSON)
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 text-left">
                  <Upload className="w-4 h-4" /> Import Backup (JSON)
                </button>
                <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJSON} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col items-center">
        <div className="max-w-7xl w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 pb-6">
          {!activeMainFolder ? 
            displayMainFolders.map(mf => renderCard(mf, true)) : 
            activeSubFolders.map(sub => renderCard(sub, false))
          }
        </div>

        {/* Add Button */}
        <button 
          onClick={() => { setNewNameInput(''); !activeMainFolder ? setIsAddingMainFolderModalOpen(true) : setIsAddingCategoryModalOpen(true); }} 
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-full shadow-sm hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md transition-all text-xs sm:text-sm font-semibold mb-6 group"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" /> 
          Add New {!activeMainFolder ? 'Main Folder' : 'Sub Folder'}
        </button>
      </main>

      {/* Floating Quick Add Button */}
      <button
        onClick={() => setIsQuickAddModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-indigo-600 text-white p-4 sm:px-6 sm:py-4 rounded-full shadow-xl hover:bg-indigo-700 hover:scale-105 transition-all group flex items-center justify-center gap-2"
        title="Quick Add Project"
      >
        <Zap className="w-6 h-6 group-hover:animate-pulse" />
        <span className="font-bold text-sm hidden sm:block pr-1">Quick Add</span>
      </button>

      {/* Global Modals & Dialogs */}
      {isQuickAddModalOpen && (
        <QuickAddModal 
          onClose={() => setIsQuickAddModalOpen(false)}
          onSave={handleAddProject}
          mainFolders={displayMainFolders}
          allSubFolders={allSubFolders}
        />
      )}
      
      {wuDayFolder && (
        <WuDayModal folder={wuDayFolder} onClose={() => setWuDayFolder(null)} onSave={handleSaveWuDay} />
      )}
      
      {linkProjectData && (
        <LinkProjectModal
          project={linkProjectData}
          onClose={() => setLinkProjectData(null)}
          onSave={async (projectId, newBodyIds) => {
            setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, localBodyIds: newBodyIds } : p));
            if (user && !authError) {
              try { await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', projectId), { localBodyIds: newBodyIds }); } catch (e) {}
            }
            setLinkProjectData(null);
          }}
          mainFolders={displayMainFolders}
          allSubFolders={allSubFolders}
        />
      )}

      {(isAddingMainFolderModalOpen || isAddingCategoryModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => {setIsAddingMainFolderModalOpen(false); setIsAddingCategoryModalOpen(false);}} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              {isAddingMainFolderModalOpen ? <FolderTree className="w-5 h-5 text-indigo-600"/> : <Folder className="w-5 h-5 text-indigo-600"/>} 
              Create {isAddingMainFolderModalOpen ? 'Main Folder' : 'Sub Folder'}
            </h3>
            <form onSubmit={isAddingMainFolderModalOpen ? handleCreateMainFolder : handleCreateSubFolder}>
              <input type="text" autoFocus placeholder="Enter name..." value={newNameInput} onChange={(e) => setNewNameInput(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 text-sm font-medium" />
              <button type="submit" disabled={!newNameInput.trim()} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
                Create
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STRICTLY CENTERED ACTION MENU */}
      {actionMenu && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setActionMenu(null)}>
          <div className="bg-white w-full max-w-xs sm:max-w-sm rounded-2xl p-2 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
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

      {/* Move To Dialog */}
      {moveToDialog && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setMoveToDialog(null)}>
          <div className="bg-white max-w-sm w-full rounded-2xl p-4 sm:p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><MoveRight className="w-5 h-5 text-indigo-600"/> Move To...</h3>
               <button onClick={() => setMoveToDialog(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500"><X className="w-5 h-5"/></button>
             </div>
             <p className="text-sm text-slate-600 mb-4">Select a destination for <strong>{moveToDialog.name}</strong>:</p>
             <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
               {displayMainFolders.map(mf => (
                 <button 
                   key={mf.id} 
                   disabled={mf.id === moveToDialog.mainFolderId}
                   onClick={() => executeMoveSubFolder(moveToDialog.id, mf.id)}
                   className="w-full flex items-center gap-3 p-3 text-left rounded-xl border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-100 transition-colors"
                 >
                   <div className={`p-1.5 rounded-lg bg-gradient-to-br ${mf.color} text-white`}><mf.icon className="w-4 h-4"/></div>
                   <span className="font-semibold text-sm text-slate-700">{mf.name}</span>
                   {mf.id === moveToDialog.mainFolderId && <span className="ml-auto text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Current</span>}
                 </button>
               ))}
             </div>
          </div>
        </div>
      )}

      {/* Updated robust Dialogs */}
      {promptDialog && <PromptDialog dialog={promptDialog} onClose={() => setPromptDialog(null)} />}
      {typeToDeleteDialog && <TypeToDeleteDialog dialog={typeToDeleteDialog} onClose={() => setTypeToDeleteDialog(null)} />}

      {/* Project Modal (When Sub-folder is opened) */}
      {activeSubFolder && (
        <ProjectModal 
          body={activeSubFolder} 
          allSubFolders={allSubFolders}
          onClose={() => setActiveSubFolder(null)}
          projects={allProjects.filter(p => p.localBodyIds && p.localBodyIds.includes(activeSubFolder.id))}
          onAddProject={(name) => handleAddProject([activeSubFolder.id], name)}
          user={user} authError={authError} db={db}
          localUpdates={localUpdates} setLocalUpdates={setLocalUpdates} setAllProjects={setAllProjects}
          setActionMenu={setActionMenu} setConfirmDialog={setTypeToDeleteDialog} setPromptDialog={setPromptDialog}
          setLinkProjectData={setLinkProjectData}
        />
      )}
    </div>
  );
}

// --- QUICK ADD MODAL (Grouped by Main Folders) ---
function QuickAddModal({ onClose, onSave, mainFolders, allSubFolders }) {
  const [projectName, setProjectName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleBox = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSave = (e) => {
    e.preventDefault();
    if (!projectName.trim() || selectedIds.length === 0) return;
    onSave(selectedIds, projectName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><Zap className="w-5 h-5 text-indigo-600"/> Quick Add Project</h3>
        <p className="text-xs text-slate-500 mb-4">Create a project mapped to multiple sub-folders.</p>
        
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <input
            type="text" autoFocus placeholder="Enter project name..." value={projectName} onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 text-sm font-medium shrink-0"
          />
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl p-3 mb-4 bg-slate-50 space-y-4">
            {mainFolders.map(mf => {
              const subs = allSubFolders.filter(sf => sf.mainFolderId === mf.id);
              if (subs.length === 0) return null;
              return (
                <div key={mf.id} className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><mf.icon className="w-3.5 h-3.5"/> {mf.name}</h4>
                  {subs.map(body => {
                    const IconComponent = body.icon || Folder;
                    return (
                      <div key={body.id} onClick={() => toggleBox(body.id)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-colors">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedIds.includes(body.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                          {selectedIds.includes(body.id) && <CheckSquare className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex items-center gap-2 flex-1"><IconComponent className="w-4 h-4 text-slate-500" /><span className="text-sm font-semibold text-slate-700">{body.name}</span></div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <button type="submit" disabled={!projectName.trim() || selectedIds.length === 0} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow-sm shrink-0">
            Create in {selectedIds.length} location{selectedIds.length !== 1 ? 's' : ''}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- PROJECT MODAL & ACCORDION (Preserved full logic) ---
function ProjectModal({ body, allSubFolders, onClose, projects, onAddProject, user, authError, db, localUpdates, setLocalUpdates, setAllProjects, setActionMenu, setConfirmDialog, setPromptDialog, setLinkProjectData }) {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [allUpdates, setAllUpdates] = useState([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!user || authError) { setAllUpdates(localUpdates); return; }
    setIsLoadingUpdates(true);
    const updatesRef = collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates');
    const unsubscribe = onSnapshot(updatesRef, (snapshot) => {
      const data = []; snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setAllUpdates(data); setIsLoadingUpdates(false);
    }, (e) => { console.error(e); setIsLoadingUpdates(false); });
    return () => unsubscribe();
  }, [user, authError, localUpdates]);

  const handleCreateProject = (e) => {
    e.preventDefault(); if (!newProjectName.trim()) return;
    onAddProject(newProjectName); setNewProjectName(''); setIsAddingProject(false);
  };

  const IconComponent = body.icon || Folder;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`p-4 sm:p-6 bg-gradient-to-r ${body.color} text-white flex justify-between items-center shrink-0`}>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3"><IconComponent className="w-6 h-6 sm:w-7 sm:h-7 opacity-80" />{body.name}</h2>
            <p className="mt-1 text-white/80 font-medium text-xs sm:text-sm">Manage projects for this sub-folder.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setIsAddingProject(!isAddingProject)} className="p-2 sm:p-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-full transition-transform hover:scale-105 shadow-md">
              <Plus className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${isAddingProject ? 'rotate-45' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 sm:p-2.5 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-sm"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          {isAddingProject && (
            <div className="mb-5 sm:mb-6 animate-in slide-in-from-top-2">
              <form onSubmit={handleCreateProject} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
                <input type="text" autoFocus placeholder="Enter project name..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                <button type="submit" disabled={!newProjectName.trim()} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm">Create</button>
              </form>
            </div>
          )}
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-12 text-slate-400"><FileText className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-base">No projects added yet.</p></div>
            ) : (
              <>
                {projects.filter(p => !p.isFinished).map((project, index) => (
                  <ProjectAccordion 
                    key={project.id} project={project} theme={body.theme} index={index} user={user} authError={authError} db={db}
                    allSubFolders={allSubFolders}
                    allUpdates={allUpdates.filter(u => u.projectId === project.id)} localUpdates={localUpdates.filter(u => u.projectId === project.id)}
                    isLoadingUpdates={isLoadingUpdates} setLocalUpdates={setLocalUpdates} setAllProjects={setAllProjects}
                    setActionMenu={setActionMenu} setConfirmDialog={setConfirmDialog} setPromptDialog={setPromptDialog}
                    setLinkProjectData={setLinkProjectData}
                  />
                ))}
                
                {projects.some(p => p.isFinished) && (
                  <div className="pt-6 pb-2">
                    <div className="flex items-center gap-4">
                      <div className="h-px bg-slate-300 flex-1"></div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Projects</span>
                      <div className="h-px bg-slate-300 flex-1"></div>
                    </div>
                  </div>
                )}
                
                {projects.filter(p => p.isFinished).map((project, index) => (
                  <ProjectAccordion 
                    key={project.id} project={project} theme={body.theme} index={index} user={user} authError={authError} db={db}
                    allSubFolders={allSubFolders}
                    allUpdates={allUpdates.filter(u => u.projectId === project.id)} localUpdates={localUpdates.filter(u => u.projectId === project.id)}
                    isLoadingUpdates={isLoadingUpdates} setLocalUpdates={setLocalUpdates} setAllProjects={setAllProjects}
                    setActionMenu={setActionMenu} setConfirmDialog={setConfirmDialog} setPromptDialog={setPromptDialog}
                    setLinkProjectData={setLinkProjectData}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectAccordion({ project, theme, index, user, authError, db, allSubFolders, allUpdates, localUpdates, isLoadingUpdates, setLocalUpdates, setAllProjects, setActionMenu, setConfirmDialog, setPromptDialog, setLinkProjectData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [editUpdateText, setEditUpdateText] = useState('');
  const [editAttachments, setEditAttachments] = useState([]);
  const [isEditUploading, setIsEditUploading] = useState(false);
  const editFileInputRef = useRef(null);

  const fileInputRef = useRef(null);
  const isSavingRef = useRef(false);

  const isSameWeek = (dateString) => {
    if (!dateString) return false;
    const now = new Date();
    const d = new Date(dateString);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);
    return d >= startOfWeek && d <= endOfWeek;
  };

  const currentDay = new Date().getDay();
  const folderHasTodayWuDay = project.localBodyIds && project.localBodyIds.some(fid => {
    const folder = allSubFolders?.find(sf => sf.id === fid);
    return folder && folder.wuDay === currentDay;
  });
  const needsWeeklyUpdate = !project.isFinished && folderHasTodayWuDay && !isSameWeek(project.lastWeeklyUpdate);

  const themeStyles = THEME_MAP[theme] || THEME_MAP.indigo;
  const cardColorClass = project.isFinished ? "bg-emerald-50 border-emerald-200" : (needsWeeklyUpdate ? "bg-red-50 border-red-200 shadow-md border-2" : (index % 2 === 0 ? themeStyles.light : themeStyles.dark));

  const toggleAccordion = () => setIsOpen(!isOpen);

  const processFiles = async (filesArray) => {
    let newFiles = []; let errorDetected = null;
    for (const file of filesArray) {
      try {
        if (file.type === 'application/pdf') {
          if (file.size > 2097152) { errorDetected = `PDF too large: ${file.name}`; continue; }
          const b64 = await fileToBase64(file); newFiles.push({ type: 'pdf', data: b64, name: file.name, isExisting: false });
        } else if (file.type.startsWith('image/')) {
          const b64 = await compressImage(file); newFiles.push({ type: 'image', data: b64, name: file.name, isExisting: false });
        } else { errorDetected = `Unsupported: ${file.name}`; }
      } catch (e) { console.error(e); }
    }
    return { newFiles, errorDetected };
  };

  const handleFileChange = async (e) => {
    setUploadError(null);
    const { newFiles, errorDetected } = await processFiles(Array.from(e.target.files));
    if (errorDetected) setUploadError(errorDetected);
    setAttachments(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault(); if ((!updateText.trim() && attachments.length === 0) || isSavingRef.current) return;
    isSavingRef.current = true; setIsUploading(true); setUploadError(null);
    const updateId = `upd_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
    try {
      let finalAttachments = [];
      if (user && !authError) {
        if (attachments.length > 0) {
          finalAttachments = await Promise.all(attachments.map(att => 
            uploadToCloudinary(att.data).then(url => ({ type: att.type, url, name: att.name }))
            .catch(() => ({ type: att.type, url: att.data, name: att.name }))
          ));
        }
        const newUpdate = { id: updateId, projectId: project.id, text: updateText, attachments: finalAttachments, timestamp: new Date().toISOString(), isWeeklyUpdate: needsWeeklyUpdate };
        const projectUpdate = { updateCount: (project.updateCount || 0) + 1 };
        if (needsWeeklyUpdate) projectUpdate.lastWeeklyUpdate = new Date().toISOString();
        await Promise.all([
          setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', updateId), newUpdate),
          updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id), projectUpdate)
        ]);
      } else throw new Error("Fallback local");
    } catch (err) {
      const newUpdate = { id: updateId, projectId: project.id, text: updateText, attachments: attachments.map(att => ({ type: att.type, url: att.data, name: att.name })), timestamp: new Date().toISOString(), isWeeklyUpdate: needsWeeklyUpdate };
      setLocalUpdates(prev => [newUpdate, ...prev]);
      setAllProjects(prev => prev.map(p => {
        if (p.id === project.id) {
          const proj = { ...p, updateCount: (p.updateCount || 0) + 1 };
          if (needsWeeklyUpdate) proj.lastWeeklyUpdate = new Date().toISOString();
          return proj;
        }
        return p;
      }));
    } finally {
      setUpdateText(''); setAttachments([]); isSavingRef.current = false; setIsUploading(false);
    }
  };

  const startEditing = (update) => {
    setEditingUpdateId(update.id); setEditUpdateText(update.text || '');
    let existingAtts = [];
    if (update.images) existingAtts = [...existingAtts, ...update.images.map(url => ({ type: 'image', url: url, isExisting: true }))];
    if (update.attachments) existingAtts = [...existingAtts, ...update.attachments.map(att => ({ ...att, isExisting: true }))];
    setEditAttachments(existingAtts);
  };
  const cancelEditing = () => { setEditingUpdateId(null); setEditUpdateText(''); setEditAttachments([]); };

  const handleEditFileChange = async (e) => {
    const { newFiles } = await processFiles(Array.from(e.target.files));
    setEditAttachments(prev => [...prev, ...newFiles]);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const submitEdit = async (e) => {
    e.preventDefault(); if ((!editUpdateText.trim() && editAttachments.length === 0) || isEditUploading) return;
    setIsEditUploading(true);
    try {
      let finalAttachments = [];
      if (user && !authError) {
        finalAttachments = await Promise.all(editAttachments.map(att => {
          if (att.isExisting) return Promise.resolve({ type: att.type, url: att.url, name: att.name });
          return uploadToCloudinary(att.data).then(url => ({ type: att.type, url, name: att.name })).catch(() => ({ type: att.type, url: att.data, name: att.name }));
        }));
        await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', editingUpdateId), { text: editUpdateText, attachments: finalAttachments, images: [] });
      } else {
        finalAttachments = editAttachments.map(att => att.isExisting ? att : { type: att.type, url: att.data, name: att.name });
        setLocalUpdates(prev => prev.map(u => u.id === editingUpdateId ? { ...u, text: editUpdateText, attachments: finalAttachments, images: [] } : u));
      }
    } catch (e) { console.error(e); } finally { setIsEditUploading(false); setEditingUpdateId(null); }
  };

  const handleProjectActions = () => {
    setActionMenu({ title: "Project Options", options: [
      { label: project.isFinished ? "Mark as Active" : "Mark as Finished", icon: <CheckCircle2 className="w-4 h-4"/>, onClick: async () => {
        const newStatus = !project.isFinished;
        setAllProjects(prev => prev.map(p => p.id === project.id ? { ...p, isFinished: newStatus } : p));
        if (user && !authError) { try { await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id), { isFinished: newStatus }); } catch (e){} }
      }},
      { label: "Make a Copy (Link)", icon: <Copy className="w-4 h-4"/>, onClick: () => setLinkProjectData(project) },
      { label: "Edit Name", icon: <Edit3 className="w-4 h-4"/>, onClick: () => setPromptDialog({ title: "Edit Project Name", defaultValue: project.name, onConfirm: async (n) => {
        setAllProjects(prev => prev.map(p => p.id === project.id ? { ...p, name: n } : p));
        if (user && !authError) { try { await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id), { name: n }); } catch (e){} }
      }})},
      { label: "Delete Project", icon: <Trash2 className="w-4 h-4"/>, danger: true, onClick: () => setConfirmDialog({ title: "Delete Project", message: "Type 'delete' below to confirm project deletion.", onConfirm: async () => {
        setAllProjects(prev => prev.filter(p => p.id !== project.id));
        if (user && !authError) { try { await deleteDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id)); } catch (e){} }
      }})}
    ]});
  };

  const handleDeleteUpdate = (update) => {
    setConfirmDialog({ title: "Delete Update", message: "Type 'delete' to confirm deletion of this update timeline event.", onConfirm: async () => {
      setLocalUpdates(prev => prev.filter(u => u.id !== update.id));
      setAllProjects(prev => prev.map(p => p.id === project.id ? { ...p, updateCount: Math.max(0, (p.updateCount || 0) - 1) } : p));
      if (user && !authError) {
        try {
          await deleteDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', update.id));
          await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id), { updateCount: Math.max(0, (project.updateCount || 0) - 1) });
        } catch (e) {}
      }
    }});
  };

  const formatDate = (ds) => new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (ds) => new Date(ds).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const combinedUpdates = [...allUpdates];
  localUpdates.forEach(lu => { if (!combinedUpdates.some(u => u.id === lu.id)) combinedUpdates.push(lu); });
  const sortedUpdates = combinedUpdates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${cardColorClass}`}>
      <LongPressable 
        as="button" onLongPress={handleProjectActions} onClick={toggleAccordion} delay={2000}
        className="w-full px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between bg-transparent hover:bg-black/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/60 shadow-sm hidden sm:block"><FileText className={`w-5 h-5 ${project.isFinished ? 'text-emerald-700' : themeStyles.text}`} /></div>
          <div>
            <h3 className={`text-sm sm:text-base font-bold ${project.isFinished ? 'text-emerald-900' : themeStyles.text}`}>
              {project.name} {project.isFinished && <CheckCircle2 className="inline-block w-4 h-4 ml-1 text-emerald-600" />}
            </h3>
            <p className="text-[10px] sm:text-xs opacity-70 font-medium mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(project.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {needsWeeklyUpdate && (
            <button 
               onClick={(e) => { e.stopPropagation(); setIsOpen(true); setTimeout(() => fileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }} 
               className="text-[10px] sm:text-xs bg-red-600 text-white font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-red-700 shadow-sm animate-pulse"
            >
               Add Update
            </button>
          )}
          <span className="text-[10px] font-semibold bg-white/70 px-2 py-1 rounded-full">{project.updateCount || 0} Updates</span>
          <div className={`p-1 rounded-full bg-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`}><ChevronDown className="w-4 h-4" /></div>
        </div>
      </LongPressable>

      {isOpen && (
        <div className="border-t border-black/5 bg-white/60 p-3 sm:p-5">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm mb-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Add Update</h4>
            {uploadError && <div className="mb-2 px-3 py-2 bg-red-50 text-red-700 text-xs rounded flex gap-2"><AlertTriangle className="w-4 h-4"/><span>{uploadError}</span></div>}
            <form onSubmit={handleSaveUpdate}>
              <textarea className="w-full bg-slate-50 border border-slate-200 rounded p-3 min-h-[80px] text-sm focus:ring-2 focus:ring-indigo-500" placeholder="What's the latest?" value={updateText} onChange={(e) => setUpdateText(e.target.value)} disabled={isUploading}/>
              {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((f, i) => (
                    <div key={i} className="relative inline-block rounded overflow-hidden border">
                      {f.type === 'pdf' ? <div className="h-10 w-10 bg-slate-100 flex items-center justify-center"><FileText className="w-5 text-red-500"/></div> : <img src={f.data} alt="preview" className="h-10 w-10 object-cover"/>}
                      <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-black/60 text-white p-0.5 rounded-bl hover:bg-red-500"><X className="w-3 h-3"/></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex justify-between gap-2">
                <div>
                  <input type="file" accept="image/*,application/pdf" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} disabled={isUploading}/>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded"><Paperclip className="w-3.5 h-3.5"/> Attach</button>
                </div>
                <button type="submit" disabled={(!updateText.trim() && attachments.length === 0) || isUploading} className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-bold disabled:opacity-50">{isUploading ? 'Uploading...' : 'Save'}</button>
              </div>
            </form>
          </div>

          <div className="relative border-l-2 border-slate-300 ml-2 space-y-4 pb-2">
            {sortedUpdates.map(update => (
              <div key={update.id} className="relative pl-5">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 z-10"/>
                {editingUpdateId === update.id ? (
                  <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                     <form onSubmit={submitEdit}>
                       <textarea className="w-full bg-white border rounded p-2 text-sm focus:ring-2" value={editUpdateText} onChange={(e) => setEditUpdateText(e.target.value)} disabled={isEditUploading}/>
                       <div className="mt-2 flex justify-end gap-2">
                         <button type="button" onClick={cancelEditing} className="text-xs px-2">Cancel</button>
                         <button type="submit" className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs">{isEditUploading ? 'Saving...' : 'Save Changes'}</button>
                       </div>
                     </form>
                  </div>
                ) : (
                  <LongPressable delay={2000} onLongPress={() => setActionMenu({ title: "Update Options", options: [{ label: "Edit", icon: <Edit3 className="w-4 h-4"/>, onClick: () => startEditing(update) }, { label: "Delete", icon: <Trash2 className="w-4 h-4"/>, danger: true, onClick: () => handleDeleteUpdate(update) }]})} className={`bg-white p-3 rounded-xl shadow-sm border ${update.isWeeklyUpdate ? 'border-red-400 bg-red-50/30' : 'border-slate-100'} hover:bg-slate-50 cursor-pointer`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${update.isWeeklyUpdate ? 'bg-red-100 text-red-700' : 'text-indigo-600 bg-indigo-50'}`}>{update.isWeeklyUpdate ? 'Weekly Update' : 'Published'}</span>
                      <span className={`text-xs font-bold ${update.isWeeklyUpdate ? 'text-red-600' : 'text-slate-600'}`}>{formatDate(update.timestamp)}</span>
                    </div>
                    {update.text && <div className="text-sm text-slate-700 whitespace-pre-wrap">{update.text}</div>}
                    <div className="mt-2 flex gap-2">
                      {update.attachments?.map((att, i) => att.type === 'pdf' ? (
                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2 py-1 rounded"><FileText className="w-3 h-3"/> {att.name || 'PDF'}</a>
                      ) : (
                        <img key={i} src={att.url} alt="img" className="w-10 h-10 object-cover rounded cursor-pointer" onClick={(e) => { e.stopPropagation(); setExpandedImage(att.url); }}/>
                      ))}
                    </div>
                  </LongPressable>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {expandedImage && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/90" onClick={() => setExpandedImage(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-6 h-6"/></button>
          <img src={expandedImage} alt="Expanded" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()}/>
        </div>
      )}
    </div>
  );
}

// --- LINK PROJECT MODAL ---
function LinkProjectModal({ project, onClose, onSave, mainFolders, allSubFolders }) {
  const [selectedIds, setSelectedIds] = useState(project.localBodyIds || []);

  const toggleBox = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleSave = (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert("Project must be linked to at least one folder.");
      return;
    }
    onSave(project.id, selectedIds);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><Copy className="w-5 h-5 text-indigo-600"/> Link to Folders</h3>
        <p className="text-xs text-slate-500 mb-4">Select the folders where you want this project to appear. Updates are shared across all linked folders.</p>
        
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
            <span className="text-sm font-bold text-indigo-900">{project.name}</span>
          </div>
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl p-3 mb-4 bg-slate-50 space-y-4">
            {mainFolders.map(mf => {
              const subs = allSubFolders.filter(sf => sf.mainFolderId === mf.id);
              if (subs.length === 0) return null;
              return (
                <div key={mf.id} className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><mf.icon className="w-3.5 h-3.5"/> {mf.name}</h4>
                  {subs.map(body => {
                    const IconComponent = body.icon || Folder;
                    return (
                      <div key={body.id} onClick={() => toggleBox(body.id)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-colors">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedIds.includes(body.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                          {selectedIds.includes(body.id) && <CheckSquare className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex items-center gap-2 flex-1"><IconComponent className="w-4 h-4 text-slate-500" /><span className="text-sm font-semibold text-slate-700">{body.name}</span></div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <button type="submit" disabled={selectedIds.length === 0} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors shadow-sm shrink-0">
            Save Links ({selectedIds.length} location{selectedIds.length !== 1 ? 's' : ''})
          </button>
        </form>
      </div>
    </div>
  );
}

// --- WU DAY MODAL ---
function WuDayModal({ folder, onClose, onSave }) {
  const days = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: null, label: 'No Day' }
  ];
  const [selectedDay, setSelectedDay] = useState(folder.wuDay ?? null);

  const handleSave = (e) => {
    e.preventDefault();
    onSave(folder, selectedDay);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-600"/> Weekly Update Day</h3>
        <p className="text-xs text-slate-500 mb-4">Select the day when projects in <strong>{folder.name}</strong> require an update.</p>
        
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-4 space-y-2">
            {days.map(day => (
              <label key={day.label} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDay === day.value ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-100'}`}>
                <input type="radio" name="wuday" value={day.value} checked={selectedDay === day.value} onChange={() => setSelectedDay(day.value)} className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                <span className="text-sm font-semibold text-slate-700">{day.label}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm shrink-0">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
